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
        Schema::create('document_access_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('document_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('folder_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('action'); // view, download, upload, delete, etc.
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->json('metadata')->nullable(); // Additional context
            $table->timestamps();
            
            $table->index(['user_id', 'created_at']);
            $table->index(['document_id', 'action']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_access_logs');
    }
};
