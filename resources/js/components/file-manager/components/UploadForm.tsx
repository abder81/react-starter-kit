import React, { useState, useRef } from 'react';
import { Upload, File, X, Plus } from 'lucide-react';

interface UploadFormProps {
  onClose: () => void;
  onSubmit: (files: File[]) => void;
}

export const UploadForm: React.FC<UploadFormProps> = ({ onClose, onSubmit }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      // PDF
      'application/pdf',
      // Word
      'application/msword', // DOC
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      // Excel
      'application/vnd.ms-excel', // XLS
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      // PowerPoint
      'application/vnd.ms-powerpoint', // PPT
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
      // Text
      'text/plain', // TXT
      // Additional MIME types for better compatibility
      'application/x-pdf',
      'application/x-msword',
      'application/x-vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/x-vnd.ms-excel',
      'application/x-vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/x-vnd.ms-powerpoint',
      'application/x-vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    const maxSize = 100 * 1024 * 1024; // 100MB

    // Check file extension as a fallback
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension || '')) {
      setError(`Le type de fichier "${file.name}" n'est pas supporté. Formats acceptés: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT`);
      return false;
    }

    if (file.size > maxSize) {
      setError(`Le fichier "${file.name}" est trop volumineux (max: 100MB)`);
      return false;
    }

    return true;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setError(null);
    
    const files = Array.from(e.dataTransfer.files).filter(validateFile);
    const uniqueFiles = files.filter(file => 
      !selectedFiles.some(existing => existing.name === file.name)
    );

    setSelectedFiles(prev => [...prev, ...uniqueFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files || []).filter(validateFile);
    const uniqueFiles = files.filter(file => 
      !selectedFiles.some(existing => existing.name === file.name)
    );

    setSelectedFiles(prev => [...prev, ...uniqueFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setError(null); // Clear previous errors

    try {
      await onSubmit(selectedFiles);
      // After a successful upload, ensure the loading state is turned off.
      setIsUploading(false);
      // Parent component handles further actions via onSubmit
    } catch (err: any) {
      console.error('Upload error:', err);

      let displayMessage = "An unexpected error occurred during upload.";

      if (err && err.message && typeof err.message === 'string') {
        const firstLineOfError = err.message.split('\n')[0];
        const specificErrorPrefix = "Error: ";
        const indexOfSpecificError = firstLineOfError.indexOf(specificErrorPrefix);

        if (indexOfSpecificError !== -1) {
          displayMessage = firstLineOfError.substring(indexOfSpecificError + specificErrorPrefix.length);
        } else {
          displayMessage = firstLineOfError;
        }
      }

      setError(displayMessage);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-lg p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-1">Télécharger Fichier</h2>
              <p className="text-blue-100 text-sm">Glissez-déposez vos fichiers ou cliquez pour parcourir</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* File Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className={`p-3 rounded-full transition-all ${
                isDragOver ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Plus className={`w-8 h-8 transition-colors ${
                  isDragOver ? 'text-green-600' : 'text-gray-500'
                }`} />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-gray-800">
                  {isDragOver ? 'Déposez vos fichiers ici' : 'Glissez et déposez vos fichiers'}
                </p>
                <p className="text-sm text-gray-500">ou cliquez pour parcourir vos fichiers</p>
                <p className="text-xs text-gray-400">Formats supportés: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT</p>
              </div>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-800">
                  Fichiers sélectionnés ({selectedFiles.length})
                </h3>
                <div className="text-xs text-gray-500">
                  Total: {(selectedFiles.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-blue-100 rounded">
                        <File className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm truncate max-w-xs">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                  selectedFiles.length === 0 || isUploading
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                }`}
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Téléchargement en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Télécharger Fichiers
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}