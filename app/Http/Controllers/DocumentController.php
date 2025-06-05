<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Folder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;
use Illuminate\Support\Facades\Auth;

class DocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Document::with('folder');

        if ($request->has('folder_path')) {
            $folder = Folder::byPath($request->folder_path)->first();
            if ($folder) {
                $query->where('folder_id', $folder->id);
            }
        }

        if ($request->has('search')) {
            $query->search($request->search);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $documents = $query->orderBy('name')->get();

        return response()->json($documents->map(function ($doc) {
            return [
                'id' => $doc->id,
                'name' => $doc->name,
                'full_path' => $doc->full_path,
                'size' => $doc->formatted_size,
                'lastModified' => $doc->updated_at->format('Y-m-d'),
                'version' => $doc->version,
                'status' => $doc->status,
                'folder_path' => $doc->folder->full_path
            ];
        }));
    }

    private function isAllowedMimeType(string $mimeType): bool
    {
        return in_array($mimeType, [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'files' => 'required|array',
            'files.*' => 'file|max:50000', // 50MB max
            'folder_path' => 'required|string',
            'is_archive' => 'boolean',
            'version' => 'string|nullable|regex:/^\d+\.\d+$/' // Ensures version format like "1.0"
        ]);

        $folder = Folder::byPath($request->folder_path)->first();
        
        if (!$folder) {
            return response()->json(['error' => 'Folder not found'], 404);
        }

        if (!$folder->canUploadFiles()) {
            return response()->json(['error' => 'Cannot upload files to this folder'], 403);
        }

        $uploadedDocuments = [];

        DB::beginTransaction();
        try {
            foreach ($request->file('files') as $file) {
                if (!$this->isAllowedMimeType($file->getMimeType())) {
                    return response()->json(['error' => 'File type not allowed'], 422);
                }

                // Store the file
                $filePath = $file->store('documents', 'private');
                
                $fileName = $file->getClientOriginalName();
                
                // Handle versioning for archive mode
                if ($request->is_archive) {
                    $existingDoc = Document::where('folder_id', $folder->id)
                        ->where('original_name', $fileName)
                        ->first();
                    
                    if ($existingDoc) {
                        // Move existing document to obsolete
                        $existingDoc->moveToObsolete();
                        
                        // Create new version
                        $version = $request->version ?: $existingDoc->getNextVersionNumber();
                        $fileName = $this->addVersionToFileName($fileName, $version);
                    }
                } else {
                    // Check for duplicate names
                    if (Document::where('folder_id', $folder->id)->where('name', $fileName)->exists()) {
                        Storage::disk('private')->delete($filePath);
                        throw new \Exception("File '{$fileName}' already exists");
                    }
                }

                $document = Document::create([
                    'name' => $fileName,
                    'original_name' => $file->getClientOriginalName(),
                    'file_path' => $filePath,
                    'full_path' => $folder->full_path . '/' . $fileName,
                    'folder_id' => $folder->id,
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                    'version' => $request->version ?: '1.0',
                    'status' => 'active',
                    'uploaded_by' => Auth::id(),
                ]);

                $uploadedDocuments[] = [
                    'id' => $document->id,
                    'name' => $document->name,
                    'size' => $document->formatted_size,
                    'lastModified' => $document->updated_at->format('Y-m-d')
                ];
            }

            DB::commit();
            return response()->json($uploadedDocuments, 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 409);
        }
    }

    public function update(Request $request, Document $document): JsonResponse
    {
        $request->validate([
            'name' => 'string|max:255'
        ]);

        if ($request->has('name')) {
            // Check for duplicate names in the same folder
            $exists = Document::where('folder_id', $document->folder_id)
                ->where('name', $request->name)
                ->where('id', '!=', $document->id)
                ->exists();
            
            if ($exists) {
                return response()->json(['error' => 'File name already exists'], 409);
            }

            $oldFullPath = $document->full_path;
            $newFullPath = dirname($oldFullPath) . '/' . $request->name;

            $document->update([
                'name' => $request->name,
                'full_path' => $newFullPath
            ]);
        }

        return response()->json($document);
    }

    public function destroy(Document $document): JsonResponse
    {
        // Delete the physical file
        if (Storage::disk('private')->exists($document->file_path)) {
            Storage::disk('private')->delete($document->file_path);
        }

        // Delete all versions
        foreach ($document->versions as $version) {
            if (Storage::disk('private')->exists($version->file_path)) {
                Storage::disk('private')->delete($version->file_path);
            }
        }

        $document->delete();

        return response()->json(['message' => 'Document deleted successfully']);
    }

    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'query' => 'required|string|min:2',
            'folder_path' => 'string|nullable',
            'status' => 'in:active,obsolete,archived'
        ]);

        $query = Document::with('folder')->search($request->query);

        if ($request->has('folder_path')) {
            $folder = Folder::byPath($request->folder_path)->first();
            if ($folder) {
                $query->where('folder_id', $folder->id);
            }
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $documents = $query->orderBy('name')->limit(50)->get();

        return response()->json($documents->map(function ($doc) {
            return [
                'id' => $doc->id,
                'name' => $doc->name,
                'full_path' => $doc->full_path,
                'size' => $doc->formatted_size,
                'lastModified' => $doc->updated_at->format('Y-m-d'),
                'version' => $doc->version,
                'status' => $doc->status,
                'folder_path' => $doc->folder->full_path
            ];
        }));
    }

    public function download(Request $request): JsonResponse|BinaryFileResponse 
    {
        $request->validate([
            'document_ids' => 'required|array',
            'document_ids.*' => 'exists:documents,id'
        ]);

        $documents = Document::whereIn('id', $request->document_ids)->get();

        if ($documents->count() === 1) {
            $document = $documents->first();
            if (!Storage::disk('private')->exists($document->file_path)) {
                return response()->json(['error' => 'File not found'], 404);
            }

            return response()->download(
                Storage::disk('private')->path($document->file_path),
                $document->name
            );
        }

        // Multiple files - create ZIP
        $zipPath = $this->createZipFromDocuments($documents);
        
        return response()->download($zipPath, 'documents.zip')->deleteFileAfterSend();
    }

    public function bulkDelete(Request $request): JsonResponse
    {
        $request->validate([
            'document_ids' => 'required|array',
            'document_ids.*' => 'exists:documents,id'
        ]);

        $documents = Document::whereIn('id', $request->document_ids)->get();
        
        DB::beginTransaction();
        try {
            foreach ($documents as $document) {
                // Delete physical files
                if (Storage::disk('private')->exists($document->file_path)) {
                    Storage::disk('private')->delete($document->file_path);
                }

                // Delete version files
                foreach ($document->versions as $version) {
                    if (Storage::disk('private')->exists($version->file_path)) {
                        Storage::disk('private')->delete($version->file_path);
                    }
                }

                $document->delete();
            }

            DB::commit();
            return response()->json(['message' => 'Documents deleted successfully']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to delete documents'], 500);
        }
    }

    public function archive(Document $document): JsonResponse
    {
        $success = $document->moveToObsolete();
        
        if ($success) {
            return response()->json(['message' => 'Document archived successfully']);
        }

        return response()->json(['error' => 'Failed to archive document'], 500);
    }

    public function preview(Document $document): JsonResponse
    {
        if (!Storage::disk('private')->exists($document->file_path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        // For now, just return file info - you can extend this for actual preview
        return response()->json([
            'id' => $document->id,
            'name' => $document->name,
            'mime_type' => $document->mime_type,
            'size' => $document->formatted_size,
            'version' => $document->version,
            'can_preview' => in_array($document->mime_type, [
                'application/pdf',
                'image/jpeg',
                'image/png',
                'text/plain'
            ])
        ]);
    }

    private function addVersionToFileName(string $fileName, string $version): string
    {
        $pathInfo = pathinfo($fileName);
        $name = $pathInfo['filename'];
        $extension = isset($pathInfo['extension']) ? '.' . $pathInfo['extension'] : '';
        
        return $name . '_v' . $version . $extension;
    }

    private function createZipFromDocuments($documents): string
    {
        $zipPath = storage_path('app/temp/' . Str::uuid() . '.zip');
        
        // Ensure temp directory exists
        if (!file_exists(dirname($zipPath))) {
            if (!mkdir(dirname($zipPath), 0755, true)) {
                throw new \Exception('Cannot create temp directory');
            }
        }

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE) !== TRUE) {
            throw new \Exception('Cannot create ZIP file');
        }

        try {
            foreach ($documents as $document) {
                if (Storage::disk('private')->exists($document->file_path)) {
                    $filePath = Storage::disk('private')->path($document->file_path);
                    if (!$zip->addFile($filePath, $document->name)) {
                        throw new \Exception("Failed to add file {$document->name} to ZIP");
                    }
                }
            }
            
            if (!$zip->close()) {
                throw new \Exception('Failed to close ZIP file');
            }
            
            return $zipPath;
        } catch (\Exception $e) {
            $zip->close();
            if (file_exists($zipPath)) {
                unlink($zipPath);
            }
            throw $e;
        }
    }
}
