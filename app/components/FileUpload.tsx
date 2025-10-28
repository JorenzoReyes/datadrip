'use client';

import { useState, useRef } from 'react';

interface FileUploadProps {
  onUpload: (urls: string[]) => void;
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // in MB
}

export default function FileUpload({ 
  onUpload, 
  multiple = true, 
  accept = 'image/*,video/*',
  maxFiles = 10,
  maxSize = 50
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);

    const fileArray = Array.from(files);
    
    // Validate file count
    if (fileArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      setUploading(false);
      return;
    }

    // Validate file sizes
    const oversizedFiles = fileArray.filter(file => file.size > maxSize * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError(`Files exceed ${maxSize}MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      setUploading(false);
      return;
    }

    const uploadPromises = fileArray.map(async (file, index) => {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || `Upload failed for ${file.name}`);
        }

        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        return result.url;
      } catch (error) {
        console.error(`Upload error for ${file.name}:`, error);
        throw error;
      }
    });

    try {
      const urls = await Promise.all(uploadPromises);
      onUpload(urls);
      setUploadProgress({});
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setError('Some files failed to upload. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="w-full">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        <div className="space-y-2">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          
          <div className="text-sm text-gray-600">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="font-medium text-primary-600 hover:text-primary-500"
              disabled={uploading}
            >
              Click to upload
            </button>
            {' '}or drag and drop
          </div>
          
          <p className="text-xs text-gray-500">
            {multiple ? `Up to ${maxFiles} files` : 'Single file'} • Max {maxSize}MB each
          </p>
          <p className="text-xs text-gray-500">
            Images: JPEG, PNG, GIF, WebP • Videos: MP4, WebM, MOV
          </p>
        </div>

        {uploading && (
          <div className="mt-4 space-y-2">
            <div className="text-sm text-gray-600">Uploading...</div>
            {Object.entries(uploadProgress).map(([fileName, progress]) => (
              <div key={fileName} className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
