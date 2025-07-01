<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'display_name',
        'description',
        'confidentiality_levels',
        'document_types',
        'categories',
        'can_upload',
        'can_download',
        'can_delete',
        'can_approve',
        'can_manage_obsolete',
        'is_active',
    ];

    protected $casts = [
        'confidentiality_levels' => 'array',
        'document_types' => 'array',
        'categories' => 'array',
        'can_upload' => 'boolean',
        'can_download' => 'boolean',
        'can_delete' => 'boolean',
        'can_approve' => 'boolean',
        'can_manage_obsolete' => 'boolean',
        'is_active' => 'boolean',
    ];

    /**
     * Get the permissions associated with the role.
     */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permissions')
                    ->withTimestamps();
    }

    /**
     * Get the users that have this role.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_roles')
                    ->withPivot(['assigned_at', 'assigned_by'])
                    ->withTimestamps();
    }

    /**
     * Get users who have this as their primary role.
     */
    public function primaryUsers(): HasMany
    {
        return $this->hasMany(User::class, 'primary_role_id');
    }

    /**
     * Check if role has a specific permission.
     */
    public function hasPermission(string $permission): bool
    {
        return $this->permissions()->where('name', $permission)->exists();
    }

    /**
     * Check if role can access a specific confidentiality level.
     */
    public function canAccessConfidentialityLevel(string $level): bool
    {
        if (empty($this->confidentiality_levels)) {
            return true; // No restrictions
        }

        return in_array($level, $this->confidentiality_levels);
    }

    /**
     * Check if role can access a specific document type.
     */
    public function canAccessDocumentType(string $type): bool
    {
        if (empty($this->document_types)) {
            return true; // No restrictions
        }

        return in_array($type, $this->document_types);
    }

    /**
     * Check if role can access a specific category.
     */
    public function canAccessCategory(string $category): bool
    {
        if (empty($this->categories)) {
            return true; // No restrictions
        }

        return in_array($category, $this->categories);
    }

    /**
     * Get available confidentiality levels.
     */
    public static function getConfidentialityLevels(): array
    {
        return [
            'Public' => 'Public',
            'Interne' => 'Interne',
            'Restreint' => 'Restreint',
            'Confidentiel' => 'Confidentiel',
            'Strictement Confidentiel' => 'Strictement Confidentiel',
        ];
    }

    /**
     * Get available document types.
     */
    public static function getDocumentTypes(): array
    {
        return [
            'Procédure' => 'Procédure',
            'Charte' => 'Charte',
            'Guide' => 'Guide',
            'Politique' => 'Politique',
            'Enregistrement' => 'Enregistrement',
        ];
    }

    /**
     * Get available categories.
     */
    public static function getCategories(): array
    {
        return [
            'Pilotage (4)' => 'Pilotage (4)',
            'Réalisation (6)' => 'Réalisation (6)',
            'Support (7)' => 'Support (7)',
        ];
    }

    /**
     * Scope to get active roles.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get roles that can perform a specific action.
     */
    public function scopeCanPerform($query, string $action)
    {
        $column = 'can_' . $action;
        if (in_array($column, $this->fillable)) {
            return $query->where($column, true);
        }

        return $query;
    }
}