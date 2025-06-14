<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('file_path');
            $table->string('full_path')->unique();
            $table->unsignedBigInteger('folder_id');
            $table->string('mime_type');
            $table->unsignedBigInteger('size');
            $table->timestamps();
            $table->foreign('folder_id')->references('id')->on('folders')->onDelete('cascade');
            $table->index(['folder_id']);
            $table->index('full_path');
            $table->index('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
