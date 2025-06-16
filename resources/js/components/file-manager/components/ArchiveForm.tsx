import React, { useState, useRef, useEffect } from 'react';
import { Archive, File, X, Plus, Check, ArrowRight } from 'lucide-react';

// Helper functions
function getBaseName(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx > 0 ? fileName.slice(0, idx) : fileName;
}

function parseVersionParts(version: string): number[] {
  return version.split('.').map(p => {
    const n = parseInt(p, 10);
    return isNaN(n) ? 0 : n;
  });
}

function getNextVersion(fileName: string): string {
  const base = getBaseName(fileName);
  const m = base.match(/_v([\d.]+)$/i);
  if (!m) {
    return '1';
  }
  const parts = parseVersionParts(m[1]);
  parts[parts.length - 1]++;
  return parts.join('.');
}

function getPreviewName(fileName: string, version: string): string {
  const idx = fileName.lastIndexOf('.');
  const ext = idx > 0 ? fileName.slice(idx) : '';
  const cleanBase = getBaseName(fileName).replace(/_v[\d.]+$/i, '');
  return `${cleanBase}_v${version}${ext}`;
}

interface ArchiveFormProps {
  currentFileName: string;
  onClose: () => void;
  onSubmit: (file: File, version: string) => void;
}

export const ArchiveForm: React.FC<ArchiveFormProps> = ({ 
  currentFileName, 
  onClose,
  onSubmit 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionNumber, setVersionNumber] = useState(() => 
    getNextVersion(currentFileName)
  );
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate version format
  const validateVersion = (version: string): boolean => {
    const versionRegex = /^\d+(\.\d+)*$/;
    if (!versionRegex.test(version)) return false;
    const parts = version.split('.').map(Number);
    return parts.every(part => !isNaN(part) && part >= 0);
  };

  const validateFile = (file: File): boolean => {
    const currentExt = currentFileName.split('.').pop()?.toLowerCase();
    const newExt = file.name.split('.').pop()?.toLowerCase();

    if (currentExt !== newExt) {
      setError(`Le nouveau fichier doit avoir la même extension (.${currentExt})`);
      return false;
    }

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

    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(newExt || '')) {
      setError(`Le type de fichier "${file.name}" n'est pas supporté. Formats acceptés: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT`);
      return false;
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setError('Le fichier est trop volumineux (max: 100MB)');
      return false;
    }

    setError(null);
    return true;
  };

  // Updated to use the new preview name function
  const previewName = (): string => {
    return getPreviewName(currentFileName, versionNumber || getNextVersion(currentFileName));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleVersionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setVersionNumber(value);
    
    if (value && !validateVersion(value)) {
      setError('Le numéro de version doit être composé de nombres séparés par des points (ex: 1, 2.1, 3.1.4)');
    } else {
      setError(null);
    }
  };

  const handleArchive = async () => {
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    let finalVersion = versionNumber.trim();
    if (!finalVersion) {
      finalVersion = getNextVersion(currentFileName);
    }

    if (!validateVersion(finalVersion)) {
      setError('Format de version invalide');
      return;
    }
    
    setIsArchiving(true);
    setError(null);
    
    try {
      await onSubmit(selectedFile, finalVersion);
    } catch (error) {
      console.error('Archive error:', error);
      setError('Une erreur est survenue lors de l\'archivage');
      setIsArchiving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-amber-600 to-orange-600 rounded-t-lg p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-1">Archiver Fichier</h2>
              <p className="text-amber-100 text-sm">Téléchargez une nouvelle version de votre fichier</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Current File Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 bg-amber-100 rounded">
                <File className="w-4 h-4 text-amber-600" />
              </div>
              <span className="font-medium text-amber-800">Fichier Actuel</span>
            </div>
            <p className="text-amber-700 font-mono text-sm bg-white/70 p-2 rounded">
              {currentFileName}
            </p>
          </div>

          {/* Version Input */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nouveau Numéro de Version
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Format: nombres séparés par des points (ex: 1, 2.1, 3.1.4). Laissez vide pour auto-incrémenter.
              </p>
            </div>
            <input
              type="text"
              value={versionNumber}
              onChange={handleVersionChange}
              placeholder={`Auto-incrémenté: ${versionNumber || 'ex: 1.2.3'}`}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
            />
            {versionNumber.trim() && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-700 text-sm">Aperçu du Nouveau Nom</span>
                </div>
                <p className="text-green-700 font-mono text-sm bg-white/70 p-2 rounded">
                  {previewName()}
                </p>
              </div>
            )}
          </div>

          {/* File Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-amber-400 bg-amber-50'
                : 'border-gray-300 hover:border-amber-400 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className={`p-3 rounded-full transition-all ${
                isDragOver ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <Plus className={`w-8 h-8 transition-colors ${
                  isDragOver ? 'text-blue-600' : 'text-gray-500'
                }`} />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-gray-800">
                  {isDragOver ? 'Déposez votre nouveau fichier' : 'Nouvelle Version du Fichier'}
                </p>
                <p className="text-sm text-gray-500">Glissez et déposez ou cliquez pour sélectionner</p>
              </div>
            </div>
          </div>

          {/* Selected File */}
          {selectedFile && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-800 mb-3">Fichier Sélectionné</h3>
              <div className="flex items-center justify-between p-3 bg-white rounded border">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-100 rounded">
                    <File className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Archive Flow Visualization */}
          {selectedFile && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-800 mb-3">Processus d'Archivage</h3>
              <div className="flex items-center justify-between text-xs">
                <div className="text-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mb-1"></div>
                  <p className="text-gray-600">Fichier Actuel</p>
                  <p className="font-mono text-xs text-gray-500 max-w-[100px] truncate">{currentFileName}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className="text-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mx-auto mb-1"></div>
                  <p className="text-gray-600">Vers Obsolète</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className="text-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mb-1"></div>
                  <p className="text-gray-600">Nouveau Fichier</p>
                  <p className="font-mono text-xs text-gray-500 max-w-[100px] truncate">{previewName()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleArchive}
              disabled={!selectedFile || isArchiving}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                !selectedFile || isArchiving
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow-md'
              }`}
            >
              {isArchiving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Archivage en cours...
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  Archiver Fichier
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
  );
}