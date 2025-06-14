<?php

namespace App\Models;

use App\Models\Folder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Document extends Model

{
    use HasFactory;

    protected $fillable = [
        'name', 'file_path', 'full_path', 'folder_id', 'mime_type', 'size'
    ];

    public function folder()
    {
        return $this->belongsTo(Folder::class);
    }

}
