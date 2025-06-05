<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

use App\Http\Controllers\Api\FolderController;
use App\Http\Controllers\Api\DocumentController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    // return the FileManager.tsx's page
    Route::get('file-manager', function () {
        return Inertia::render('FileManager');
    })->name('file-manager');

    

});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
