import { useState, useEffect, useMemo } from 'react';
import { Period, DemographicBreakdown } from '@/types/ndi';

export function useNDIDemographicBreakdown(period: Period | null) {
  const [data, setData] = useState<DemographicBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (targetPeriod: Period) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/metrics/ndi/demographic-breakdown?period=${targetPeriod}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setData(null);
          setError('Ingen demografisk data tillgänglig för valt kvartal');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const breakdownData = await response.json();
      setData(breakdownData);
    } catch (err) {
      console.error('Error fetching demographic breakdown:', err);
      setError('Ett fel uppstod vid hämtning av demografisk data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period) {
      fetchData(period);
    } else {
      setData(null);
      setError(null);
    }
  }, [period]);

  // Memoized computed values for performance
  const computedData = useMemo(() => {
    if (!data) return null;

    return {
      ...data,
      // Ensure all values are properly formatted and handle nulls
      gender: {
        ...data.gender,
        male: {
          ...data.gender.male,
          ndi: data.gender.male.ndi !== null ? Math.round(data.gender.male.ndi * 10) / 10 : null,
        },
        female: {
          ...data.gender.female,
          ndi: data.gender.female.ndi !== null ? Math.round(data.gender.female.ndi * 10) / 10 : null,
        },
        delta: data.gender.delta !== null ? Math.round(data.gender.delta * 10) / 10 : null,
      },
      ageGroups: Object.fromEntries(
        Object.entries(data.ageGroups).map(([key, value]) => [
          key,
          {
            ...value,
            ndi: value.ndi !== null ? Math.round(value.ndi * 10) / 10 : null,
          },
        ])
      ),
      device: {
        ...data.device,
        mobile: {
          ...data.device.mobile,
          ndi: data.device.mobile.ndi !== null ? Math.round(data.device.mobile.ndi * 10) / 10 : null,
        },
        desktop: {
          ...data.device.desktop,
          ndi: data.device.desktop.ndi !== null ? Math.round(data.device.desktop.ndi * 10) / 10 : null,
        },
        delta: data.device.delta !== null ? Math.round(data.device.delta * 10) / 10 : null,
      },
      os: {
        ...data.os,
        android: {
          ...data.os.android,
          ndi: data.os.android.ndi !== null ? Math.round(data.os.android.ndi * 10) / 10 : null,
        },
        ios: {
          ...data.os.ios,
          ndi: data.os.ios.ndi !== null ? Math.round(data.os.ios.ndi * 10) / 10 : null,
        },
        delta: data.os.delta !== null ? Math.round(data.os.delta * 10) / 10 : null,
      },
      browser: {
        chrome: {
          ...data.browser.chrome,
          ndi: data.browser.chrome.ndi !== null ? Math.round(data.browser.chrome.ndi * 10) / 10 : null,
        },
        safari: {
          ...data.browser.safari,
          ndi: data.browser.safari.ndi !== null ? Math.round(data.browser.safari.ndi * 10) / 10 : null,
        },
        edge: {
          ...data.browser.edge,
          ndi: data.browser.edge.ndi !== null ? Math.round(data.browser.edge.ndi * 10) / 10 : null,
        },
      },
      riksbyggenBuilt: {
        ...data.riksbyggenBuilt,
        yes: {
          ...data.riksbyggenBuilt.yes,
          ndi: data.riksbyggenBuilt.yes.ndi !== null ? Math.round(data.riksbyggenBuilt.yes.ndi * 10) / 10 : null,
        },
        no: {
          ...data.riksbyggenBuilt.no,
          ndi: data.riksbyggenBuilt.no.ndi !== null ? Math.round(data.riksbyggenBuilt.no.ndi * 10) / 10 : null,
        },
        delta: data.riksbyggenBuilt.delta !== null ? Math.round(data.riksbyggenBuilt.delta * 10) / 10 : null,
      },
      riksbyggenManaged: {
        ...data.riksbyggenManaged,
        yes: {
          ...data.riksbyggenManaged.yes,
          ndi: data.riksbyggenManaged.yes.ndi !== null ? Math.round(data.riksbyggenManaged.yes.ndi * 10) / 10 : null,
        },
        no: {
          ...data.riksbyggenManaged.no,
          ndi: data.riksbyggenManaged.no.ndi !== null ? Math.round(data.riksbyggenManaged.no.ndi * 10) / 10 : null,
        },
        delta: data.riksbyggenManaged.delta !== null ? Math.round(data.riksbyggenManaged.delta * 10) / 10 : null,
      },
      informationFound: {
        yes: {
          ...data.informationFound.yes,
          ndi: data.informationFound.yes.ndi !== null ? Math.round(data.informationFound.yes.ndi * 10) / 10 : null,
        },
        partially: {
          ...data.informationFound.partially,
          ndi: data.informationFound.partially.ndi !== null ? Math.round(data.informationFound.partially.ndi * 10) / 10 : null,
        },
        no: {
          ...data.informationFound.no,
          ndi: data.informationFound.no.ndi !== null ? Math.round(data.informationFound.no.ndi * 10) / 10 : null,
        },
      },
    };
  }, [data]);

  return {
    data: computedData,
    loading,
    error,
    refetch: () => period && fetchData(period),
  };
}
