// src/components/PdfViewer.tsx
import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

interface PdfViewerProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  fileName: string;
  onDownload?: (paths: string[]) => void;
}

export default function PdfViewer({ isOpen, onClose, filePath, fileName, onDownload }: PdfViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Helper function to get CSRF token
  const getCsrfToken = () => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  };

  // Fetch PDF file
  useEffect(() => {
    if (!isOpen || !filePath) {
      if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
          setPdfUrl(null);
      }
      return;
    }

    let isMounted = true;

    const fetchPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        const encodedPath = encodeURIComponent(filePath);
        const response = await fetch(`/documents/view/${encodedPath}`, {
          method: 'GET',
          headers: {
            'X-CSRF-TOKEN': getCsrfToken(),
            'Accept': 'application/pdf',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        if (isMounted) {
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
        }
      } catch (err) {
        if(isMounted){
            setError(err instanceof Error ? err.message : 'Failed to load PDF');
        }
      } finally {
        if(isMounted){
            setLoading(false);
        }
      }
    };

    fetchPdf();

    // Cleanup function
    return () => {
      isMounted = false;
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, filePath]); // pdfUrl is removed from dependency array to prevent re-fetching

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsFullscreen(false);
      setError(null);
    }
  }, [isOpen]);

  // Handle fullscreen toggle
  const handleFullscreen = () => setIsFullscreen(prev => !prev);

  // Handle download
  const handleDownload = () => {
    if (onDownload) {
      onDownload([filePath]);
    } else if (pdfUrl) {
      // Fallback: direct download using the blob URL
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
          onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-black bg-opacity-80 flex flex-col items-center justify-center transition-all duration-300 ${isFullscreen ? 'p-0' : 'p-4'}`}>
      <div className={`bg-gray-800 shadow-2xl flex flex-col w-full h-full ${isFullscreen ? 'rounded-none' : 'rounded-lg max-w-6xl max-h-[95vh]'}`}>
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-gray-700 bg-gray-900 text-white">
          <h2 className="text-lg font-semibold truncate" title={fileName}>
            {fileName}
          </h2>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-300 hover:bg-gray-700 rounded-full transition-colors"
              title="Télécharger"
            >
              <Download className="h-5 w-5" />
            </button>

            <button
              onClick={handleFullscreen}
              className="p-2 text-gray-300 hover:bg-gray-700 rounded-full transition-colors"
              title="Plein écran"
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-300 hover:bg-red-500 hover:text-white rounded-full transition-colors"
              title="Fermer (Échap)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-600">
          {loading ? (
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p>Chargement du PDF...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center max-w-md mx-auto p-6 bg-gray-800 rounded-lg">
                <div className="text-red-400 mb-4">
                  <X className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Erreur de chargement
                </h3>
                <p className="text-gray-400 mb-4 break-all">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            </div>
          ) : pdfUrl ? (
            <object data={pdfUrl} type="application/pdf" width="100%" height="100%">
                <div className="flex items-center justify-center h-full text-white bg-gray-700">
                    <p>Votre navigateur ne supporte pas l'affichage des PDFs. Vous pouvez le <a href={pdfUrl} download={fileName} className="text-blue-400 hover:underline">télécharger ici</a>.</p>
                </div>
            </object>
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              <p>Aucun PDF à afficher</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}