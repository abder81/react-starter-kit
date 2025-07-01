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
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('display_name');
            $table->text('description')->nullable();
            $table->json('confidentiality_levels')->nullable(); // Array of allowed confidentiality levels
            $table->json('document_types')->nullable(); // Array of allowed document types
            $table->json('categories')->nullable(); // Array of allowed categories
            $table->boolean('can_upload')->default(false);
            $table->boolean('can_download')->default(false);
            $table->boolean('can_delete')->default(false);
            $table->boolean('can_approve')->default(false);
            $table->boolean('can_manage_obsolete')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
