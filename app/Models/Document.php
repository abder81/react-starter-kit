<?php

namespace App\Models;

use App\Models\Folder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Document extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'file_path',
        'full_path',
        'folder_id',
        'mime_type',
        'size',
        'confidentiality_level',
        'document_type',
        'category',
        'status',
        'created_by',
        'approved_by',
        'approved_at',
        'access_restrictions',
        'download_count',
        'last_accessed',
        'requires_approval_to_view',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'last_accessed' => 'datetime',
        'access_restrictions' => 'array',
        'requires_approval_to_view' => 'boolean',
        'size' => 'integer',
        'download_count' => 'integer',
    ];

    /**
     * The "booted" method of the model.
     *
     * This method handles model events. Here, we're ensuring that if a document's
     * name is changed, its underlying file in storage is also renamed to maintain consistency.
     */
    protected static function boot()
    {
        parent::boot();

        static::updating(function ($document) {
            if ($document->isDirty('name') && !$document->isDirty('file_path')) {
                $oldPath = $document->getOriginal('file_path');
                // Create a new unique name for the file on disk to prevent collisions
                $newDiskName = 'documents/' . uniqid() . '_' . $document->name;
                
                if (Storage::disk('private')->exists($oldPath)) {
                    Storage::disk('private')->move($oldPath, $newDiskName);
                    $document->file_path = $newDiskName;
                }
            }
        });
    }

    /**
     * Get the folder that the document belongs to.
     */
    public function folder()
    {
        return $this->belongsTo(Folder::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function accessLogs()
    {
        return $this->hasMany(DocumentAccessLog::class);
    }

    public function approvalRequests()
    {
        return $this->hasMany(DocumentApprovalRequest::class);
    }

    /**
     * Format the document model for standardized API responses.
     * This ensures the frontend always receives data in a consistent format.
     */
    public function toApiArray(): array
    {
        // Calculate size in a human-readable format
        $bytes = $this->size;
        if ($bytes >= 1048576) { // MB
            $size = number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) { // KB
            $size = number_format($bytes / 1024, 2) . ' KB';
        } else { // bytes
            $size = $bytes . ' bytes';
        }

        return [
            'type' => 'file',
            'id' => $this->id,
            'name' => $this->name,
            'full_path' => $this->full_path,
            'size' => $size,
            'lastModified' => $this->updated_at->format('Y-m-d H:i:s'),
            'mime_type' => $this->mime_type,
            'folder_path' => optional($this->folder)->full_path,
        ];
    }
}
