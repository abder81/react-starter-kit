<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentAccessLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'document_id',
        'folder_id',
        'action',
        'ip_address',
        'user_agent',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    /**
     * Get the user who performed the action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the document that was accessed.
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    /**
     * Get the folder that was accessed.
     */
    public function folder(): BelongsTo
    {
        return $this->belongsTo(Folder::class);
    }

    /**
     * Scope to get logs for a specific action.
     */
    public function scopeForAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope to get recent logs.
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Get available actions.
     */
    public static function getActions(): array
    {
        return [
            'view' => 'Consultation',
            'download' => 'Téléchargement',
            'upload' => 'Upload',
            'edit' => 'Modification',
            'delete' => 'Suppression',
            'approve' => 'Approbation',
            'reject' => 'Rejet',
            'move' => 'Déplacement',
            'copy' => 'Copie',
            'share' => 'Partage',
        ];
    }
}