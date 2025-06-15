<?php

use Inertia\Inertia;
use App\Models\Folder;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\DocumentController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
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
    Route::post('/folders', [FolderController::class, 'store']);
    Route::delete('/folders', [FolderController::class, 'destroy']);

    // Document endpoints
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::put('/documents/{document}', [DocumentController::class, 'update']);
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);
    Route::post('/documents/bulk-delete', [DocumentController::class, 'bulkDelete']);
    Route::post('/documents/download', [DocumentController::class, 'download']);
    Route::get('/documents/search', [DocumentController::class, 'search']);
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
