"use client";

import { useState, useEffect } from "react";
import { FileUploadResponse } from "@/types/ndi";
import { cn } from "@/lib/utils";

interface FileListProps {
  onDelete?: (fileId: string) => void;
  className?: string;
}

export function FileList({ onDelete, className }: FileListProps) {
  const [files, setFiles] = useState<FileUploadResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDelete = async (fileId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna fil?')) {
      return;
    }

    setDeleting(fileId);
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setFiles(files.filter(f => f.id !== fileId));
        if (onDelete) {
          onDelete(fileId);
        }
      } else {
        alert('Ett fel uppstod vid borttagning av filen');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Ett fel uppstod vid borttagning av filen');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getKindLabel = (kind: string) => {
    return kind === 'AGGREGATED' ? 'Aggregerad' : 'Nedbrytningar';
  };

  const getKindColor = (kind: string) => {
    return kind === 'AGGREGATED' 
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                </div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
          Inga filer uppladdade
        </h3>
        <p className="text-dark-6 dark:text-dark-4">
          Ladda upp Excel-filer för att komma igång
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-dark dark:text-white">
          Uppladdade filer
        </h3>
        <span className="text-sm text-dark-6 dark:text-dark-4">
          {files.length} fil{files.length !== 1 ? 'er' : ''}
        </span>
      </div>

      {files.map((file) => (
        <div key={file.id} className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                  getKindColor(file.kind)
                )}>
                  {getKindLabel(file.kind)}
                </span>
                <span className="text-sm text-dark-6 dark:text-dark-4">
                  {formatDate(file.uploadedAt)}
                </span>
              </div>
              
              <h4 className="font-medium text-dark dark:text-white truncate">
                {file.originalName}
              </h4>
              
              {file.period && (
                <p className="text-sm text-dark-6 dark:text-dark-4 mt-1">
                  Perioder: {file.period}
                </p>
              )}
            </div>

            <button
              onClick={() => handleDelete(file.id)}
              disabled={deleting === file.id}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                "text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {deleting === file.id ? 'Tar bort...' : 'Ta bort'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
