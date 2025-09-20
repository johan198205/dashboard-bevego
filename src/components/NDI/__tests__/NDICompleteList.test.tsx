import { render, screen, fireEvent } from '@testing-library/react';
import { NDICompleteList } from '../NDICompleteList';
import { BreakdownWithHistory } from '@/types/ndi';

// Mock the format utility
jest.mock('@/lib/format', () => ({
  formatPercent: (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`,
}));

describe('NDICompleteList', () => {
  const mockData: BreakdownWithHistory[] = [
    {
      period: '2024Q2',
      groupA: 'INLOGGNING – Det är enkelt att logga in',
      value: 71.0,
      weight: 150,
      qoqChange: 5.2,
      yoyChange: 8.1,
      prevQuarterValue: 67.5,
      prevYearValue: 65.7,
    },
    {
      period: '2024Q2',
      groupA: 'INLOGGNING – Det känns tillförlitligt/säkert när jag är inloggad',
      value: 70.2,
      weight: 145,
      qoqChange: 3.1,
      yoyChange: 6.5,
      prevQuarterValue: 68.1,
      prevYearValue: 65.9,
    },
    {
      period: '2024Q2',
      groupA: 'DOKUMENTHANTERAREN – Hur väl instämmer du i följande påstående? Jag är totalt sett mycket nöjd med dokumenthanteraren på Mitt Riksbyggen.',
      value: 43.2,
      weight: 120,
      qoqChange: -2.1,
      yoyChange: -5.3,
      prevQuarterValue: 44.1,
      prevYearValue: 45.6,
    },
    {
      period: '2024Q2',
      groupA: 'FELANMÄLAN – Hur väl instämmer du i följande påstående? Jag är totalt sett mycket nöjd med tjänsten felanmälan på Mitt Riksbyggen.',
      value: 48.7,
      weight: 100,
      qoqChange: 1.2,
      yoyChange: -1.8,
      prevQuarterValue: 48.1,
      prevYearValue: 49.6,
    },
    {
      period: '2024Q2',
      groupA: 'KONTAKT – Hur väl instämmer du i följande påstående? Jag är totalt sett mycket nöjd med de kontaktmöjligheter som finns tillgängliga på Mitt Riksbyggen.',
      value: 50.0,
      weight: 110,
      qoqChange: 0.0,
      yoyChange: 2.1,
      prevQuarterValue: 50.0,
      prevYearValue: 49.0,
    },
  ];

  it('should render the component with title and show all button', () => {
    render(<NDICompleteList data={mockData} />);
    
    expect(screen.getByText('Alla områden sorterade på NDI')).toBeInTheDocument();
    expect(screen.getByText('Visa alla')).toBeInTheDocument();
  });

  it('should render table headers in black text', () => {
    render(<NDICompleteList data={mockData} />);
    
    expect(screen.getByText('Område')).toBeInTheDocument();
    expect(screen.getByText('NDI')).toBeInTheDocument();
    expect(screen.getByText('QoQ Δ%')).toBeInTheDocument();
    expect(screen.getByText('YoY Δ%')).toBeInTheDocument();
  });

  it('should display initial 10 items by default', () => {
    render(<NDICompleteList data={mockData} />);
    
    // Should show all 5 items since we have less than 10
    expect(screen.getByText('INLOGGNING – Det är enkelt att logga in')).toBeInTheDocument();
    expect(screen.getByText('INLOGGNING – Det känns tillförlitligt/säkert när jag är inloggad')).toBeInTheDocument();
    expect(screen.getByText('DOKUMENTHANTERAREN – Hur väl instämmer du i följande påstående? Jag är totalt sett mycket nöjd med dokumenthanteraren på Mitt Riksbyggen.')).toBeInTheDocument();
  });

  it('should sort data by NDI value descending', () => {
    render(<NDICompleteList data={mockData} />);
    
    const ndiValues = screen.getAllByText(/\d+\.\d+/);
    // First NDI value should be the highest (71.0)
    expect(ndiValues[0]).toHaveTextContent('71.0');
  });

  it('should display QoQ and YoY changes with previous values and arrows', () => {
    render(<NDICompleteList data={mockData} />);
    
    expect(screen.getByText('↑+5.20% (67.5)')).toBeInTheDocument(); // QoQ for first item
    expect(screen.getByText('↑+8.10% (65.7)')).toBeInTheDocument(); // YoY for first item
    expect(screen.getByText('↓-2.10% (44.1)')).toBeInTheDocument(); // QoQ for third item
  });

  // Weight information is no longer displayed since Svar column was removed

  it('should toggle between show all and show fewer', () => {
    // Create more than 10 items to test the toggle functionality
    const largeMockData = Array.from({ length: 15 }, (_, i) => ({
      period: '2024Q2' as const,
      groupA: `Area ${i + 1} – Test statement`,
      value: 70.0 - i,
      weight: 100 + i,
      qoqChange: i % 2 === 0 ? 5.0 : -2.0,
      yoyChange: i % 3 === 0 ? 3.0 : -1.0,
      prevQuarterValue: 65.0 - i,
      prevYearValue: 60.0 - i,
    }));

    render(<NDICompleteList data={largeMockData} />);
    
    // Initially should show "Visa alla" button
    expect(screen.getByText('Visa alla')).toBeInTheDocument();
    expect(screen.getByText('Visar 10 av 15 områden')).toBeInTheDocument();
    
    // Click to show all
    fireEvent.click(screen.getByText('Visa alla'));
    
    expect(screen.getByText('Visa färre')).toBeInTheDocument();
    // Should show all 15 items now
    expect(screen.getByText('Area 15 – Test statement')).toBeInTheDocument();
    
    // Click to show fewer again
    fireEvent.click(screen.getByText('Visa färre'));
    
    expect(screen.getByText('Visa alla')).toBeInTheDocument();
    expect(screen.getByText('Visar 10 av 15 områden')).toBeInTheDocument();
  });

  it('should handle empty data gracefully', () => {
    render(<NDICompleteList data={[]} />);
    
    expect(screen.getByText('Alla områden sorterade på NDI')).toBeInTheDocument();
    expect(screen.getByText('Visa alla')).toBeInTheDocument();
  });

  it('should handle missing QoQ/YoY data', () => {
    const dataWithMissingChanges: BreakdownWithHistory[] = [
      {
        period: '2024Q2',
        groupA: 'Test Area',
        value: 50.0,
        weight: 100,
        // qoqChange, yoyChange, prevQuarterValue, and prevYearValue are undefined
      },
    ];

    render(<NDICompleteList data={dataWithMissingChanges} />);
    
    // Should display N/A for missing changes
    const naElements = screen.getAllByText('N/A');
    expect(naElements).toHaveLength(2); // One for QoQ, one for YoY
  });
});
