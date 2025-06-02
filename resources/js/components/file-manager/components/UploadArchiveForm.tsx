import React from 'react';
import { UploadForm } from './UploadForm';
import { ArchiveForm } from './ArchiveForm';

interface UploadArchiveFormProps {
  onSubmit: (files: File[], isArchive: boolean, version: string) => void;
  onCancel: () => void;
  currentFileName?: string;
  initialArchiveMode?: boolean;
}

const UploadArchiveForm: React.FC<UploadArchiveFormProps> = ({
  onSubmit,
  onCancel,
  currentFileName = '',
  initialArchiveMode = false
}) => {
  // Separate handlers for upload and archive
  const handleUpload = async (files: File[]) => {
    try {
      await onSubmit(files, false, '1');
      // Form will close via onCancel after successful submission
    } catch (error) {
      console.error('Upload failed:', error);
      // Error handling should be done in parent component
      throw error;
    }
  };

  const handleArchive = async (file: File, version: string) => {
    try {
      await onSubmit([file], true, version);
      // Form will close via onCancel after successful submission
    } catch (error) {
      console.error('Archive failed:', error);
      // Error handling should be done in parent component
      throw error;
    }
  };

  if (initialArchiveMode) {
    return (
      <ArchiveForm
        currentFileName={currentFileName}
        onClose={onCancel}
        onSubmit={handleArchive}
      />
    );
  }

  return (
    <UploadForm
      onClose={onCancel}
      onSubmit={handleUpload}
    />
  );
};

export default UploadArchiveForm;