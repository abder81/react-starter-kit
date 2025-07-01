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
        Schema::table('users', function (Blueprint $table) {
            $table->enum('service', ['service1', 'service2', 'service3'])->nullable()->after('email');
            $table->foreignId('primary_role_id')->nullable()->constrained('roles')->onDelete('set null');
            $table->json('department_access')->nullable(); // Departments user can access
            $table->json('restricted_confidentiality')->nullable(); // Override confidentiality restrictions
            $table->boolean('is_document_admin')->default(false);
            $table->timestamp('last_document_access')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            //
        });
    }
};
