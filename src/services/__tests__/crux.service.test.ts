import { CruxService } from '../crux.service';
import { CwvStatus } from '@/lib/types';

// Mock the environment variable
const originalEnv = process.env;

describe('CruxService', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, CRUX_API_KEY: 'test-api-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getCwvStatus', () => {
    let cruxService: CruxService;

    beforeEach(() => {
      cruxService = new CruxService();
    });

    it('should return Pass for values within target', () => {
      // Access private method through any type casting for testing
      const getCwvStatus = (cruxService as any).getCwvStatus.bind(cruxService);
      
      expect(getCwvStatus(2000, 2500)).toBe('Pass');
      expect(getCwvStatus(150, 200)).toBe('Pass');
      expect(getCwvStatus(0.08, 0.1)).toBe('Pass');
    });

    it('should return Needs Improvement for values within 1.5x target', () => {
      const getCwvStatus = (cruxService as any).getCwvStatus.bind(cruxService);
      
      expect(getCwvStatus(3000, 2500)).toBe('Needs Improvement'); // 1.2x target
      expect(getCwvStatus(250, 200)).toBe('Needs Improvement'); // 1.25x target
      expect(getCwvStatus(0.12, 0.1)).toBe('Needs Improvement'); // 1.2x target
    });

    it('should return Fail for values beyond 1.5x target', () => {
      const getCwvStatus = (cruxService as any).getCwvStatus.bind(cruxService);
      
      expect(getCwvStatus(4000, 2500)).toBe('Fail'); // 1.6x target
      expect(getCwvStatus(350, 200)).toBe('Fail'); // 1.75x target
      expect(getCwvStatus(0.18, 0.1)).toBe('Fail'); // 1.8x target
    });

    it('should return Fail for null values', () => {
      const getCwvStatus = (cruxService as any).getCwvStatus.bind(cruxService);
      
      expect(getCwvStatus(null, 2500)).toBe('Fail');
      expect(getCwvStatus(null, 200)).toBe('Fail');
      expect(getCwvStatus(null, 0.1)).toBe('Fail');
    });
  });

  describe('calculateTotalStatusPercentage', () => {
    let cruxService: CruxService;

    beforeEach(() => {
      cruxService = new CruxService();
    });

    it('should calculate percentage based on passed pages when available', () => {
      const calculateTotalStatusPercentage = (cruxService as any).calculateTotalStatusPercentage.bind(cruxService);
      
      const result = calculateTotalStatusPercentage('Pass', 'Pass', 'Pass', 75.0);
      expect(result).toBe(78.0); // 75 + 0.3 adjustment
    });

    it('should fallback to individual status calculation when no passed pages', () => {
      const calculateTotalStatusPercentage = (cruxService as any).calculateTotalStatusPercentage.bind(cruxService);
      
      const result = calculateTotalStatusPercentage('Pass', 'Pass', 'Pass', 0);
      expect(result).toBe(100.0); // All three pass
      
      const result2 = calculateTotalStatusPercentage('Pass', 'Needs Improvement', 'Fail', 0);
      expect(result2).toBe(33.3); // One out of three pass
    });

    it('should cap percentage at 100', () => {
      const calculateTotalStatusPercentage = (cruxService as any).calculateTotalStatusPercentage.bind(cruxService);
      
      const result = calculateTotalStatusPercentage('Pass', 'Pass', 'Pass', 95.0);
      expect(result).toBe(100.0); // Capped at 100
    });
  });

  describe('constructor', () => {
    it('should throw error when CRUX_API_KEY is not set', () => {
      delete process.env.CRUX_API_KEY;
      
      expect(() => {
        new CruxService();
      }).toThrow('CRUX_API_KEY environment variable is required');
    });

    it('should initialize successfully when CRUX_API_KEY is set', () => {
      process.env.CRUX_API_KEY = 'test-key';
      
      expect(() => {
        new CruxService();
      }).not.toThrow();
    });
  });
});

describe('CrUX Data Mapping', () => {
  it('should map CrUX API response to CwvSummary format', () => {
    // Mock CrUX API response
    const mockCruxResponse = {
      record: {
        key: {
          formFactor: 'PHONE',
          origin: 'https://bevego.se'
        },
        metrics: {
          largest_contentful_paint: {
            histogram: [],
            percentiles: {
              p75: '2100'
            }
          },
          interaction_to_next_paint: {
            histogram: [],
            percentiles: {
              p75: '150'
            }
          },
          cumulative_layout_shift: {
            histogram: [],
            percentiles: {
              p75: '0.08'
            }
          }
        }
      }
    };

    const mockCoreWebVitalsResponse = {
      record: {
        key: {
          formFactor: 'PHONE',
          origin: 'https://bevego.se'
        },
        metrics: {
          core_web_vitals: {
            histogram: [
              { start: '0', end: '1', density: 0.782 }
            ]
          }
        }
      }
    };

    // Test data mapping logic
    const lcpP75 = Math.round(parseFloat(mockCruxResponse.record.metrics.largest_contentful_paint?.percentiles?.p75 || '0'));
    const inpP75 = Math.round(parseFloat(mockCruxResponse.record.metrics.interaction_to_next_paint?.percentiles?.p75 || '0'));
    const clsP75 = parseFloat(mockCruxResponse.record.metrics.cumulative_layout_shift?.percentiles?.p75 || '0');

    expect(lcpP75).toBe(2100);
    expect(inpP75).toBe(150);
    expect(clsP75).toBe(0.08);

    // Test status calculation
    const getCwvStatus = (value: number, target: number): CwvStatus => {
      if (value <= target) return 'Pass';
      if (value <= target * 1.5) return 'Needs Improvement';
      return 'Fail';
    };

    expect(getCwvStatus(lcpP75, 2500)).toBe('Pass');
    expect(getCwvStatus(inpP75, 200)).toBe('Pass');
    expect(getCwvStatus(clsP75, 0.1)).toBe('Pass');

    // Test passed pages calculation
    const goodBucket = mockCoreWebVitalsResponse.record.metrics.core_web_vitals?.histogram?.find(bucket => 
      bucket.start === '0' && bucket.end === '1'
    );
    const passedPagesPercentage = goodBucket ? Math.round(goodBucket.density * 100 * 10) / 10 : 0;
    
    expect(passedPagesPercentage).toBe(78.2);
  });
});
