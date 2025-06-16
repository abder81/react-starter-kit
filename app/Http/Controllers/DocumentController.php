<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Folder;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use ZipArchive;

class DocumentController extends Controller
{
    /**
     * List/filter documents
     */
    public function index(Request $request): JsonResponse
    {
        $query = Document::query();

        if ($request->has('folder_path')) {
            $folder = Folder::byPath($request->folder_path)->first();
            if ($folder) {
                $query->where('folder_id', $folder->id);
            }
        }

        if ($request->has('search')) {
            $term = $request->search;
            $query->where('name', 'like', "%{$term}%");
        }

        $docs = $query->orderBy('name')->get();

        return response()->json($docs->map(fn($d) => [
            'id' => $d->id,
            'name' => $d->name,
            'full_path' => $d->full_path,
            'size' => number_format($d->size/1024/1024, 1) . ' MB',
            'lastModified' => $d->updated_at->format('Y-m-d'),
            'folder_path' => $d->folder->full_path
        ]));
    }

    /**
     * View/display a document (for PDF viewing)
     */
    public function view(Request $request, string $path): Response
    {
        try {
            Log::info('Document view request received', [
                'requested_path' => $path,
                'decoded_path' => urldecode($path),
                'headers' => $request->headers->all(),
                'storage_path' => storage_path('app/private'),
                'documents_path' => storage_path('app/private/documents')
            ]);

            // Decode the path since it comes URL-encoded
            $decodedPath = urldecode($path);
            
            // Find the document by full_path
            $document = Document::where('full_path', $decodedPath)->first();
            
            if (!$document) {
                Log::error('Document not found in database', [
                    'path' => $decodedPath,
                    'query' => Document::where('full_path', $decodedPath)->toSql(),
                    'all_documents' => Document::select('id', 'name', 'full_path', 'file_path')->get()->toArray()
                ]);
                abort(404, 'Document not found');
            }

            Log::info('Document found in database', [
                'document_id' => $document->id,
                'name' => $document->name,
                'file_path' => $document->file_path,
                'full_path' => $document->full_path,
                'mime_type' => $document->mime_type,
                'storage_path' => Storage::disk('private')->path($document->file_path)
            ]);

            // Check if file exists in storage
            $storagePath = Storage::disk('private')->path($document->file_path);
            $fileExists = file_exists($storagePath);
            $isReadable = is_readable($storagePath);
            $fileSize = $fileExists ? filesize($storagePath) : 0;

            Log::info('Storage check details', [
                'storage_path' => $storagePath,
                'exists' => $fileExists,
                'is_readable' => $isReadable,
                'file_size' => $fileSize,
                'file_permissions' => $fileExists ? substr(sprintf('%o', fileperms($storagePath)), -4) : null,
                'directory_permissions' => substr(sprintf('%o', fileperms(dirname($storagePath))), -4)
            ]);

            if (!Storage::disk('private')->exists($document->file_path)) {
                Log::error('File not found in storage', [
                    'document_id' => $document->id,
                    'file_path' => $document->file_path,
                    'full_path' => $document->full_path,
                    'storage_path' => $storagePath,
                    'storage_exists' => $fileExists,
                    'is_readable' => $isReadable,
                    'file_size' => $fileSize,
                    'directory_contents' => scandir(dirname($storagePath))
                ]);
                abort(404, 'File not found in storage');
            }

            // Get the file path and mime type
            $filePath = Storage::disk('private')->path($document->file_path);
            $mimeType = $document->mime_type ?: 'application/octet-stream';

            Log::info('Preparing to serve file', [
                'file_path' => $filePath,
                'mime_type' => $mimeType,
                'file_size' => filesize($filePath),
                'is_readable' => is_readable($filePath),
                'content_type' => mime_content_type($filePath)
            ]);

            // For PDFs, we want to display them inline
            if ($mimeType === 'application/pdf') {
                Log::info('Serving PDF inline', [
                    'document_id' => $document->id,
                    'name' => $document->name,
                    'file_size' => filesize($filePath)
                ]);
                
                return response()->file($filePath, [
                    'Content-Type' => 'application/pdf',
                    'Content-Disposition' => 'inline; filename="' . $document->name . '"',
                    'Cache-Control' => 'private, max-age=0, must-revalidate',
                    'Content-Length' => filesize($filePath)
                ]);
            }

            // For other file types, you might want to handle them differently
            // For now, we'll serve them as downloads
            Log::info('Serving file as download', [
                'document_id' => $document->id,
                'name' => $document->name,
                'mime_type' => $mimeType
            ]);
            
            return response()->download($filePath, $document->name);
        } catch (\Exception $e) {
            Log::error('Error viewing document', [
                'path' => $path,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
                'storage_path' => storage_path('app/private'),
                'documents_path' => storage_path('app/private/documents')
            ]);
            abort(500, 'Error viewing document: ' . $e->getMessage());
        }
    }

