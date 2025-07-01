<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentApprovalRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_id',
        'requested_by',
        'approver_id',
        'status',
        'reason',
        'approver_notes',
        'approved_at',
    ];

    /**
     * Get the document associated with this approval request.
     */
    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    /**
     * Get the user who requested the approval.
     */
    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    /**
     * Get the user assigned as approver.
     */
    public function approver()
    {
        return $this->belongsTo(User::class, 'approver_id');
    }
} 