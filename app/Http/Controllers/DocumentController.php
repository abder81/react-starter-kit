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
                    'application/pdf',
                    'image/jpeg',
                    'image/png',
                    'text/plain'
                ])) {
                    return response()->json(['error' => 'Invalid type'], 422);
                }

                $path = $file->store('documents', 'private');
                $name = $file->getClientOriginalName();

                // duplicate check
                if (Document::where('folder_id', $folder->id)->where('name', $name)->exists()) {
                    Storage::disk('private')->delete($path);
                    throw new \Exception("File '$name' exists");
                }

                $doc = Document::create([
                    'name' => $name,
                    'file_path' => $path,
                    'full_path' => $folder->full_path . '/' . $name,
                    'folder_id' => $folder->id,
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize()
                ]);

                $uploaded[] = [
                    'id' => $doc->id,
                    'name' => $doc->name,
                    'size' => number_format($doc->size/1024/1024, 1) . ' MB',
                    'lastModified' => $doc->updated_at->format('Y-m-d')
                ];
            }

            DB::commit();
            return response()->json($uploaded, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 409);
        }
    }

    /**
     * Rename document
     */
    public function update(Request $request, Document $document): JsonResponse
    {
        $request->validate(['name' => 'required|string|max:255']);

        if (Document::where('folder_id', $document->folder_id)
            ->where('name', $request->name)
            ->where('id', '!=', $document->id)
            ->exists()) {
            return response()->json(['error' => 'Duplicate'], 409);
        }

        $newPath = dirname($document->full_path) . '/' . $request->name;
        $document->update(['name' => $request->name, 'full_path' => $newPath]);

        return response()->json($document);
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