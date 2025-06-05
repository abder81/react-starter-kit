<?php
namespace App\Services;

use App\Models\Document;
use App\Models\Folder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DocumentService
{
    /**
     * Upload multiple documents to a folder
     */
    public function uploadDocuments(array $files, string $folderPath, bool $isArchive = false, ?string $version = null): array
    {
        $folder = Folder::byPath($folderPath)->first();
        
        if (!$folder) {
            throw new \Exception('Folder not found');
        }

        if (!$folder->canUploadFiles()) {
            throw new \Exception('Cannot upload files to this folder level');
        }

        $uploadedDocuments = [];

        DB::beginTransaction();
        try {
            foreach ($files as $file) {
                $document = $this->processFileUpload($file, $folder, $isArchive, $version);
                $uploadedDocuments[] = $this->formatDocumentResponse($document);
            }

            DB::commit();
            return $uploadedDocuments;

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Process a single file upload
     */
    private function processFileUpload(UploadedFile $file, Folder $folder, bool $isArchive, ?string $version): Document
    {
        // Store the file
        $filePath = $file->store('documents', 'private');
        $fileName = $file->getClientOriginalName();
        
        // Handle versioning for archive mode
        if ($isArchive) {
            $existingDoc = Document::where('folder_id', $folder->id)
                ->where('original_name', $fileName)
                ->first();
            
            if ($existingDoc) {
                // Move existing document to obsolete
                $existingDoc->moveToObsolete();
                
                // Create new version
                $newVersion = $version ?: $existingDoc->getNextVersionNumber();
                $fileName = $this->addVersionToFileName($fileName, $newVersion);
            }
        } else {
            // Check for duplicate names
            if (Document::where('folder_id', $folder->id)->where('name', $fileName)->exists()) {
                Storage::disk('private')->delete($filePath);
                throw new \Exception("File '{$fileName}' already exists");
            }
        }

        return Document::create([
            'name' => $fileName,
            'original_name' => $file->getClientOriginalName(),
            'file_path' => $filePath,
            'full_path' => $folder->full_path . '/' . $fileName,
            'folder_id' => $folder->id,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'version' => $version ?: '1.0',
            'status' => 'active',
            'uploaded_by' => Auth::id(),
        ]);
    }

    /**
     * Create folder structure
     */
    public function createFolder(string $name, string $parentPath): Folder
    {
        $parentFolder = Folder::byPath($parentPath)->first();
        
        if (!$parentFolder) {
            throw new \Exception('Parent folder not found');
        }

        $fullPath = $parentFolder->full_path . '/' . $name;
        
        // Check if folder already exists
        if (Folder::byPath($fullPath)->exists()) {
            throw new \Exception('Folder already exists');
        }

        DB::beginTransaction();
        try {
            $folder = Folder::create([
                'name' => $name,
                'full_path' => $fullPath,
                'parent_id' => $parentFolder->id,
                'level' => $parentFolder->level + 1,
                'type' => $this->getFolderType($parentFolder->level + 1),
                'is_user_created' => true
            ]);

            // Create required sub-structure based on level
            $this->createSubStructure($folder);

            DB::commit();
            return $folder;

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Search documents across the system
     */
    public function searchDocuments(string $query, ?string $folderPath = null, ?string $status = null): array
    {
        $documentsQuery = Document::with('folder')->search($query);

        if ($folderPath) {
            $folder = Folder::byPath($folderPath)->first();
            if ($folder) {
                $documentsQuery->where('folder_id', $folder->id);
            }
        }

        if ($status) {
            $documentsQuery->where('status', $status);
        }

        $documents = $documentsQuery->orderBy('name')->limit(100)->get();

        return $documents->map(function ($doc) {
            return $this->formatDocumentResponse($doc);
        })->toArray();
    }

    /**
     * Get folder hierarchy
     */
    public function getFolderHierarchy(?int $parentId = null): array
    {
        return Folder::getHierarchy($parentId);
    }

    /**
     * Get folder contents
     */
    public function getFolderContents(string $path): array
    {
        $folder = Folder::byPath($path)->with(['children', 'activeDocuments'])->first();
        
        if (!$folder) {
            throw new \Exception('Folder not found');
        }

        $contents = array_merge(
            $folder->children->map(function ($child) {
                return [
                    'id' => $child->id,
                    'name' => $child->name,
                    'full_path' => $child->full_path,
                    'type' => 'folder',
                    'level' => $child->level,
                    'is_user_created' => $child->is_user_created,
                    'is_protected' => $child->isProtected()
                ];
            })->toArray(),
            $folder->activeDocuments->map(function ($doc) {
                return $this->formatDocumentResponse($doc, 'file');
            })->toArray()
        );

        return [
            'folder' => [
                'id' => $folder->id,
                'name' => $folder->name,
                'full_path' => $folder->full_path,
                'level' => $folder->level,
                'can_upload_files' => $folder->canUploadFiles(),
                'is_protected' => $folder->isProtected()
            ],
            'contents' => $contents
        ];
    }

    /**
     * Bulk delete documents
     */
    public function bulkDeleteDocuments(array $documentIds): bool
    {
        $documents = Document::whereIn('id', $documentIds)->get();
        
        DB::beginTransaction();
        try {
            foreach ($documents as $document) {
                $this->deleteDocumentFiles($document);
                $document->delete();
            }

            DB::commit();
            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Create ZIP file from documents
     */
    public function createDocumentZip(array $documentIds): string
    {
        $documents = Document::whereIn('id', $documentIds)->get();
        $zipPath = storage_path('app/temp/' . Str::uuid() . '.zip');
        
        // Ensure temp directory exists
        if (!file_exists(dirname($zipPath))) {
            mkdir(dirname($zipPath), 0755, true);
        }

        $zip = new \ZipArchive();
        if ($zip->open($zipPath, \ZipArchive::CREATE) !== TRUE) {
            throw new \Exception('Cannot create ZIP file');
        }

        foreach ($documents as $document) {
            if (Storage::disk('private')->exists($document->file_path)) {
                $filePath = Storage::disk('private')->path($document->file_path);
                $zip->addFile($filePath, $document->name);
            }
        }

        $zip->close();
        
        return $zipPath;
    }

    /**
     * Helper methods
     */
    private function addVersionToFileName(string $fileName, string $version): string
    {
        $pathInfo = pathinfo($fileName);
        $name = $pathInfo['filename'];
        $extension = isset($pathInfo['extension']) ? '.' . $pathInfo['extension'] : '';
        
        return $name . '_v' . $version . $extension;
    }

    private function getFolderType(int $level): string
    {
        return match($level) {
            1 => 'root',
            2 => 'category',
            3 => 'process',
            4 => 'document_type',
            5 => 'confidentiality',
            default => 'custom'
        };
    }

    private function createSubStructure(Folder $folder): void
    {
        $docTypes = ['Procédure', 'Charte', 'Guide', 'Politique', 'Enregistrement'];
        $confidentialityLevels = ['Interne', 'Public', 'Restreint', 'Confidentiel', 'Strictement Confidentiel'];

        switch ($folder->level) {
            case 3: // Process level - create document types and confidentiality levels
                foreach ($docTypes as $docType) {
                    $docTypeFolder = Folder::create([
                        'name' => $docType,
                        'full_path' => $folder->full_path . '/' . $docType,
                        'parent_id' => $folder->id,
                        'level' => 4,
                        'type' => 'document_type'
                    ]);

                    foreach ($confidentialityLevels as $levelName) {
                        Folder::create([
                            'name' => $levelName,
                            'full_path' => $docTypeFolder->full_path . '/' . $levelName,
                            'parent_id' => $docTypeFolder->id,
                            'level' => 5,
                            'type' => 'confidentiality'
                        ]);
                    }
                }
                break;

            case 4: // Document type level - create confidentiality levels
                foreach ($confidentialityLevels as $levelName) {
                    Folder::create([
                        'name' => $levelName,
                        'full_path' => $folder->full_path . '/' . $levelName,
                        'parent_id' => $folder->id,
                        'level' => 5,
                        'type' => 'confidentiality'
                    ]);
                }
                break;

            default:
                // No substructure needed for other levels
                break;
        }
    }

    private function formatDocumentResponse(Document $document, string $type = 'document'): array
    {
        return [
            'id' => $document->id,
            'name' => $document->name,
            'full_path' => $document->full_path,
            'size' => $document->formatted_size,
            'lastModified' => $document->updated_at->format('Y-m-d'),
            'version' => $document->version,
            'status' => $document->status,
            'folder_path' => $document->folder->full_path,
            'type' => $type
        ];
    }

    private function deleteDocumentFiles(Document $document): void
    {
        if (Storage::disk('private')->exists($document->file_path)) {
            Storage::disk('private')->delete($document->file_path);
        }

        foreach ($document->versions as $version) {
            if (Storage::disk('private')->exists($version->file_path)) {
                Storage::disk('private')->delete($version->file_path);
            }
        }
    }
}
