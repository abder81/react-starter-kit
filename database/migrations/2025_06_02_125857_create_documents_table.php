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
            $table->string('original_name');
            $table->string('file_path');
            $table->string('full_path')->unique();
            $table->unsignedBigInteger('folder_id');
            $table->string('mime_type');
            $table->bigInteger('size'); // in bytes
            $table->string('version', 20)->default('1.0');
            $table->enum('status', ['active', 'obsolete', 'archived'])->default('active');
            $table->json('metadata')->nullable(); // for additional file metadata
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->timestamps();
            
            $table->foreign('folder_id')->references('id')->on('folders')->onDelete('cascade');
            $table->foreign('uploaded_by')->references('id')->on('users')->onDelete('set null');
            $table->index(['folder_id', 'status']);
            $table->index('full_path');
            $table->index('name');
            $table->index('status');
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
