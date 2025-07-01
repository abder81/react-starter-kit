<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            // Document permissions
            ['name' => 'documents.view', 'display_name' => 'View Documents', 'resource' => 'documents', 'action' => 'view'],
            ['name' => 'documents.create', 'display_name' => 'Create Documents', 'resource' => 'documents', 'action' => 'create'],
            ['name' => 'documents.edit', 'display_name' => 'Edit Documents', 'resource' => 'documents', 'action' => 'edit'],
            ['name' => 'documents.delete', 'display_name' => 'Delete Documents', 'resource' => 'documents', 'action' => 'delete'],
            ['name' => 'documents.approve', 'display_name' => 'Approve Documents', 'resource' => 'documents', 'action' => 'approve'],
            ['name' => 'documents.download', 'display_name' => 'Download Documents', 'resource' => 'documents', 'action' => 'download'],
            ['name' => 'documents.upload', 'display_name' => 'Upload Documents', 'resource' => 'documents', 'action' => 'upload'],
            ['name' => 'documents.manage_obsolete', 'display_name' => 'Manage Obsolete', 'resource' => 'documents', 'action' => 'manage_obsolete'],


            // Folder permissions
            ['name' => 'folders.view', 'display_name' => 'View Folders', 'resource' => 'folders', 'action' => 'view'],
            ['name' => 'folders.create', 'display_name' => 'Create Folders', 'resource' => 'folders', 'action' => 'create'],
            ['name' => 'folders.edit', 'display_name' => 'Edit Folders', 'resource' => 'folders', 'action' => 'edit'],
            ['name' => 'folders.delete', 'display_name' => 'Delete Folders', 'resource' => 'folders', 'action' => 'delete'],

            // User permissions
            ['name' => 'users.view', 'display_name' => 'View Users', 'resource' => 'users', 'action' => 'view'],
            ['name' => 'users.create', 'display_name' => 'Create Users', 'resource' => 'users', 'action' => 'create'],
            ['name' => 'users.edit', 'display_name' => 'Edit Users', 'resource' => 'users', 'action' => 'edit'],
            ['name' => 'users.delete', 'display_name' => 'Delete Users', 'resource' => 'users', 'action' => 'delete'],
            ['name' => 'users.assign_roles', 'display_name' => 'Assign Roles', 'resource' => 'users', 'action' => 'assign_roles'],


            // Role permissions
            ['name' => 'roles.view', 'display_name' => 'View Roles', 'resource' => 'roles', 'action' => 'view'],
            ['name' => 'roles.create', 'display_name' => 'Create Roles', 'resource' => 'roles', 'action' => 'create'],
            ['name' => 'roles.edit', 'display_name' => 'Edit Roles', 'resource' => 'roles', 'action' => 'edit'],
            ['name' => 'roles.delete', 'display_name' => 'Delete Roles', 'resource' => 'roles', 'action' => 'delete'],

            // Settings permissions
            ['name' => 'settings.view', 'display_name' => 'View Settings', 'resource' => 'settings', 'action' => 'view'],
            ['name' => 'settings.edit', 'display_name' => 'Edit Settings', 'resource' => 'settings', 'action' => 'edit'],
        ];

        foreach ($permissions as $permission) {
            Permission::updateOrCreate(['name' => $permission['name']], $permission);
        }

        // Create roles and assign created permissions
        $viewerRole = Role::updateOrCreate(['name' => 'viewer'], [
            'display_name' => 'Viewer',
            'description' => 'Can view documents and folders.',
            'can_download' => true,
        ]);
        $viewerRole->permissions()->sync(Permission::whereIn('name', ['documents.view', 'folders.view'])->pluck('id'));

        $editorRole = Role::updateOrCreate(['name' => 'editor'], [
            'display_name' => 'Editor',
            'description' => 'Can create and edit documents.',
            'can_upload' => true,
            'can_download' => true,
        ]);
        $editorRole->permissions()->sync(Permission::whereIn('name', ['documents.view', 'documents.create', 'documents.edit', 'folders.view'])->pluck('id'));


        $approverRole = Role::updateOrCreate(['name' => 'approver'], [
            'display_name' => 'Approver',
            'description' => 'Can approve documents.',
            'can_approve' => true,
            'can_download' => true,
        ]);
        $approverRole->permissions()->sync(Permission::whereIn('name', ['documents.view', 'documents.approve', 'folders.view'])->pluck('id'));


        $docAdminRole = Role::updateOrCreate(['name' => 'document-admin'], [
            'display_name' => 'Document Admin',
            'description' => 'Full control over documents and folders.',
            'can_upload' => true,
            'can_download' => true,
            'can_delete' => true,
            'can_approve' => true,
            'can_manage_obsolete' => true,
        ]);
        $docAdminRole->permissions()->sync(Permission::where('resource', 'documents')->orWhere('resource', 'folders')->pluck('id'));


        // Create Super Admin role
        $superAdminRole = Role::updateOrCreate(['name' => 'super-admin'], [
            'display_name' => 'Super Admin',
            'description' => 'Has all permissions.'
        ]);
        $superAdminRole->permissions()->sync(Permission::all()->pluck('id'));


        // Create a super admin user
        $adminUser = User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'is_admin' => true,
                'is_document_admin' => true,
            ]
        );
        $adminUser->assignRole($superAdminRole, $adminUser);
        $adminUser->primary_role_id = $superAdminRole->id;
        $adminUser->save();

        // Create a regular user for testing
        $testUser = User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
            ]
        );
        $testUser->assignRole($viewerRole, $adminUser);
        $testUser->primary_role_id = $viewerRole->id;
        $testUser->save();
    }
}