    /**
     * Upload files
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'files' => 'required|array',
            'files.*' => 'file|max:50000',
            'folder_path' => 'required|string'
        ]);

        $folder = Folder::byPath($request->folder_path)->firstOrFail();

        if (!$folder->canUploadFiles()) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $uploaded = [];
        DB::beginTransaction();

        try {
            foreach ($request->file('files') as $file) {
                if (!in_array($file->getMimeType(), [
                    // PDF
                    'application/pdf',
                    'application/x-pdf',
                    // Word
                    'application/msword', // DOC
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
                    'application/x-msword',
                    'application/x-vnd.openxmlformats-officedocument.wordprocessingml.document',
                    // Excel
                    'application/vnd.ms-excel', // XLS
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
                    'application/x-vnd.ms-excel',
                    'application/x-vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    // PowerPoint
                    'application/vnd.ms-powerpoint', // PPT
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
                    'application/x-vnd.ms-powerpoint',
                    'application/x-vnd.openxmlformats-officedocument.presentationml.presentation',
                    // Text
                    'text/plain', // TXT
                    // Images (keeping existing support)
                    'image/jpeg',
                    'image/png'
                ])) {
                    return response()->json(['error' => 'Invalid type'], 422);
                }

                // Generate a unique filename while preserving the original extension
                $originalName = $file->getClientOriginalName();
                $extension = pathinfo($originalName, PATHINFO_EXTENSION);
                $uniqueName = uniqid() . '_' . $originalName;
                $path = 'documents/' . $uniqueName;

                // Store the file
                $file->storeAs('documents', $uniqueName, 'private');

                // Check for duplicates
                if (Document::where('folder_id', $folder->id)->where('name', $originalName)->exists()) {
                    Storage::disk('private')->delete($path);
                    throw new \Exception("File '$originalName' already exists in this folder");
                }

                // Create document record
                $doc = Document::create([
                    'name' => $originalName,
                    'file_path' => $path,
                    'full_path' => $folder->full_path . '/' . $originalName,
                    'folder_id' => $folder->id,
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize()
                ]);

                $uploaded[] = [
                    'id' => $doc->id,
                    'name' => $doc->name,
                    'full_path' => $doc->full_path,
                    'size' => number_format($doc->size/1024/1024, 1) . ' MB',
                    'lastModified' => $doc->updated_at->format('Y-m-d'),
                    'mime_type' => $doc->mime_type
                ];
            }

            DB::commit();
            return response()->json($uploaded, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('File upload failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => $e->getMessage()], 409);
        }
    }

    /**
     * Rename document
     */
    public function update(Request $request, Document $document): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255'
        ]);

        try {
            DB::beginTransaction();

            // Check for duplicates in same folder
            if (Document::where('folder_id', $document->folder_id)
                ->where('name', $request->name)
                ->where('id', '!=', $document->id)
                ->exists()) {
                return response()->json([
                    'error' => 'A file with this name already exists in this folder'
                ], 409);
            }

            // Update document
            $newFullPath = $document->folder->full_path . '/' . $request->name;
            $document->update([
                'name' => $request->name,
                'full_path' => $newFullPath
            ]);

            DB::commit();

            return response()->json([
                'id' => $document->id,
                'name' => $document->name,
                'full_path' => $document->full_path,
                'size' => number_format($document->size/1024/1024, 1) . ' MB',
                'lastModified' => $document->updated_at->format('Y-m-d'),
                'folder_path' => $document->folder->full_path
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Failed to rename file: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Archive a document and upload a new version.
     */
    public function archive(Request $request, Document $document): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:100000', // 100MB max
            'version' => 'required|string|max:50',
        ]);

        DB::beginTransaction();
        try {
            $file = $request->file('file');
            $version = $request->input('version');
            $originalFolder = $document->folder;

            if (!$originalFolder) {
                throw new \Exception('Original document folder could not be found.');
            }

            // 1. Generate new name and path for the new document version
            $originalName = $document->name;
            $extension = pathinfo($originalName, PATHINFO_EXTENSION);
            $baseName = pathinfo($originalName, PATHINFO_FILENAME);
            $baseName = preg_replace('/_v[\d\.]+$/i', '', $baseName); // Remove old version suffix
            $newName = $baseName . '_v' . $version . ($extension ? '.' . $extension : '');
            $newFullPath = $originalFolder->full_path . '/' . $newName;

            if (Document::where('folder_id', $originalFolder->id)->where('name', $newName)->exists()) {
                throw new \Exception("A file named '{$newName}' already exists.");
            }

            // 2. Store the new file in the private storage
            $uniqueFileName = uniqid() . '_' . $newName;
            $newFilePath = $file->storeAs('documents', $uniqueFileName, 'private');

            // 3. Create the new document record in the database
            $newDocument = Document::create([
                'name' => $newName,
                'file_path' => $newFilePath,
                'full_path' => $newFullPath,
                'folder_id' => $originalFolder->id,
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);

            // 4. Find the 'Obsolete' root folder
            $obsoleteFolder = Folder::where('name', 'Obsolete')
                ->whereNull('parent_id')
                ->firstOrFail();

            // 5. Create the exact same folder structure under Obsolete
            $pathParts = explode('/', $document->full_path);
            array_shift($pathParts); // Remove 'Original'
            array_pop($pathParts); // Remove filename
            $currentPath = 'Obsolete';
            $currentFolder = $obsoleteFolder;
            $currentLevel = 1;

            // Create each folder in the path with proper types
            foreach ($pathParts as $index => $part) {
                $currentPath .= '/' . $part;
                $parentFolder = $currentFolder;
                $currentLevel++;
                
                // Determine folder type based on level
                $folderType = match($currentLevel) {
                    2 => 'category',
                    3 => 'process',
                    4 => 'document_type',
                    5 => 'confidentiality',
                    default => 'custom'
                };

                $currentFolder = Folder::firstOrCreate(
                    ['name' => $part, 'parent_id' => $parentFolder->id],
                    [
                        'full_path' => $currentPath,
                        'level' => $currentLevel,
                        'type' => $folderType,
                        'is_protected' => true,
                        'is_user_created' => false
                    ]
                );
            }

            // 6. Update the old document with the new path and folder
            $newObsoletePath = 'Obsolete/' . implode('/', $pathParts) . '/' . $document->name;
            $document->update([
                'folder_id' => $currentFolder->id,
                'full_path' => $newObsoletePath,
            ]);

            DB::commit();

            // 7. Return a success response with new and archived file data
            return response()->json([
                'message' => 'File archived successfully',
                'new_file' => $newDocument->toApiArray(),
                'archived_file' => $document->fresh()->toApiArray(),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Archive process failed', [
                'document_id' => $document->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Archive process failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete single document
     */
    public function destroy(Document $document): JsonResponse
    {
        if (Storage::disk('private')->exists($document->file_path)) {
            Storage::disk('private')->delete($document->file_path);
        }

        $document->delete();
        return response()->json(['message' => 'Deleted']);
    }

    /**
     * Bulk delete documents
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        try {
            $request->validate(['document_ids' => 'required|array']);

            Log::info('Bulk delete request received', ['document_ids' => $request->document_ids]);

            $docs = Document::whereIn('id', $request->document_ids)->get();
            Log::info('Found documents to delete', ['count' => $docs->count()]);

            DB::transaction(function() use ($docs) {
                $docs->each(function($d) {
                    Log::info('Processing document for deletion', [
                        'id' => $d->id,
                        'file_path' => $d->file_path
                    ]);
                    
                    if (Storage::disk('private')->exists($d->file_path)) {
                        Storage::disk('private')->delete($d->file_path);
                        Log::info('File deleted from storage', ['path' => $d->file_path]);
                    } else {
                        Log::warning('File not found in storage', ['path' => $d->file_path]);
                    }
                });
                $docs->each->delete();
                Log::info('Documents deleted from database');
            });

            return response()->json(['message' => 'Bulk deleted']);
        } catch (\Exception $e) {
            Log::error('Bulk delete failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Download one or many documents
     */
    public function download(Request $request)
    {
        $ids = $request->input('document_ids', []);
        $docs = Document::whereIn('id', $ids)->get();

        if ($docs->count() === 1) {
            $d = $docs->first();
            return response()->download(
                Storage::disk('private')->path($d->file_path),
                $d->name
            );
        }

        // Create zip for multiple files
        $zipPath = storage_path('app/temp/' . uniqid() . '.zip');
        if (!file_exists(dirname($zipPath))) {
            mkdir(dirname($zipPath), 0755, true);
        }

        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE);

        foreach ($docs as $d) {
            $file = Storage::disk('private')->path($d->file_path);
            if (file_exists($file)) {
                $zip->addFile($file, $d->name);
            }
        }

        $zip->close();

        return response()->download($zipPath, 'docs.zip')->deleteFileAfterSend();
    }

    /**
     * Search documents
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate(['query' => 'required|string|min:2']);

        $term = $request->query('query');
        $docs = Document::where('name', 'like', "%{$term}%")
            ->orderBy('name')
            ->limit(50)
            ->get();

        return response()->json($docs->map(fn($d) => [
            'id' => $d->id,
            'name' => $d->name,
            'full_path' => $d->full_path,
            'size' => number_format($d->size/1024/1024, 1) . ' MB',
            'lastModified' => $d->updated_at->format('Y-m-d')
        ]));
    }
}
