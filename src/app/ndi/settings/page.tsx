"use client";

import { useState } from "react";
import { FileUploader } from "@/components/NDI/FileUploader";
import { FileList } from "@/components/NDI/FileList";
import { ClientOnly } from "@/components/ClientOnly";
import { ImportResult } from "@/types/ndi";

export default function NDISettingsPage() {
  const [uploadResults, setUploadResults] = useState<ImportResult[]>([]);

  const handleUploadComplete = (result: ImportResult) => {
    setUploadResults(prev => [result, ...prev]);
  };

  const handleFileDelete = (fileId: string) => {
    // Remove from upload results if it exists
    setUploadResults(prev => prev.filter(r => r.fileId !== fileId));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          NDI Inställningar
        </h1>
        <p className="text-gray-700 dark:text-gray-300 mt-1">
          Ladda upp och hantera Excel-filer för NDI-data
        </p>
      </div>

      {/* File Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aggregated File Upload */}
        <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-dark dark:text-white mb-4">
            Aggregerad fil
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Ladda upp Excel-fil med aggregerade NDI-värden per kvartal. 
            Filen ska innehålla en rad med &quot;NDI&quot; och kolumner med kvartalsformat (t.ex. 2024Q1, 2024Q2).
          </p>
          <FileUploader
            kind="AGGREGATED"
            onUploadComplete={handleUploadComplete}
          />
        </div>

        {/* Breakdown File Upload */}
        <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-dark dark:text-white mb-4">
            Nedbrytningar
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Ladda upp Excel-fil med nedbrytningar per kategori. 
            Filen ska innehålla kolumner för Period, NDI-värden och kategorier.
          </p>
          <FileUploader
            kind="BREAKDOWN"
            onUploadComplete={handleUploadComplete}
          />
        </div>
      </div>


      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-dark dark:text-white mb-4">
            Senaste uppladdningar
          </h2>
          <div className="space-y-3">
            {uploadResults.slice(0, 5).map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  result.success
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    result.success ? "bg-green-100 dark:bg-green-800" : "bg-red-100 dark:bg-red-800"
                  }`}>
                    {result.success ? (
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
                    <h4 className={`font-semibold ${
                      result.success ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"
                    }`}>
                      {result.success ? 'Uppladdning lyckades' : 'Uppladdning misslyckades'}
                    </h4>
                    
                    {result.success ? (
                      <div className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                        <p>Perioder: {result.validationReport.detectedPeriods.join(', ')}</p>
                        <p>Antal rader: {result.validationReport.rowCount}</p>
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                        <p>{result.error}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File List */}
      <div className="bg-white dark:bg-gray-dark border border-stroke dark:border-dark-3 rounded-lg p-6">
        <ClientOnly fallback={<div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>}>
          <FileList onDelete={handleFileDelete} />
        </ClientOnly>
      </div>
    </div>
  );
}
