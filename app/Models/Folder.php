<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    // Relationships
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Folder::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Folder::class, 'parent_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function activeDocuments(): HasMany
    {
        return $this->hasMany(Document::class)->where('status', 'active');
    }

    // Scopes
    public function scopeByPath($query, string $path)
    {
        return $query->where('full_path', $path);
    }

    public function scopeRoots($query)
    {
        return $query->whereNull('parent_id');
    }

    public function scopeByLevel($query, int $level)
    {
        return $query->where('level', $level);
    }

    // Helper methods
    public function getPathArray(): array
    {
        return explode('/', $this->full_path);
    }

    public function isProtected(): bool
    {
        return $this->is_protected || in_array($this->name, [
            'Original', 'Obsolete', 'Pilotage (4)', 'Réalisation (6)', 'Support (7)'
        ]);
    }

    public function canUploadFiles(): bool
    {
        return $this->level === 5; // 5th level: confidentiality level
    }

    // Build hierarchy tree
    public static function getHierarchy(?int $parentId = null): array
    {
        $folders = static::where('parent_id', $parentId)
            ->with(['children', 'activeDocuments'])
            ->orderBy('name')
            ->get();

        return $folders->map(function ($folder) {
            return [
                'id' => $folder->id,
                'name' => $folder->name,
                'full_path' => $folder->full_path,
                'level' => $folder->level,
                'type' => $folder->type,
                'is_user_created' => $folder->is_user_created,
                'nodes' => array_merge(
                    static::getHierarchy($folder->id), // Child folders
                    $folder->activeDocuments->map(function ($doc) {
                        return [
                            'id' => $doc->id,
                            'name' => $doc->name,
                            'size' => $doc->formatted_size,
                            'lastModified' => $doc->updated_at->format('Y-m-d'),
                            'type' => 'file'
                        ];
                    })->toArray()
                )
            ];
        })->toArray();
    }
}
