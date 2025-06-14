<?php

namespace App\Http\Controllers;

use App\Models\Folder;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class FolderController extends Controller
{
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
                'full_path' => $c->full_path
            ];
        }

        foreach ($folder->documents as $d) {
            $nodes[] = [
                'type' => 'file',
                'id' => $d->id,
                'name' => $d->name,
                'full_path' => $d->full_path,
                'size' => number_format($d->size/1024/1024, 1) . ' MB',
                'lastModified' => $d->updated_at->format('Y-m-d')
            ];
        }

        return response()->json(['nodes' => $nodes]);
    }

    /**
     * Create a new folder
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'parent_path' => 'required|string'
        ]);

        $parent = Folder::byPath($data['parent_path'])->firstOrFail();
        $fullPath = $parent->full_path . '/' . $data['name'];
        $level = $parent->level + 1;
        $type = $this->getFolderType($level);

        DB::beginTransaction();
        try {
            $folder = Folder::create([
                'name' => $data['name'],
                'full_path' => $fullPath,
                'parent_id' => $parent->id,
                'level' => $level,
                'type' => $type,
                'is_user_created' => true
            ]);

            $this->createSubStructure($folder);
            DB::commit();
            return response()->json($folder, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete a folder
     */
    public function destroy(Request $request): JsonResponse
    {
        $request->validate(['path' => 'required|string']);

        $folder = Folder::byPath($request->path)->firstOrFail();
        
        if ($folder->isProtected()) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $folder->delete();
        return response()->json(['message' => 'Deleted']);
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
