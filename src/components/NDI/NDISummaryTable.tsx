"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NDISeriesPoint } from "@/types/ndi";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, ArrowDownIcon } from "@/assets/icons";

interface NDISummaryTableProps {
  data: NDISeriesPoint[];
  className?: string;
}

export function NDISummaryTable({ data, className }: NDISummaryTableProps) {
  const formatValue = (value: number | null) => {
    if (value === null) return 'N/A';
    return value.toFixed(1);
  };

  const formatPeriod = (period: string) => {
    return period.replace('Q', ' Q');
  };

  const calculateQoQ = (current: NDISeriesPoint, index: number) => {
    if (index === 0) return null;
    const previous = data[index - 1];
    if (!previous || !previous.value || !current.value) return null;
    return ((current.value - previous.value) / previous.value) * 100;
  };

  const calculateYoY = (current: NDISeriesPoint, index: number) => {
    if (index < 4) return null;
    const previousYear = data[index - 4];
    if (!previousYear || !previousYear.value || !current.value) return null;
    return ((current.value - previousYear.value) / previousYear.value) * 100;
  };

  const calculateRolling4Q = (current: NDISeriesPoint, index: number) => {
    const startIndex = Math.max(0, index - 3);
    const relevantData = data.slice(startIndex, index + 1);
    const validValues = relevantData.filter(d => d.value !== null).map(d => d.value!);
    
    if (validValues.length === 0) return null;
    return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
  };

  return (
    <div className={cn("w-full", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">NDI</TableHead>
            <TableHead className="text-right">QoQ</TableHead>
            <TableHead className="text-right">YoY</TableHead>
            <TableHead className="text-right">Rullande 4Q</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((point, index) => {
            const qoq = calculateQoQ(point, index);
            const yoy = calculateYoY(point, index);
            const rolling4q = calculateRolling4Q(point, index);

            return (
              <TableRow key={point.period}>
                <TableCell className="font-medium">
                  {formatPeriod(point.period)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatValue(point.value)}
                </TableCell>
                <TableCell className="text-right">
                  {qoq !== null ? (
                    <div className={cn(
                      "flex items-center justify-end gap-1",
                      qoq > 0 ? "text-green-600" : qoq < 0 ? "text-red-600" : "text-gray-600"
                    )}>
                      {qoq > 0 ? (
                        <ArrowUpIcon className="h-3 w-3" />
                      ) : qoq < 0 ? (
                        <ArrowDownIcon className="h-3 w-3" />
                      ) : null}
                      {qoq > 0 ? '+' : ''}{qoq.toFixed(1)}%
                    </div>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {yoy !== null ? (
                    <div className={cn(
                      "flex items-center justify-end gap-1",
                      yoy > 0 ? "text-green-600" : yoy < 0 ? "text-red-600" : "text-gray-600"
                    )}>
                      {yoy > 0 ? (
                        <ArrowUpIcon className="h-3 w-3" />
                      ) : yoy < 0 ? (
                        <ArrowDownIcon className="h-3 w-3" />
                      ) : null}
                      {yoy > 0 ? '+' : ''}{yoy.toFixed(1)}%
                    </div>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatValue(rolling4q)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
