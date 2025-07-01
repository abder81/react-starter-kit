<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    public function index()
    {
        // You should add authorization checks here
        // Gate::authorize('viewAny', Role::class);
        return Role::with('permissions')->get();
    }

    public function show(Role $role)
    {
        // Gate::authorize('view', $role);
        return $role->load('permissions');
    }

    public function store(Request $request)
    {
        // Gate::authorize('create', Role::class);
        $validated = $request->validate([
            'name' => 'required|unique:roles,name|string|max:255',
            'display_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id', // Ensure permissions exist
        ]);

        $role = Role::create($validated);

        if (!empty($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }

        return response()->json($role->load('permissions'), 201);
    }

    public function update(Request $request, Role $role)
    {
        // Gate::authorize('update', $role);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('roles')->ignore($role->id)],
            'display_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role->update($validated);

        if ($request->has('permissions')) {
            $role->permissions()->sync($validated['permissions'] ?? []);
        }

        return response()->json($role->load('permissions'));
    }

    public function destroy(Role $role)
    {
        // Gate::authorize('delete', $role);

        // Prevent deleting critical roles
        if (in_array($role->name, ['super-admin', 'document-admin'])) {
            return response()->json(['message' => 'Cannot delete critical system roles.'], 403);
        }

        $role->delete();

        return response()->json(null, 204);
    }
    
    public function allPermissions()
    {
        return Permission::all()->groupBy('resource');
    }
}
