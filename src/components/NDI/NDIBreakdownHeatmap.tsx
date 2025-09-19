"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BreakdownRow } from "@/types/ndi";
import { cn } from "@/lib/utils";

interface NDIBreakdownHeatmapProps {
  data: BreakdownRow[];
  className?: string;
}

export function NDIBreakdownHeatmap({ data, className }: NDIBreakdownHeatmapProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const formatValue = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(1);
  };

  const getHeatmapColor = (value: number, min: number, max: number) => {
    if (min === max) return "bg-gray-100";
    
    const ratio = (value - min) / (max - min);
    
    if (ratio < 0.2) return "bg-red-100 text-red-800";
    if (ratio < 0.4) return "bg-orange-100 text-orange-800";
    if (ratio < 0.6) return "bg-yellow-100 text-yellow-800";
    if (ratio < 0.8) return "bg-green-100 text-green-800";
    return "bg-green-200 text-green-900";
  };

  const filteredData = data.filter(row => {
    const searchLower = searchTerm.toLowerCase();
    return (
      row.groupA?.toLowerCase().includes(searchLower) ||
      row.groupB?.toLowerCase().includes(searchLower) ||
      row.groupC?.toLowerCase().includes(searchLower)
    );
  });

  const values = data.map(row => row.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  const exportToCSV = () => {
    const headers = ['Period', 'Kategori', 'Underkategori', 'Delområde', 'NDI', 'Antal svar'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        row.period,
        row.groupA || '',
        row.groupB || '',
        row.groupC || '',
        row.value,
        row.weight || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ndi-breakdown-${data[0]?.period || 'data'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Search and Export Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Sök i kategorier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-stroke dark:border-dark-3 rounded-lg bg-white dark:bg-gray-dark text-dark dark:text-white placeholder-dark-5 dark:placeholder-dark-6 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Exportera CSV
        </button>
      </div>

      {/* Heatmap Table */}
      <div className="border border-stroke dark:border-dark-3 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kategori</TableHead>
              {data.some(row => row.groupB) && <TableHead>Underkategori</TableHead>}
              {data.some(row => row.groupC) && <TableHead>Delområde</TableHead>}
              <TableHead className="text-right">NDI</TableHead>
              {data.some(row => row.weight) && <TableHead className="text-right">Antal svar</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {row.groupA || '-'}
                </TableCell>
                {data.some(r => r.groupB) && (
                  <TableCell>
                    {row.groupB || '-'}
                  </TableCell>
                )}
                {data.some(r => r.groupC) && (
                  <TableCell>
                    {row.groupC || '-'}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <span className={cn(
                    "inline-flex items-center px-2 py-1 rounded-md text-sm font-medium",
                    getHeatmapColor(row.value, minValue, maxValue)
                  )}>
                    {formatValue(row.value)}
                  </span>
                </TableCell>
                {data.some(r => r.weight) && (
                  <TableCell className="text-right text-dark-6 dark:text-dark-4">
                    {row.weight ? row.weight.toLocaleString('sv-SE') : '-'}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-dark-6 dark:text-dark-4">Färgskala:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 rounded"></div>
          <span className="text-dark-6 dark:text-dark-4">Låg</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 rounded"></div>
          <span className="text-dark-6 dark:text-dark-4">Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 rounded"></div>
          <span className="text-dark-6 dark:text-dark-4">Hög</span>
        </div>
      </div>
    </div>
  );
}
