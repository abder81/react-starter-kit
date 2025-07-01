<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Permission extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'display_name',
        'description',
        'resource',
        'action',
    ];

    /**
     * Get the roles that have this permission.
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_permissions')
                    ->withTimestamps();
    }

    /**
     * Get all permissions grouped by resource.
     */
    public static function getGroupedPermissions(): array
    {
        return self::all()->groupBy('resource')->map(function ($permissions) {
            return $permissions->pluck('display_name', 'name');
        })->toArray();
    }

    /**
     * Get permission by resource and action.
     */
    public static function findByResourceAndAction(string $resource, string $action): ?self
    {
        return self::where('resource', $resource)
                   ->where('action', $action)
                   ->first();
    }

    /**
     * Scope to filter by resource.
     */
    public function scopeForResource($query, string $resource)
    {
        return $query->where('resource', $resource);
    }
}