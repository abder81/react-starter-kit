<?php
// routes/api.php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\FolderController;
use Illuminate\Support\Facades\Storage;


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Document Management Routes
Route::middleware('auth:sanctum')->group(function () {
    
    // Folder Management
    Route::prefix('folders')->group(function () {
        Route::get('/', [FolderController::class, 'index']); // Get hierarchy
        Route::get('/show', [FolderController::class, 'show']); // Get folder contents by path
        Route::post('/', [FolderController::class, 'store']); // Create folder
        Route::delete('/', [FolderController::class, 'destroy']); // Delete folder by path
    });

    // Document Management
    Route::prefix('documents')->group(function () {
        Route::get('/', [DocumentController::class, 'index']); // List documents
        Route::post('/', [DocumentController::class, 'store']); // Upload documents
        Route::get('/search', [DocumentController::class, 'search']); // Search documents
        Route::post('/bulk-delete', [DocumentController::class, 'bulkDelete']); // Bulk delete
        Route::post('/download', [DocumentController::class, 'download']); // Download single or multiple
        
        // Single document operations
        Route::get('/{document}', [DocumentController::class, 'show']); // Get document details
        Route::put('/{document}', [DocumentController::class, 'update']); // Update document (rename)
        Route::delete('/{document}', [DocumentController::class, 'destroy']); // Delete document
        Route::post('/{document}/archive', [DocumentController::class, 'archive']); // Archive document
        Route::get('/{document}/preview', [DocumentController::class, 'preview']); // Preview document
        Route::get('/{document}/download', function(\App\Models\Document $document) {
            if (!Storage::disk('private')->exists($document->file_path)) {
                abort(404, 'File not found');
            }
            
            return response()->download(
                Storage::disk('private')->path($document->file_path),
                $document->name
            );
        }); // Download single document
    });
});

// Web routes for file serving (if needed)
// Route::middleware('auth')->group(function () {
//     Route::get('/files/{document}', function(\App\Models\Document $document) {
//         if (!Storage::disk('private')->exists($document->file_path)) {
//             abort(404);
//         }
        
//         return Storage::disk('private')->response($document->file_path);
//     })->name('file.serve');
// });