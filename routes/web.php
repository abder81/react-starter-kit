<?php

use App\Models\User;
use Inertia\Inertia;
use App\Models\Folder;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\DocumentController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    // Debug route for storage testing
    Route::get('/debug/storage', function () {
        $storagePath = storage_path('app/private');
        $documentsPath = storage_path('app/private/documents');
        
        return response()->json([
            'storage_path' => $storagePath,
            'storage_exists' => file_exists($storagePath),
            'storage_writable' => is_writable($storagePath),
            'documents_path' => $documentsPath,
            'documents_exists' => file_exists($documentsPath),
            'documents_writable' => is_writable($documentsPath),
            'documents_contents' => file_exists($documentsPath) ? scandir($documentsPath) : [],
            'storage_disk_config' => config('filesystems.disks.private'),
        ]);
    });

    // Dashboard
    Route::get('dashboard', function () {
        $hierarchy = Folder::getHierarchy();
        return Inertia::render('Dashboard', [
            'hierarchy' => $hierarchy
        ]);
    })->name('dashboard');

    // Folder endpoints
    Route::get('/folders/hierarchy', [FolderController::class, 'hierarchy']);
    Route::get('/folders/contents', [FolderController::class, 'contents']);
    Route::get('/folders/configurations', [FolderController::class, 'configurations']);
    Route::post('/folders/create', [FolderController::class, 'store']); // Changed
    Route::delete('/folders/{path}', [FolderController::class, 'destroy'])
        ->where('path', '.*'); // This allows slashes in the path parameter

    // Document endpoints
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::put('/documents/{document}', [DocumentController::class, 'update']);
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);
    Route::post('/documents/bulk-delete', [DocumentController::class, 'bulkDelete']);
    Route::post('/documents/download', [DocumentController::class, 'download']);
    Route::get('/documents/search', [DocumentController::class, 'search']);

    // NEW: Add archive route
    Route::post('/documents/{document}/archive', [DocumentController::class, 'archive']);

    // NEW: Add PDF viewing route
    Route::get('/documents/view/{path}', [DocumentController::class, 'view'])
        ->where('path', '.*'); // Allow slashes in path

    // User Management
    Route::get('users', function () {
        return Inertia::render('Users', [
            'users' => User::all() // Pass all users to the component
        ]);
    })->name('users');

    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
    
    // Route to manage folder permissions for a specific user
    Route::get('/users/{user}/permissions', [UserController::class, 'getPermissions'])->name('users.permissions.get');
    Route::post('/users/{user}/permissions', [UserController::class, 'updatePermissions'])->name('users.permissions.update');

});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
