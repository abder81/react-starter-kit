<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

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

    public function isProtected(): bool
    {
        // Root folders are always protected
        // if ($this->level === 1) {
        //     return true;
        // }

        // // Category folders (Pilotage, Réalisation, Support) are protected
        // if ($this->level === 2) {
        //     return true;
        // }

        // Process folders (PSP-01, PSP-02, etc.) are protected
        // if ($this->level === 3) {
        //     return true;
        // }

        // User created folders at level 4 and below can be deleted
        if ($this->level >= 1 && $this->is_user_created) {
            return false;
        }

        return $this->is_protected ?? true;
    }

    public function canUploadFiles(): bool
    {
        // Only allow uploads in confidentiality level folders (level 5)
        return $this->level === 5;
    }

    public static function getHierarchy(?int $parentId = null): array
    {
        $folders = static::where('parent_id', $parentId)
            ->with(['children', 'documents'])
            ->orderBy('name')
            ->get();

        return $folders->map(function ($f) {
            $nodes = [];

            // Add child folders - IMPORTANT: Add 'type' field
            foreach ($f->children as $c) {
                $nodes[] = [
                    'type' => 'folder', // This was missing!
                    'id' => $c->id,
                    'name' => $c->name,
                    'full_path' => $c->full_path,
                    'level' => $c->level,
                    'folder_type' => $c->type,
                    'is_protected' => $c->isProtected(),
                    'is_user_created' => $c->is_user_created,
                    'nodes' => static::getHierarchy($c->id) // Recursively get children
                ];
            }

            // Add files under this folder
            foreach ($f->documents as $d) {
                $nodes[] = [
                    'type' => 'file',
                    'id' => $d->id,
                    'name' => $d->name,
                    'full_path' => $d->full_path,
                    'size' => number_format($d->size/1024/1024, 1) . ' MB',
                    'lastModified' => $d->updated_at->format('Y-m-d'),
                    'folder_path' => $f->full_path,
                    'mime_type' => $d->mime_type
                ];
            }

            return [
                'type' => 'folder', // This was missing!
                'id' => $f->id,
                'name' => $f->name,
                'full_path' => $f->full_path,
                'level' => $f->level,
                'folder_type' => $f->type,
                'is_protected' => $f->isProtected(),
                'is_user_created' => $f->is_user_created,
                'nodes' => $nodes
            ];
        })->toArray();
    }
}