<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::get('utilisateurs', function () {
        return Inertia::render('users');
    })->name('utilisateurs');

    Route::get('roles', function () {
        return Inertia::render('roles');
    })->name('roles');

    Route::get('documents', function () {
        return Inertia::render('docs');
    })->name('documents');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
