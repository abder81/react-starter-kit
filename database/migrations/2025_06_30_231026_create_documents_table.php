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
            $table->string('confidentiality_level')->default('Interne');
            $table->string('document_type')->nullable();
            $table->string('category')->nullable();
            $table->string('status')->default('draft'); // draft, approved, obsolete, archived
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamp('approved_at')->nullable();
            $table->json('access_restrictions')->nullable(); // Additional access rules
            $table->integer('download_count')->default(0);
            $table->timestamp('last_accessed')->nullable();
            $table->boolean('requires_approval_to_view')->default(false);
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
