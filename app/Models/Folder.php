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
        return $this->is_protected || in_array($this->name, [
            'Original',
            'Obsolete',
            'Pilotage (4)',
            'Réalisation (6)',
            'Support (7)'
        ]);
    }

    public function canUploadFiles(): bool
    {
        return $this->level === 5;
    }

    public static function getHierarchy(?int $parentId = null): array
    {
        $folders = static::where('parent_id', $parentId)
            ->with('children')
            ->orderBy('name')
            ->get();

        return $folders->map(function ($f) {
            $nodes = [];

            // child folders
            foreach ($f->children as $c) {
                $nodes[] = [
                    'type' => 'folder',
                    'id' => $c->id,
                    'name' => $c->name,
                    'full_path' => $c->full_path,
                ];
            }

            // files under this folder
            foreach ($f->documents as $d) {
                $nodes[] = [
                    'type' => 'file',
                    'id' => $d->id,
                    'name' => $d->name,
                    'full_path' => $d->full_path,
                    'size' => number_format($d->size/1024/1024, 1) . ' MB',
                    'lastModified' => $d->updated_at->format('Y-m-d'),
                ];
            }

            return [
                'type' => 'folder',
                'id' => $f->id,
                'name' => $f->name,
                'full_path' => $f->full_path,
                'nodes' => $nodes,
            ];
        })->toArray();
    }
}
