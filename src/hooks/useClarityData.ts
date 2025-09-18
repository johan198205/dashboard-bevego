import { useEffect, useState } from 'react';
import { useFilters } from '@/components/GlobalFilters';
import { clarityService } from '@/services/clarity.service';
import { ClarityScore } from '@/lib/types';

export function useClarityData() {
  const { state } = useFilters();
  const [clarityScore, setClarityScore] = useState<ClarityScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const params = {
          range: {
            start: state.range.start,
            end: state.range.end,
            grain: state.range.grain
          },
          filters: {
            device: state.device,
            country: [], // TODO: Add country filter to global filters
            source: state.channel,
            browser: [], // TODO: Add browser filter to global filters
            os: [] // TODO: Add OS filter to global filters
          }
        };

        const scoreResult = await clarityService.getClarityScore(params);
        setClarityScore(scoreResult);
      } catch (error) {
        console.error("Failed to fetch Clarity data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [state.range, state.device, state.channel]);

  return { clarityScore, loading };
}
