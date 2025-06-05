<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'original_name',
        'file_path',
        'full_path',
        'folder_id',
        'mime_type',
        'size',
        'version',
        'status',
        'metadata'
    ];

    protected $casts = [
        'metadata' => 'json',
    ];

    // Relationships
    public function folder(): BelongsTo
    {
        return $this->belongsTo(Folder::class);
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DocumentVersion::class);
    }

    // Accessors
    public function getFormattedSizeAttribute(): string
    {
        $bytes = $this->size;
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' bytes';
    }

    public function getNextVersionNumber(): string
    {
        $lastVersion = $this->versions()
            ->orderByRaw('CAST(version as UNSIGNED) DESC')
            ->first();
        
        if (!$lastVersion) {
            return '1.0';
        }

        $parts = explode('.', $lastVersion->version);
        $major = (int)$parts[0];
        $minor = isset($parts[1]) ? (int)$parts[1] : 0;
        
        return ($major + 1) . '.0';
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeObsolete($query)
    {
        return $query->where('status', 'obsolete');
    }

    public function scopeSearch($query, string $term)
    {
        return $query->where('name', 'LIKE', "%{$term}%")
                    ->orWhere('original_name', 'LIKE', "%{$term}%");
    }

    // Helper methods
    public function moveToObsolete(): bool
    {
        $obsoleteFolder = Folder::byPath($this->folder->full_path->replace('Original/', 'Obsolete/'))->first();
        
        if (!$obsoleteFolder) {
            return false;
        }

        $this->update([
            'folder_id' => $obsoleteFolder->id,
            'status' => 'obsolete',
            'full_path' => $obsoleteFolder->full_path . '/' . $this->name
        ]);

        return true;
    }

    public function createVersion(string $filePath, int $size, ?string $notes = null): DocumentVersion
    {
        return $this->versions()->create([
            'version' => $this->getNextVersionNumber(),
            'file_path' => $filePath,
            'size' => $size,
            'change_notes' => $notes,
            'created_by' => Auth::id()
        ]);
    }
}
