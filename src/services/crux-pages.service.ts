import { CruxService } from './crux.service';

export interface PageCwvData {
  url: string;
  lcp: {
    p75: number;
    status: 'Pass' | 'Needs Improvement' | 'Fail';
  };
  inp: {
    p75: number;
    status: 'Pass' | 'Needs Improvement' | 'Fail';
  };
  cls: {
    p75: number;
    status: 'Pass' | 'Needs Improvement' | 'Fail';
  };
  ttfb: {
    p75: number;
    status: 'Pass' | 'Needs Improvement' | 'Fail';
  };
  lastTested: string;
  source: string;
}

export class CruxPagesService {
  private cruxService: CruxService;

  constructor() {
    this.cruxService = new CruxService();
  }

  /**
   * Get Core Web Vitals data for multiple pages
   */
  async getPagesCwvData(
    urls: string[],
    formFactor?: 'PHONE' | 'DESKTOP' | 'TABLET'
  ): Promise<PageCwvData[]> {
    try {
      const results: PageCwvData[] = [];

      for (const url of urls) {
        try {
          const cwvData = await this.cruxService.getCoreWebVitals(url, formFactor);
          
          results.push({
            url: url,
            lcp: cwvData.lcp,
            inp: cwvData.inp,
            cls: cwvData.cls,
            ttfb: cwvData.ttfb,
            lastTested: new Date().toISOString().split('T')[0],
            source: 'CrUX API'
          });
        } catch (error) {
          // If page doesn't have CrUX data, add with default values
          results.push({
            url: url,
            lcp: { p75: 0, status: 'Fail' },
            inp: { p75: 0, status: 'Fail' },
            cls: { p75: 0, status: 'Fail' },
            ttfb: { p75: 0, status: 'Fail' },
            lastTested: 'N/A',
            source: 'No data'
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching pages CwV data:', error);
      return [];
    }
  }

  /**
   * Get Core Web Vitals data for a single page
   */
  async getPageCwvData(
    url: string,
    formFactor?: 'PHONE' | 'DESKTOP' | 'TABLET'
  ): Promise<PageCwvData | null> {
    try {
      const cwvData = await this.cruxService.getCoreWebVitals(url, formFactor);
      
      return {
        url: url,
        lcp: cwvData.lcp,
        inp: cwvData.inp,
        cls: cwvData.cls,
        ttfb: cwvData.ttfb,
        lastTested: new Date().toISOString().split('T')[0],
        source: 'CrUX API'
      };
    } catch (error) {
      console.error(`Error fetching CwV data for ${url}:`, error);
      return null;
    }
  }
}
