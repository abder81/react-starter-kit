<?php
// database/migrations/2024_01_01_000001_create_folders_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('folders', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('full_path')->unique();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->integer('level')->default(1);
            $table->enum('type', ['root', 'category', 'process', 'document_type', 'confidentiality', 'custom'])->default('root');
            $table->boolean('is_user_created')->default(false);
            $table->boolean('is_protected')->default(false);
            $table->timestamps();
            
            $table->foreign('parent_id')->references('id')->on('folders')->onDelete('cascade');
            $table->index(['parent_id', 'level']);
            $table->index('full_path');
            $table->index(['name', 'parent_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('folders');
    }
};