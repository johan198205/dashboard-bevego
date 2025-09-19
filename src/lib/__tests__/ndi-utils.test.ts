import { selectNdiPercent, selectNdiTimeseries, ndiTimeseriesToChart } from '../ndi-utils';

describe('NDI Utils', () => {
  describe('selectNdiPercent', () => {
    it('should normalize values to 0-100 range', () => {
      expect(selectNdiPercent(0)).toBe(0);
      expect(selectNdiPercent(50)).toBe(50);
      expect(selectNdiPercent(100)).toBe(100);
    });

    it('should clamp values outside 0-100 range', () => {
      expect(selectNdiPercent(-10)).toBe(0);
      expect(selectNdiPercent(150)).toBe(100);
      expect(selectNdiPercent(452)).toBe(100); // This was the original issue
    });

    it('should round decimal values', () => {
      expect(selectNdiPercent(50.7)).toBe(51);
      expect(selectNdiPercent(50.3)).toBe(50);
    });
  });

  describe('selectNdiTimeseries', () => {
    it('should normalize all values in timeseries', () => {
      const input = [
        { date: '2024-01-01', value: 75.5 },
        { date: '2024-01-02', value: 150 }, // Should be clamped to 100
        { date: '2024-01-03', value: -5 }, // Should be clamped to 0
      ];

      const result = selectNdiTimeseries(input);

      expect(result).toEqual([
        { date: '2024-01-01', value: 76 },
        { date: '2024-01-02', value: 100 },
        { date: '2024-01-03', value: 0 },
      ]);
    });
  });

  describe('ndiTimeseriesToChart', () => {
    it('should convert timeseries to chart format with normalized values', () => {
      const input = [
        { date: '2024-01-01', value: 75 },
        { date: '2024-01-02', value: 452 }, // Should be clamped to 100
      ];

      const result = ndiTimeseriesToChart(input);

      expect(result).toEqual([
        { x: new Date('2024-01-01').getTime(), y: 75 },
        { x: new Date('2024-01-02').getTime(), y: 100 },
      ]);
    });
  });
});
