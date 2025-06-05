<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Folder;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FolderController extends Controller
{
    public function index(): JsonResponse
    {
        $hierarchy = Folder::getHierarchy();
        return response()->json($hierarchy);
    }

    public function show(Request $request): JsonResponse
    {
        $path = $request->query('path');
        
        if (!$path) {
            return response()->json(['error' => 'Path is required'], 400);
        }

        $folder = Folder::byPath($path)->with(['children', 'activeDocuments'])->first();
        
        if (!$folder) {
            return response()->json(['error' => 'Folder not found'], 404);
        }

        $contents = array_merge(
            $folder->children->map(function ($child) {
                return [
                    'id' => $child->id,
                    'name' => $child->name,
                    'full_path' => $child->full_path,
                    'type' => 'folder',
                    'level' => $child->level,
                    'is_user_created' => $child->is_user_created
                ];
            })->toArray(),
            $folder->activeDocuments->map(function ($doc) {
                return [
                    'id' => $doc->id,
                    'name' => $doc->name,
                    'full_path' => $doc->full_path,
                    'type' => 'file',
                    'size' => $doc->formatted_size,
                    'lastModified' => $doc->updated_at->format('Y-m-d'),
                    'version' => $doc->version,
                    'status' => $doc->status
                ];
            })->toArray()
        );

        return response()->json([
            'folder' => [
                'id' => $folder->id,
                'name' => $folder->name,
                'full_path' => $folder->full_path,
                'level' => $folder->level,
                'can_upload_files' => $folder->canUploadFiles(),
                'is_protected' => $folder->isProtected()
            ],
            'contents' => $contents
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'parent_path' => 'required|string'
        ]);

        $parentFolder = Folder::byPath($request->parent_path)->first();
        
        if (!$parentFolder) {
            return response()->json(['error' => 'Parent folder not found'], 404);
        }

        $fullPath = $parentFolder->full_path . '/' . $request->name;
        
        // Check if folder already exists
        if (Folder::byPath($fullPath)->exists()) {
            return response()->json(['error' => 'Folder already exists'], 409);
        }

        $folder = Folder::create([
            'name' => $request->name,
            'full_path' => $fullPath,
            'parent_id' => $parentFolder->id,
            'level' => $parentFolder->level + 1,
            'type' => $this->getFolderType($parentFolder->level + 1),
            'is_user_created' => true
        ]);

        // Create sub-structure based on level
        $this->createSubStructure($folder);

        return response()->json($folder, 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $path = $request->query('path');
        $folder = Folder::byPath($path)->first();
        
        if (!$folder) {
            return response()->json(['error' => 'Folder not found'], 404);
        }

        if ($folder->isProtected()) {
            return response()->json(['error' => 'Cannot delete protected folder'], 403);
        }

        $folder->delete();
        
        return response()->json(['message' => 'Folder deleted successfully']);
    }

    private function getFolderType(int $level): string
    {
        return match($level) {
            1 => 'root',
            2 => 'category',
            3 => 'process',
            4 => 'document_type',
            5 => 'confidentiality',
            default => 'custom'
        };
    }

    private function createSubStructure(Folder $folder): void
    {
        $docTypes = ['Procédure', 'Charte', 'Guide', 'Politique', 'Enregistrement'];
        $confidentialityLevels = ['Interne', 'Public', 'Restreint', 'Confidentiel', 'Strictement Confidentiel'];

        switch ($folder->level) {
            case 2: // Category level - create doc types and confidentiality levels
                foreach ($docTypes as $docType) {
                    $docTypeFolder = Folder::create([
                        'name' => $docType,
                        'full_path' => $folder->full_path . '/' . $docType,
                        'parent_id' => $folder->id,
                        'level' => 4,
                        'type' => 'document_type'
                    ]);

                    foreach ($confidentialityLevels as $level) {
                        Folder::create([
                            'name' => $level,
                            'full_path' => $docTypeFolder->full_path . '/' . $level,
                            'parent_id' => $docTypeFolder->id,
                            'level' => 5,
                            'type' => 'confidentiality'
                        ]);
                    }
                }
                break;

            case 3: // Process level - create confidentiality levels
                foreach ($confidentialityLevels as $level) {
                    Folder::create([
                        'name' => $level,
                        'full_path' => $folder->full_path . '/' . $level,
                        'parent_id' => $folder->id,
                        'level' => 4,
                        'type' => 'confidentiality'
                    ]);
                }
                break;
        }
    }
}