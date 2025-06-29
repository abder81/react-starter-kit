<?php

namespace App\Models;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Folder extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'full_path',
        'parent_id',
        'level',
        'type',
        'is_user_created',
        'is_protected'
    ];

    protected $casts = [
        'is_user_created' => 'boolean',
        'is_protected' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();

        // Before deleting a folder, delete all its children
        static::deleting(function ($folder) {
            $folder->children()->get()->each(function ($child) {
                $child->delete();
            });
        });
    }

    public function parent()
    {
        return $this->belongsTo(Folder::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Folder::class, 'parent_id');
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    public function activeDocuments()
    {
        return $this->documents();
    }

    public function scopeByPath($query, string $path)
    {
        return $query->where('full_path', $path);
    }

    /**
     * Get the folder hierarchy.
     * For non-admin users, it filters to show only 'process' folders under 'Original' branches.
     *
     * @param int|null $parentId
     * @param bool $isAdmin
     * @return array
     */
    public static function getHierarchy(?int $parentId = null, bool $isAdmin = true): array
    {
        // Start with folders at the current level, ordered by name
        $folders = Folder::where('parent_id', $parentId)
            ->when(!$isAdmin, function ($query) use ($parentId) {
                // If not admin and at root level, only show 'Original'
                if (is_null($parentId)) {
                    $query->where('name', 'Original');
                } else {
                    // For non-admin, if parent is 'Original' or 'category', show its children
                    // If parent is a 'process' folder, show its children (doc types, conf)
                    // Otherwise, only show 'process' type children
                    $parentFolder = Folder::find($parentId);
                    if ($parentFolder && ($parentFolder->type === 'root' || $parentFolder->type === 'category' || $parentFolder->type === 'process')) {
                        // Allow all children under root/category/process for expansion
                        // This allows 'document_type' and 'confidentiality' folders to appear
                        // under a 'process' folder when it's expanded.
                        return $query;
                    } else {
                        // For other types, only show 'process' children. This might need refinement
                        // based on exact hierarchy structure and what the user wants to see.
                        $query->where('type', 'process');
                    }
                }
            })
            ->orderBy('name')
            ->get();

        $hierarchy = [];

        foreach ($folders as $folder) {
            $nodes = [];

            // Recursively get children for folders, applying admin/non-admin logic
            // For non-admin, we want to expand specific branches only.
            $children = static::getHierarchy($folder->id, $isAdmin);

            // Add children folders
            foreach ($children as $childNode) {
                $nodes[] = $childNode;
            }

            // Add files under this folder, but only for admin or if it's a process/doc_type/confidentiality folder for non-admin
            if ($isAdmin || in_array($folder->type, ['process', 'document_type', 'confidentiality'])) {
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
            }

            // For non-admin, if this is a 'process' folder and its children are not yet loaded,
            // we will not include its 'nodes' array in the initial hierarchy,
            // but the `contents` endpoint will provide them.
            // This is handled by the `getFilteredContents` in the controller.
            $hierarchy[] = [
                'type' => 'folder',
                'id' => $folder->id,
                'name' => $folder->name,
                'full_path' => $folder->full_path,
                'level' => $folder->level,
                'folder_type' => $folder->type,
                'is_protected' => $folder->isProtected(),
                'is_user_created' => $folder->is_user_created,
                // Only include nodes if admin, or if it's a process/document_type/confidentiality folder that needs to be shown
                'nodes' => $nodes
            ];
        }

        return $hierarchy;
    }

    /**
     * Get contents of a specific folder based on user permissions.
     *
     * @param string $path The full path of the folder.
     * @param bool $isAdmin Whether the current user is an admin.
     * @return array
     */
    public static function getFilteredContents(string $path, bool $isAdmin): array
    {
        $folder = Folder::byPath($path)
            ->with(['children', 'documents'])
            ->first(); // Use first() instead of firstOrFail() to handle non-existent paths gracefully

        if (!$folder) {
            return []; // Folder not found
        }

        $nodes = [];

        // Admins can see all contents
        if ($isAdmin) {
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
                    // Children nodes are not pre-fetched here for performance, loaded on demand by frontend
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
        } else {
            // Non-admin logic
            // Allow access to contents of 'process', 'document_type', and 'confidentiality' folders.
            // Also, allow access to children of 'root' (e.g. 'Original') and 'category' (e.g. 'Matiere') to find process folders.
            if (in_array($folder->type, ['root', 'category', 'process', 'document_type', 'confidentiality'])) {
                foreach ($folder->children as $c) {
                    // For non-admin, ensure only permitted children are listed.
                    // This is crucial to prevent unauthorized access to other folder types.
                    if (in_array($c->type, ['process', 'document_type', 'confidentiality'])) {
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
            } else {
                // If a non-admin tries to access an unauthorized folder type, return empty.
                // Or you could throw an abort(403) here in the controller.
                return [];
            }
        }

        return $nodes;
    }


    public function isProtected(): bool
    {
        return (bool) $this->is_protected;
    }
}
