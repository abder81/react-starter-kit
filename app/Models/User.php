<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\DocumentApprovalRequest;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'service',
        'is_admin',
        'primary_role_id',
        'department_access',
        'restricted_confidentiality',
        'is_document_admin',
        'last_document_access',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'department_access' => 'array',
            'restricted_confidentiality' => 'array',
            'is_document_admin' => 'boolean',
            'last_document_access' => 'datetime',
        ];
    }

    /**
     * Get the user's primary role.
     */
    public function primaryRole(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'primary_role_id');
    }

    /**
     * Get all roles assigned to the user.
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles')
                    ->withPivot(['assigned_at', 'assigned_by'])
                    ->withTimestamps();
    }

    /**
     * Get documents created by this user.
     */
    public function createdDocuments(): HasMany
    {
        return $this->hasMany(Document::class, 'created_by');
    }

    /**
     * Get documents approved by this user.
     */
    public function approvedDocuments(): HasMany
    {
        return $this->hasMany(Document::class, 'approved_by');
    }

    /**
     * Get document access logs for this user.
     */
    public function documentAccessLogs(): HasMany
    {
        return $this->hasMany(DocumentAccessLog::class);
    }

    /**
     * Get approval requests made by this user.
     */
    public function approvalRequests(): HasMany
    {
        return $this->hasMany(DocumentApprovalRequest::class, 'requested_by');
    }

    /**
     * Get approval requests assigned to this user.
     */
    public function assignedApprovalRequests(): HasMany
    {
        return $this->hasMany(DocumentApprovalRequest::class, 'approver_id');
    }

    /**
     * Check if user has a specific role.
     */
    public function hasRole(string $roleName): bool
    {
        return $this->roles()->where('name', $roleName)->exists() || 
               $this->primaryRole?->name === $roleName;
    }

    /**
     * Check if user has any of the given roles.
     */
    public function hasAnyRole(array $roleNames): bool
    {
        return $this->roles()->whereIn('name', $roleNames)->exists() ||
               in_array($this->primaryRole?->name, $roleNames);
    }

    /**
     * Check if user has a specific permission.
     */
    public function hasPermission(string $permission): bool
    {
        // Check if user is admin
        if ($this->is_admin || $this->is_document_admin) {
            return true;
        }

        // Check through roles
        $allRoles = $this->roles;
        if ($this->primaryRole) {
            $allRoles = $allRoles->push($this->primaryRole);
        }

        return $allRoles->some(function ($role) use ($permission) {
            return $role->hasPermission($permission);
        });
    }

    /**
     * Check if user can access a specific confidentiality level.
     */
    public function canAccessConfidentialityLevel(string $level): bool
    {
        // Admin can access everything
        if ($this->is_admin || $this->is_document_admin) {
            return true;
        }

        // Check user-specific restrictions
        if (!empty($this->restricted_confidentiality)) {
            return in_array($level, $this->restricted_confidentiality);
        }

        // Check through roles
        $allRoles = $this->roles;
        if ($this->primaryRole) {
            $allRoles = $allRoles->push($this->primaryRole);
        }

        return $allRoles->some(function ($role) use ($level) {
            return $role->canAccessConfidentialityLevel($level);
        });
    }

    /**
     * Check if user can access a specific document type.
     */
    public function canAccessDocumentType(string $type): bool
    {
        if ($this->is_admin || $this->is_document_admin) {
            return true;
        }

        $allRoles = $this->roles;
        if ($this->primaryRole) {
            $allRoles = $allRoles->push($this->primaryRole);
        }

        return $allRoles->some(function ($role) use ($type) {
            return $role->canAccessDocumentType($type);
        });
    }

    /**
     * Check if user can access a specific category.
     */
    public function canAccessCategory(string $category): bool
    {
        if ($this->is_admin || $this->is_document_admin) {
            return true;
        }

        $allRoles = $this->roles;
        if ($this->primaryRole) {
            $allRoles = $allRoles->push($this->primaryRole);
        }

        return $allRoles->some(function ($role) use ($category) {
            return $role->canAccessCategory($category);
        });
    }

    /**
     * Check if user can perform a specific action.
     */
    public function canPerform(string $action): bool
    {
        if ($this->is_admin || $this->is_document_admin) {
            return true;
        }

        $allRoles = $this->roles;
        if ($this->primaryRole) {
            $allRoles = $allRoles->push($this->primaryRole);
        }

        $property = 'can_' . $action;

        return $allRoles->some(function ($role) use ($property) {
            return $role->$property ?? false;
        });
    }

    /**
     * Check if user can access a specific document.
     */
    public function canAccessDocument(Document $document): bool
    {
        // Admin can access everything
        if ($this->is_admin || $this->is_document_admin) {
            return true;
        }

        // Check confidentiality level
        if (!$this->canAccessConfidentialityLevel($document->confidentiality_level)) {
            return false;
        }

        // Check document type
        if ($document->document_type && !$this->canAccessDocumentType($document->document_type)) {
            return false;
        }

        // Check category
        if ($document->category && !$this->canAccessCategory($document->category)) {
            return false;
        }

        // Check if document requires approval and is not approved
        if ($document->requires_approval_to_view && $document->status !== 'approved') {
            return $document->created_by === $this->id || $this->canPerform('approve');
        }

        // Check document-specific access restrictions
        if (!empty($document->access_restrictions)) {
            $restrictions = is_string($document->access_restrictions) 
                ? json_decode($document->access_restrictions, true) 
                : $document->access_restrictions;

            if (isset($restrictions['users']) && !in_array($this->id, $restrictions['users'])) {
                return false;
            }

            if (isset($restrictions['roles'])) {
                $userRoleNames = $this->roles->pluck('name')->toArray();
                if ($this->primaryRole) {
                    $userRoleNames[] = $this->primaryRole->name;
                }

                if (empty(array_intersect($userRoleNames, $restrictions['roles']))) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Check if user can access a specific folder.
     */
    public function canAccessFolder(Folder $folder): bool
    {
        // Admin can access everything
        if ($this->is_admin || $this->is_document_admin) {
            return true;
        }

        // Check folder-specific role restrictions
        if (!empty($folder->role_restrictions)) {
            $userRoleNames = $this->roles->pluck('name')->toArray();
            if ($this->primaryRole) {
                $userRoleNames[] = $this->primaryRole->name;
            }

            if (empty(array_intersect($userRoleNames, $folder->role_restrictions))) {
                return false;
            }
        }

        // Check folder-specific user restrictions
        if (!empty($folder->user_restrictions) && !in_array($this->id, $folder->user_restrictions)) {
            return false;
        }

        return true;
    }

    /**
     * Assign a role to the user.
     */
    public function assignRole(Role $role, ?User $assignedBy = null): void
    {
        $this->roles()->syncWithoutDetaching([
            $role->id => [
                'assigned_at' => now(),
                'assigned_by' => $assignedBy?->id,
            ]
        ]);
    }

    /**
     * Remove a role from the user.
     */
    public function removeRole(Role $role): void
    {
        $this->roles()->detach($role->id);
    }

    /**
     * Get all permissions through roles.
     */
    public function getAllPermissions(): \Illuminate\Support\Collection
    {
        $allRoles = $this->roles;
        if ($this->primaryRole) {
            $allRoles = $allRoles->push($this->primaryRole);
        }

        return $allRoles->flatMap(function ($role) {
            return $role->permissions;
        })->unique('id');
    }

    /**
     * Log document access.
     */
    public function logDocumentAccess(Document $document, string $action, array $metadata = []): void
    {
        DocumentAccessLog::create([
            'user_id' => $this->id,
            'document_id' => $document->id,
            'folder_id' => $document->folder_id,
            'action' => $action,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'metadata' => $metadata,
        ]);

        // Update last document access
        $this->update(['last_document_access' => now()]);
    }
}
