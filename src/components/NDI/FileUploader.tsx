"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { FileUploadResponse, ImportResult } from "@/types/ndi";
import { FileKind } from "@prisma/client";

interface FileUploaderProps {
  kind: FileKind;
  onUploadComplete?: (result: ImportResult) => void;
  className?: string;
}

export function FileUploader({ kind, onUploadComplete, className }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ImportResult | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setUploadResult({
        success: false,
        fileId: '',
        validationReport: {
          fileId: '',
          detectedPeriods: [],
          rowCount: 0,
          ignoredRows: 0,
          columnMapping: {},
          warnings: ['Endast Excel-filer (.xlsx, .xls) stöds']
        },
        error: 'Endast Excel-filer stöds'
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', kind);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(60000) // 60 seconds timeout
      });

      const apiResult = await response.json();
      
      // Check if the response was successful
      if (!response.ok) {
        throw new Error(apiResult.error || 'Uppladdning misslyckades');
      }
      
      // Convert API response to ImportResult format
      const result: ImportResult = {
        success: apiResult.ok || false,
        fileId: apiResult.fileId || '',
        validationReport: {
          fileId: apiResult.fileId || '',
          detectedPeriods: apiResult.periodsDetected || [],
          rowCount: apiResult.rowsInserted || 0,
          ignoredRows: 0,
          columnMapping: {},
          warnings: apiResult.warnings || []
        },
        error: apiResult.error || undefined
      };
      
      setUploadResult(result);
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = 'Ett fel uppstod vid uppladdning';
      
      if (error instanceof Error) {
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
          errorMessage = 'Uppladdningen tog för lång tid. Filen kan vara för stor eller innehålla felaktig data.';
        } else if (error.name === 'AbortError') {
          errorMessage = 'Uppladdningen avbröts.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setUploadResult({
        success: false,
        fileId: '',
        validationReport: {
          fileId: '',
          detectedPeriods: [],
          rowCount: 0,
          ignoredRows: 0,
          columnMapping: {},
          warnings: [errorMessage]
        },
        error: errorMessage
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getKindLabel = () => {
    return kind === 'AGGREGATED' ? 'Aggregerad' : 'Nedbrytningar';
  };

  const getKindDescription = () => {
    return kind === 'AGGREGATED' 
      ? 'Ladda upp aggregerad Excel-fil med NDI-värden per kvartal'
      : 'Ladda upp Excel-fil med nedbrytningar per kategori';
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-stroke dark:border-dark-3 hover:border-primary/50",
          isUploading && "opacity-50 pointer-events-none"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-dark dark:text-white">
              {getKindLabel()}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mt-1">
              {getKindDescription()}
            </p>
          </div>

          <div>
            <label className="cursor-pointer">
              <span className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                {isUploading ? 'Laddar upp...' : 'Välj fil'}
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
            </label>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
              eller dra och släpp filen här
            </p>
          </div>
        </div>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className={cn(
          "mt-4 p-4 rounded-lg border",
          uploadResult.success 
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
              uploadResult.success ? "bg-green-100 dark:bg-green-800" : "bg-red-100 dark:bg-red-800"
            )}>
              {uploadResult.success ? (
                <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            
            <div className="flex-1">
              <h4 className={cn(
                "font-semibold",
                uploadResult.success ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"
              )}>
                {uploadResult.success ? 'Uppladdning lyckades' : 'Uppladdning misslyckades'}
              </h4>
              
              {uploadResult.success ? (
                <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                  <p>Upptäckta perioder: {uploadResult.validationReport.detectedPeriods.join(', ')}</p>
                  <p>Antal rader: {uploadResult.validationReport.rowCount}</p>
                  {uploadResult.validationReport.ignoredRows > 0 && (
                    <p>Ignorerade rader: {uploadResult.validationReport.ignoredRows}</p>
                  )}
                </div>
              ) : (
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{uploadResult.error}</p>
                </div>
              )}
              
              {uploadResult.validationReport?.warnings?.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Varningar:</p>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                    {uploadResult.validationReport?.warnings?.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
