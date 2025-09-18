import { useEffect, useState } from 'react';
import { useFilters } from '@/components/GlobalFilters';
import { getCwvSummary } from '@/lib/mockData/cwv';
import { CwvSummary } from '@/lib/types';

export function useCwvData() {
  const { state } = useFilters();
  const [summary, setSummary] = useState<CwvSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const summaryData = await getCwvSummary(
          state.range.start, 
          state.range.end, 
          state.device
        );
        setSummary(summaryData);
      } catch (error) {
        console.error('Error loading CWV data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [state.range.start, state.range.end, state.device]);

  return { summary, loading };
}
