<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FolderConfiguration extends Model
{
    protected $fillable = [
        'key',
        'value',
        'description'
    ];

    protected $casts = [
        'value' => 'array'
    ];

    public static function getRootCategories(): array
    {
        return static::where('key', 'root_categories')->first()?->value ?? [];
    }

    public static function getDocumentTypes(): array
    {
        return static::where('key', 'document_types')->first()?->value ?? [];
    }

    public static function getConfidentialityLevels(): array
    {
        return static::where('key', 'confidentiality_levels')->first()?->value ?? [];
    }
} 