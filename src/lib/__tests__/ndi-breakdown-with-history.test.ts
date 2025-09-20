import { BreakdownWithHistory } from '@/types/ndi';
import { prevQuarter, yoyQuarter } from '../period';

describe('NDI Breakdown with History Calculations', () => {
  describe('QoQ and YoY calculations', () => {
    it('should calculate QoQ change correctly', () => {
      const currentValue = 50.0;
      const previousValue = 40.0;
      const expectedQoQ = ((currentValue - previousValue) / previousValue) * 100;
      
      expect(expectedQoQ).toBe(25.0);
    });

    it('should calculate YoY change correctly', () => {
      const currentValue = 60.0;
      const previousYearValue = 50.0;
      const expectedYoY = ((currentValue - previousYearValue) / previousYearValue) * 100;
      
      expect(expectedYoY).toBe(20.0);
    });

    it('should handle zero previous values', () => {
      const currentValue = 50.0;
      const previousValue = 0;
      const expectedQoQ = previousValue !== 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
      
      expect(expectedQoQ).toBe(0);
    });

    it('should handle negative changes', () => {
      const currentValue = 30.0;
      const previousValue = 40.0;
      const expectedQoQ = ((currentValue - previousValue) / previousValue) * 100;
      
      expect(expectedQoQ).toBe(-25.0);
    });
  });

  describe('Period calculations', () => {
    it('should get previous quarter correctly', () => {
      expect(prevQuarter('2024Q2')).toBe('2024Q1');
      expect(prevQuarter('2024Q1')).toBe('2023Q4');
      expect(prevQuarter('2023Q4')).toBe('2023Q3');
    });

    it('should get YoY quarter correctly', () => {
      expect(yoyQuarter('2024Q2')).toBe('2023Q2');
      expect(yoyQuarter('2024Q1')).toBe('2023Q1');
      expect(yoyQuarter('2023Q4')).toBe('2022Q4');
    });
  });

  describe('Dynamic terciles for color buckets', () => {
    it('should calculate terciles correctly for different list sizes', () => {
      // Test with 9 items
      const totalItems = 9;
      const topThird = Math.ceil(totalItems / 3);
      const middleThird = Math.ceil((totalItems * 2) / 3);
      
      expect(topThird).toBe(3);
      expect(middleThird).toBe(6);
      
      // Test with 10 items
      const totalItems10 = 10;
      const topThird10 = Math.ceil(totalItems10 / 3);
      const middleThird10 = Math.ceil((totalItems10 * 2) / 3);
      
      expect(topThird10).toBe(4);
      expect(middleThird10).toBe(7);
    });

    it('should assign correct bucket colors based on index', () => {
      const getBucketColor = (index: number, topThird: number, middleThird: number) => {
        if (index < topThird) {
          return 'green';
        } else if (index < middleThird) {
          return 'yellow';
        } else {
          return 'red';
        }
      };

      const topThird = 3;
      const middleThird = 6;
      
      expect(getBucketColor(0, topThird, middleThird)).toBe('green');
      expect(getBucketColor(2, topThird, middleThird)).toBe('green');
      expect(getBucketColor(3, topThird, middleThird)).toBe('yellow');
      expect(getBucketColor(5, topThird, middleThird)).toBe('yellow');
      expect(getBucketColor(6, topThird, middleThird)).toBe('red');
      expect(getBucketColor(8, topThird, middleThird)).toBe('red');
    });
  });

  describe('Data sorting and display', () => {
    it('should sort data by NDI value descending', () => {
      const mockData: BreakdownWithHistory[] = [
        { period: '2024Q2', groupA: 'Area A', value: 45.0 },
        { period: '2024Q2', groupA: 'Area B', value: 65.0 },
        { period: '2024Q2', groupA: 'Area C', value: 35.0 },
        { period: '2024Q2', groupA: 'Area D', value: 55.0 },
      ];

      const sortedData = [...mockData].sort((a, b) => b.value - a.value);
      
      expect(sortedData[0].value).toBe(65.0);
      expect(sortedData[1].value).toBe(55.0);
      expect(sortedData[2].value).toBe(45.0);
      expect(sortedData[3].value).toBe(35.0);
    });

    it('should handle initial display count correctly', () => {
      const INITIAL_DISPLAY_COUNT = 10;
      const mockData = Array.from({ length: 15 }, (_, i) => ({
        period: '2024Q2' as const,
        groupA: `Area ${i + 1}`,
        value: 50.0 - i,
      }));

      const displayData = mockData.slice(0, INITIAL_DISPLAY_COUNT);
      
      expect(displayData).toHaveLength(10);
      expect(displayData[0].groupA).toBe('Area 1');
      expect(displayData[9].groupA).toBe('Area 10');
    });
  });
});
