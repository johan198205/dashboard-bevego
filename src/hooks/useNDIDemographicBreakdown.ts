import { useState, useEffect, useMemo } from 'react';
import { Period, DemographicBreakdown } from '@/types/ndi';

  // HALF_UP rounding function (rounds 0.5 up instead of to even)
  const roundHalfUp = (value: number, decimals: number = 2): number => {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  };

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
          ndi: data.gender.male.ndi !== null ? roundHalfUp(data.gender.male.ndi) : null,
          qoqChange: data.gender.male.qoqChange !== null && data.gender.male.qoqChange !== undefined ? roundHalfUp(data.gender.male.qoqChange) : null,
          prevQuarterValue: data.gender.male.prevQuarterValue !== null && data.gender.male.prevQuarterValue !== undefined ? roundHalfUp(data.gender.male.prevQuarterValue) : null,
        },
        female: {
          ...data.gender.female,
          ndi: data.gender.female.ndi !== null ? roundHalfUp(data.gender.female.ndi) : null,
          qoqChange: data.gender.female.qoqChange !== null && data.gender.female.qoqChange !== undefined ? roundHalfUp(data.gender.female.qoqChange) : null,
          prevQuarterValue: data.gender.female.prevQuarterValue !== null && data.gender.female.prevQuarterValue !== undefined ? roundHalfUp(data.gender.female.prevQuarterValue) : null,
        },
        delta: data.gender.delta !== null ? roundHalfUp(data.gender.delta) : null,
      },
      ageGroups: Object.fromEntries(
        Object.entries(data.ageGroups).map(([key, value]) => [
          key,
          {
            ...value,
            ndi: value.ndi !== null ? roundHalfUp(value.ndi) : null,
            qoqChange: value.qoqChange !== null && value.qoqChange !== undefined ? roundHalfUp(value.qoqChange) : null,
            prevQuarterValue: value.prevQuarterValue !== null && value.prevQuarterValue !== undefined ? roundHalfUp(value.prevQuarterValue) : null,
          },
        ])
      ),
      device: {
        ...data.device,
        mobile: {
          ...data.device.mobile,
          ndi: data.device.mobile.ndi !== null ? roundHalfUp(data.device.mobile.ndi) : null,
          qoqChange: data.device.mobile.qoqChange !== null && data.device.mobile.qoqChange !== undefined ? roundHalfUp(data.device.mobile.qoqChange) : null,
          prevQuarterValue: data.device.mobile.prevQuarterValue !== null && data.device.mobile.prevQuarterValue !== undefined ? roundHalfUp(data.device.mobile.prevQuarterValue) : null,
        },
        desktop: {
          ...data.device.desktop,
          ndi: data.device.desktop.ndi !== null ? roundHalfUp(data.device.desktop.ndi) : null,
          qoqChange: data.device.desktop.qoqChange !== null && data.device.desktop.qoqChange !== undefined ? roundHalfUp(data.device.desktop.qoqChange) : null,
          prevQuarterValue: data.device.desktop.prevQuarterValue !== null && data.device.desktop.prevQuarterValue !== undefined ? roundHalfUp(data.device.desktop.prevQuarterValue) : null,
        },
        delta: data.device.delta !== null ? roundHalfUp(data.device.delta) : null,
      },
      os: {
        ...data.os,
        android: {
          ...data.os.android,
          ndi: data.os.android.ndi !== null ? roundHalfUp(data.os.android.ndi) : null,
          qoqChange: data.os.android.qoqChange !== null && data.os.android.qoqChange !== undefined ? roundHalfUp(data.os.android.qoqChange) : null,
          prevQuarterValue: data.os.android.prevQuarterValue !== null && data.os.android.prevQuarterValue !== undefined ? roundHalfUp(data.os.android.prevQuarterValue) : null,
        },
        ios: {
          ...data.os.ios,
          ndi: data.os.ios.ndi !== null ? roundHalfUp(data.os.ios.ndi) : null,
          qoqChange: data.os.ios.qoqChange !== null && data.os.ios.qoqChange !== undefined ? roundHalfUp(data.os.ios.qoqChange) : null,
          prevQuarterValue: data.os.ios.prevQuarterValue !== null && data.os.ios.prevQuarterValue !== undefined ? roundHalfUp(data.os.ios.prevQuarterValue) : null,
        },
        delta: data.os.delta !== null ? roundHalfUp(data.os.delta) : null,
      },
      browser: {
        chrome: {
          ...data.browser.chrome,
          ndi: data.browser.chrome.ndi !== null ? roundHalfUp(data.browser.chrome.ndi) : null,
          qoqChange: data.browser.chrome.qoqChange !== null && data.browser.chrome.qoqChange !== undefined ? roundHalfUp(data.browser.chrome.qoqChange) : null,
          prevQuarterValue: data.browser.chrome.prevQuarterValue !== null && data.browser.chrome.prevQuarterValue !== undefined ? roundHalfUp(data.browser.chrome.prevQuarterValue) : null,
        },
        safari: {
          ...data.browser.safari,
          ndi: data.browser.safari.ndi !== null ? roundHalfUp(data.browser.safari.ndi) : null,
          qoqChange: data.browser.safari.qoqChange !== null && data.browser.safari.qoqChange !== undefined ? roundHalfUp(data.browser.safari.qoqChange) : null,
          prevQuarterValue: data.browser.safari.prevQuarterValue !== null && data.browser.safari.prevQuarterValue !== undefined ? roundHalfUp(data.browser.safari.prevQuarterValue) : null,
        },
        edge: {
          ...data.browser.edge,
          ndi: data.browser.edge.ndi !== null ? roundHalfUp(data.browser.edge.ndi) : null,
          qoqChange: data.browser.edge.qoqChange !== null && data.browser.edge.qoqChange !== undefined ? roundHalfUp(data.browser.edge.qoqChange) : null,
          prevQuarterValue: data.browser.edge.prevQuarterValue !== null && data.browser.edge.prevQuarterValue !== undefined ? roundHalfUp(data.browser.edge.prevQuarterValue) : null,
        },
      },
      riksbyggenBuilt: {
        ...data.riksbyggenBuilt,
        yes: {
          ...data.riksbyggenBuilt.yes,
          ndi: data.riksbyggenBuilt.yes.ndi !== null ? roundHalfUp(data.riksbyggenBuilt.yes.ndi) : null,
        },
        no: {
          ...data.riksbyggenBuilt.no,
          ndi: data.riksbyggenBuilt.no.ndi !== null ? roundHalfUp(data.riksbyggenBuilt.no.ndi) : null,
        },
        delta: data.riksbyggenBuilt.delta !== null ? roundHalfUp(data.riksbyggenBuilt.delta) : null,
      },
      riksbyggenManaged: {
        ...data.riksbyggenManaged,
        yes: {
          ...data.riksbyggenManaged.yes,
          ndi: data.riksbyggenManaged.yes.ndi !== null ? roundHalfUp(data.riksbyggenManaged.yes.ndi) : null,
        },
        no: {
          ...data.riksbyggenManaged.no,
          ndi: data.riksbyggenManaged.no.ndi !== null ? roundHalfUp(data.riksbyggenManaged.no.ndi) : null,
        },
        delta: data.riksbyggenManaged.delta !== null ? roundHalfUp(data.riksbyggenManaged.delta) : null,
      },
      informationFound: {
        yes: {
          ...data.informationFound.yes,
          ndi: data.informationFound.yes.ndi !== null ? roundHalfUp(data.informationFound.yes.ndi) : null,
        },
        partially: {
          ...data.informationFound.partially,
          ndi: data.informationFound.partially.ndi !== null ? roundHalfUp(data.informationFound.partially.ndi) : null,
        },
        no: {
          ...data.informationFound.no,
          ndi: data.informationFound.no.ndi !== null ? roundHalfUp(data.informationFound.no.ndi) : null,
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
