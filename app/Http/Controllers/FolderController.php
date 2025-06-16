<?php

namespace App\Http\Controllers;

use App\Models\Folder;
use App\Models\FolderConfiguration;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FolderController extends Controller
{
    /**
     * Get folder configurations
     */
    public function configurations(): JsonResponse
    {
        return response()->json([
            'rootCategories' => FolderConfiguration::getRootCategories(),
            'documentTypes' => FolderConfiguration::getDocumentTypes(),
            'confidentialityLevels' => FolderConfiguration::getConfidentialityLevels()
        ]);
    }

    /**
     * Get folder hierarchy for sidebar
     */
    public function hierarchy(): JsonResponse
    {
        $hierarchy = Folder::getHierarchy();
        return response()->json($hierarchy);
    }

    /**
     * Get contents of one folder
     */
    public function contents(Request $request): JsonResponse
    {
        $request->validate(['path' => 'required|string']);

        $folder = Folder::byPath($request->path)
            ->with(['children', 'documents'])
            ->firstOrFail();

        $nodes = [];

        foreach ($folder->children as $c) {
            $nodes[] = [
                'type' => 'folder',
                'id' => $c->id,
                'name' => $c->name,
                'full_path' => $c->full_path,
                'level' => $c->level,
                'folder_type' => $c->type,
                'is_protected' => $c->isProtected(),
                'is_user_created' => $c->is_user_created,
            ];
        }

        foreach ($folder->documents as $d) {
            $nodes[] = [
                'type' => 'file',
                'id' => $d->id,
                'name' => $d->name,
                'full_path' => $d->full_path,
                'size' => number_format($d->size/1024/1024, 1) . ' MB',
                'lastModified' => $d->updated_at->format('Y-m-d'),
                'folder_path' => $folder->full_path,
                'mime_type' => $d->mime_type
            ];
        }

        return response()->json(['nodes' => $nodes]);
    }

    /**
     * Create a new folder
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'name' => 'required|string|max:255',
                'parent_path' => 'required|string'
            ]);

            $parent = Folder::byPath($data['parent_path'])->firstOrFail();
            
            // Check if folder with same name already exists
            if (Folder::where('parent_id', $parent->id)
                     ->where('name', $data['name'])
                     ->exists()) {
                return response()->json([
                    'error' => 'Un dossier avec ce nom existe déjà'
                ], 409);
            }

            $fullPath = $parent->full_path . '/' . $data['name'];
            
            DB::beginTransaction();
            
            try {
                $folder = Folder::create([
                    'name' => $data['name'],
                    'full_path' => $fullPath,
                    'parent_id' => $parent->id,
                    'level' => $parent->level + 1,
                    'type' => 'custom',
                    'is_user_created' => true,
                    'is_protected' => false // Explicitly set as not protected
                ]);

                DB::commit();

                // Return the folder in the same format as hierarchy
                return response()->json([
                    'type' => 'folder',
                    'id' => $folder->id,
                    'name' => $folder->name,
                    'full_path' => $folder->full_path,
                    'level' => $folder->level,
                    'folder_type' => $folder->type,
                    'is_protected' => $folder->isProtected(),
                    'is_user_created' => $folder->is_user_created,
                    'nodes' => []
                ], 201);
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Error creating folder in transaction: ' . $e->getMessage());
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Error creating folder: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la création du dossier: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a folder
     */
    public function destroy(string $path): JsonResponse
    {
        try {
            $decodedPath = urldecode($path);
            Log::info('Attempting to delete folder: ' . $decodedPath);
            
            $folder = Folder::byPath($decodedPath)->firstOrFail();
            
            // Use the model's isProtected method for consistency
            if ($folder->isProtected()) {
                Log::warning('Attempt to delete protected folder: ' . $decodedPath . ' (Level: ' . $folder->level . ', User Created: ' . ($folder->is_user_created ? 'Yes' : 'No') . ')');
                return response()->json([
                    'error' => 'Ce dossier ne peut pas être supprimé car il est protégé'
                ], 403);
            }

            DB::beginTransaction();
            
            try {
                // Delete all documents in the folder first
                $folder->documents()->delete();
                
                // Then delete the folder and its children (handled by the model's boot method)
                $folder->delete();
                
                DB::commit();
                Log::info('Successfully deleted folder: ' . $decodedPath);
                return response()->json(['message' => 'Dossier supprimé avec succès']);
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Error deleting folder in transaction: ' . $e->getMessage());
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Error in destroy method: ' . $e->getMessage());
            return response()->json([
                'error' => 'Erreur lors de la suppression du dossier: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get folder type based on level
     */
    private function getFolderType(int $level): string
    {
        return match ($level) {
            1 => 'root',
            2 => 'category',
            3 => 'process',
            4 => 'document_type',
            5 => 'confidentiality',
            default => 'custom',
        };
    }

    /**
     * Create sub-structure for new folders
     */
    private function createSubStructure(Folder $folder): void
    {
        $docTypes = [
            'Procédure',
            'Charte',
            'Guide',
            'Politique',
            'Enregistrement'
        ];

        $conf = [
            'Interne',
            'Public',
            'Restreint',
            'Confidentiel',
            'Strictement Confidentiel'
        ];

        switch ($folder->level) {
            case 2: // category
                foreach ($docTypes as $dt) {
                    $f2 = Folder::create([
                        'name' => $dt,
                        'full_path' => $folder->full_path . '/' . $dt,
                        'parent_id' => $folder->id,
                        'level' => 3,
                        'type' => 'process'
                    ]);

                    foreach ($conf as $c) {
                        Folder::create([
                            'name' => $c,
                            'full_path' => $f2->full_path . '/' . $c,
                            'parent_id' => $f2->id,
                            'level' => 4,
                            'type' => 'document_type'
                        ]);
                    }
                }
                break;

            case 3: // process
                foreach ($conf as $c) {
                    Folder::create([
                        'name' => $c,
                        'full_path' => $folder->full_path . '/' . $c,
                        'parent_id' => $folder->id,
                        'level' => 4,
                        'type' => 'document_type'
                    ]);
                }
                break;
        }
    }
}