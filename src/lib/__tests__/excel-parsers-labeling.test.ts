import { parseAggregatedFileFromBuffer } from '../excel-parsers';

describe('Excel Parsers - Labeling Logic', () => {
  it('should create descriptive labels from section title and statement for all metric rows', () => {
    // Mock Excel data with section title and statement
    const mockData = [
      ['2024Q4', '2023Q4', '2023Q3'], // Headers
      ['sida IN (1,2,3,4,5,6,7,8)'], // Section marker
      ['STARTSIDAN'], // Section title
      ['Startsidan är inbjudande.'], // Statement
      ['Top box', 47, 48, 44], // Top box row with values
      ['Bottom box', 14, 20, 23], // Bottom box row with values
      ['Index', 62.74, 61.70, 63.39], // Index row with values
      ['sida IN (1,2,3,4,5,6,7,8)'], // Another section marker
      ['BOKNING'], // Another section title
      ['Bokningsprocessen är enkel.'], // Another statement
      ['Top box', 45, 48, 54], // Another Top box row
      ['Index', 59.40, 54.69, 58.27], // Another Index row
    ];

    // Convert to Excel buffer format
    const buffer = Buffer.from(JSON.stringify(mockData));
    
    const result = parseAggregatedFileFromBuffer(buffer, 'test-file', 'NDI');
    
    expect(result.metricPoints).toHaveLength(6); // 2 Index rows × 3 quarters
    
    // Check that descriptive labels are created for Index rows
    const startsidanIndexRows = result.metricPoints.filter(p => 
      p.groupA?.includes('STARTSIDAN') && p.groupB === 'Index'
    );
    expect(startsidanIndexRows).toHaveLength(3);
    expect(startsidanIndexRows[0].groupA).toBe('STARTSIDAN – Startsidan är inbjudande.');
    expect(startsidanIndexRows[0].groupB).toBe('Index');
    
    // Check BOKNING section
    const bokningRows = result.metricPoints.filter(p => p.groupA?.includes('BOKNING'));
    expect(bokningRows).toHaveLength(3); // 1 Index row × 3 quarters
    expect(bokningRows[0].groupA).toBe('BOKNING – Bokningsprocessen är enkel.');
  });

  it('should fallback to section title only when statement is missing', () => {
    const mockData = [
      ['2024Q4'],
      ['STARTSIDAN'], // Section title only
      ['Index', 62.74], // Index row
    ];

    const buffer = Buffer.from(JSON.stringify(mockData));
    const result = parseAggregatedFileFromBuffer(buffer, 'test-file', 'NDI');
    
    expect(result.metricPoints).toHaveLength(1);
    expect(result.metricPoints[0].groupA).toBe('STARTSIDAN');
    expect(result.metricPoints[0].groupB).toBe('Index');
  });

  it('should fallback to statement only when section title is missing', () => {
    const mockData = [
      ['2024Q4'],
      ['Startsidan är inbjudande.'], // Statement only
      ['Index', 62.74], // Index row
    ];

    const buffer = Buffer.from(JSON.stringify(mockData));
    const result = parseAggregatedFileFromBuffer(buffer, 'test-file', 'NDI');
    
    expect(result.metricPoints).toHaveLength(1);
    expect(result.metricPoints[0].groupA).toBe('Startsidan är inbjudande.');
    expect(result.metricPoints[0].groupB).toBe('Index');
  });

  it('should fallback to generic label when both section title and statement are missing', () => {
    const mockData = [
      ['2024Q4'],
      ['Index', 62.74], // Index row without context
    ];

    const buffer = Buffer.from(JSON.stringify(mockData));
    const result = parseAggregatedFileFromBuffer(buffer, 'test-file', 'NDI');
    
    expect(result.metricPoints).toHaveLength(1);
    expect(result.metricPoints[0].groupA).toBe('Index Row 1');
    expect(result.metricPoints[0].groupB).toBe('Index');
  });
});