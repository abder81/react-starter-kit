<?php

namespace App\Http\Controllers;

use App\Models\Folder;
use App\Models\FolderConfiguration;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth; // Import Auth facade

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
        $isAdmin = Auth::check() && Auth::user()->is_admin;
        $hierarchy = Folder::getHierarchy(null, $isAdmin);
        return response()->json($hierarchy);
    }

    /**
     * Get contents of one folder
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function contents(Request $request): JsonResponse
    {
        $request->validate(['path' => 'required|string']);
        $isAdmin = Auth::check() && Auth::user()->is_admin;

        // Use the new getFilteredContents method
        $nodes = Folder::getFilteredContents($request->path, $isAdmin);

        // If the nodes array is empty and the user is not an admin, it implies
        // they tried to access a restricted folder. You can return a 403.
        if (empty($nodes) && !$isAdmin) {
             $folder = Folder::byPath($request->path)->first();
             if ($folder && !in_array($folder->type, ['root', 'category', 'process', 'document_type', 'confidentiality'])) {
                 return response()->json(['error' => 'Accès refusé à ce dossier.'], 403);
             }
             // If folder is not found or it's allowed type but no children, still return 200 with empty nodes
        }


        return response()->json(['nodes' => $nodes]);
    }

    /**
     * Create a new folder.
     * Only admins can create folders.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        if (!Auth::check() || !Auth::user()->is_admin) {
            return response()->json(['error' => 'Unauthorized. Only admins can create folders.'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'parent_path' => 'nullable|string',
            'is_protected' => 'boolean',
        ]);

        $parentFolder = null;
        $level = 1; // Default level for root folders

        if ($request->filled('parent_path')) {
            $parentFolder = Folder::byPath($request->parent_path)->first();
            if (!$parentFolder) {
                return response()->json(['error' => 'Parent folder not found.'], 404);
            }
            
            // Check if the parent folder allows creating subfolders
            if ($parentFolder->isProtected() && !in_array($parentFolder->type, ['root', 'category'])) {
                return response()->json(['error' => 'Cannot create folders under protected folders.'], 403);
            }
            
            // Allow creating folders under user-created folders
            if ($parentFolder->is_user_created) {
                // Allow creation
            }
            // Allow creating folders under predefined folder types
            elseif (in_array($parentFolder->type, ['category', 'process', 'document_type', 'confidentiality'])) {
                // Allow creation
            }
            else {
                return response()->json(['error' => 'Cannot create folders under this type of folder.'], 403);
            }
            
            $level = $parentFolder->level + 1;
        }

        $fullPath = $request->filled('parent_path')
            ? $request->parent_path . '/' . $request->name
            : $request->name;

        // Check for duplicate folder name at the same level
        $existingFolder = Folder::where('full_path', $fullPath)->first();
        if ($existingFolder) {
            return response()->json(['error' => 'Un dossier avec ce nom existe déjà à cet emplacement.'], 409);
        }

        try {
            DB::beginTransaction();

            $folder = Folder::create([
                'name' => $request->name,
                'full_path' => $fullPath,
                'parent_id' => $parentFolder ? $parentFolder->id : null,
                'level' => $level,
                'type' => 'custom', // Custom type for user-created folders
                'is_user_created' => true,
                'is_protected' => $request->boolean('is_protected', false),
            ]);

            // If it's a custom folder, we don't auto-generate subfolders like for predefined types.

            DB::commit();

            // Return the newly created folder data in the same format as hierarchy
            $newNode = [
                'type' => 'folder',
                'id' => $folder->id,
                'name' => $folder->name,
                'full_path' => $folder->full_path,
                'level' => $folder->level,
                'folder_type' => $folder->type,
                'is_protected' => $folder->isProtected(),
                'is_user_created' => $folder->is_user_created,
                'nodes' => [] // Newly created folders have no children initially
            ];

            return response()->json($newNode, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating folder: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to create folder.', 'details' => $e->getMessage()], 500);
        }
    }

    /**
     * Rename a folder.
     * Only admins can rename folders.
     *
     * @param Request $request
     * @param int $id The ID of the folder to rename.
     * @return JsonResponse
     */
    public function rename(Request $request, int $id): JsonResponse
    {
        if (!Auth::check() || !Auth::user()->is_admin) {
            return response()->json(['error' => 'Unauthorized. Only admins can rename folders.'], 403);
        }

        $request->validate([
            'new_name' => 'required|string|max:255',
        ]);

        $folder = Folder::findOrFail($id);

        if ($folder->isProtected()) {
            return response()->json(['error' => 'Protected folders cannot be renamed.'], 403);
        }

        $oldFullPath = $folder->full_path;
        $newFullPath = dirname($oldFullPath) . '/' . $request->new_name;
        if (dirname($oldFullPath) === '.') { // Handle root level folders
            $newFullPath = $request->new_name;
        }

        // Check for duplicate name at the same level
        $existingFolder = Folder::where('full_path', $newFullPath)->first();
        if ($existingFolder && $existingFolder->id !== $folder->id) {
            return response()->json(['error' => 'Un dossier ou fichier avec ce nom existe déjà à cet emplacement.'], 409);
        }

        try {
            DB::beginTransaction();

            $folder->name = $request->new_name;
            $folder->full_path = $newFullPath;
            $folder->save();

            // Update full_path for all children folders and documents recursively
            $this->updateChildPaths($folder);

            DB::commit();

            return response()->json(['message' => 'Dossier renommé avec succès.', 'new_path' => $newFullPath]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error renaming folder: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to rename folder.', 'details' => $e->getMessage()], 500);
        }
    }

    /**
     * Helper function to recursively update child paths after parent rename.
     *
     * @param Folder $folder
     * @return void
     */
    private function updateChildPaths(Folder $folder): void
    {
        // Update children folders
        foreach ($folder->children as $childFolder) {
            $childFolder->full_path = $folder->full_path . '/' . $childFolder->name;
            $childFolder->save();
            $this->updateChildPaths($childFolder); // Recurse
        }

        // Update documents within this folder
        foreach ($folder->documents as $document) {
            $document->full_path = $folder->full_path . '/' . $document->name;
            $document->folder_path = $folder->full_path;
            $document->save();
        }
    }

    /**
     * Delete a folder.
     * Only admins can delete folders.
     *
     * @param string $path The path of the folder to delete.
     * @return JsonResponse
     */
    public function destroy(string $path): JsonResponse
    {
        if (!Auth::check() || !Auth::user()->is_admin) {
            return response()->json(['error' => 'Unauthorized. Only admins can delete folders.'], 403);
        }

        $folder = Folder::byPath($path)->first();
        if (!$folder) {
            return response()->json(['error' => 'Folder not found.'], 404);
        }

        if ($folder->isProtected() && in_array($folder->type, ['root', 'category'])) {
            return response()->json(['error' => 'Protected root and category folders cannot be deleted.'], 403);
        }

        try {
            DB::beginTransaction();
            $folder->delete(); // The boot method in Folder model handles recursive deletion of children and documents
            DB::commit();
            return response()->json(['message' => 'Dossier supprimé avec succès.']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting folder: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete folder.', 'details' => $e->getMessage()], 500);
        }
    }

    /**
     * Generate pre-defined subfolders when a category is created.
     * Used internally.
     *
     * @param Folder $folder
     * @return void
     */
    private function generateCategorySubfolders(Folder $folder): void
    {
        $docTypes = [
            'Procédures',
            'Instructions de travail',
            'Formulaires',
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
                        'type' => 'process' // This seems like it should be 'document_type' or similar based on name
                    ]);

                    foreach ($conf as $c) {
                        Folder::create([
                            'name' => $c,
                            'full_path' => $f2->full_path . '/' . $c,
                            'parent_id' => $f2->id,
                            'level' => 4,
                            'type' => 'document_type' // This seems like it should be 'confidentiality' or similar
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

    /**
     * Get all descendants (folders and documents) under a given folder path.
     * Used for non-admin DataTable to list all documents under a process.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function descendants(Request $request): JsonResponse
    {
        $request->validate(['path' => 'required|string']);
        $isAdmin = Auth::check() && Auth::user()->is_admin;

        $folder = Folder::byPath($request->path)->first();
        if (!$folder) {
            return response()->json(['error' => 'Folder not found.'], 404);
        }

        // Recursively build the tree
        $buildTree = function ($folder) use (&$buildTree, $isAdmin) {
            $children = $folder->children;
            $documents = $folder->documents;
            $nodes = [];
            foreach ($children as $child) {
                $nodes[] = $buildTree($child);
            }
            foreach ($documents as $d) {
                $nodes[] = [
                    'type' => 'file',
                    'id' => $d->id,
                    'name' => $d->name,
                    'full_path' => $d->full_path,
                    'size' => number_format($d->size/1024/1024, 1) . ' MB',
                    'folder_path' => $folder->full_path,
                    'mime_type' => $d->mime_type
                ];
            }
            return [
                'type' => 'folder',
                'id' => $folder->id,
                'name' => $folder->name,
                'full_path' => $folder->full_path,
                'level' => $folder->level,
                'folder_type' => $folder->type,
                'is_protected' => $folder->isProtected(),
                'is_user_created' => $folder->is_user_created,
                'nodes' => $nodes
            ];
        };

        $tree = $buildTree($folder);
        return response()->json($tree);
    }
}
