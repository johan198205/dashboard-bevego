import { clarityScoreConfig } from './theme-tokens';
import { ClarityOverview } from './types';

/**
 * Normalizes a metric value to 0-100 scale using piecewise linear mapping
 * @param value - The input value to normalize
 * @param breakpoints - Array of [input_value, output_score] pairs for piecewise linear mapping
 * @returns Normalized score between 0-100
 */
export function normalizeMetric(value: number, breakpoints: readonly (readonly number[])[]): number {
  if (breakpoints.length === 0) return 0;
  
  // Sort breakpoints by input value
  const sortedBreakpoints = [...breakpoints].sort((a, b) => a[0] - b[0]);
  
  // If value is below first breakpoint, use first breakpoint's output
  if (value <= sortedBreakpoints[0][0]) {
    return Math.max(0, Math.min(100, sortedBreakpoints[0][1]));
  }
  
  // If value is above last breakpoint, use last breakpoint's output
  if (value >= sortedBreakpoints[sortedBreakpoints.length - 1][0]) {
    return Math.max(0, Math.min(100, sortedBreakpoints[sortedBreakpoints.length - 1][1]));
  }
  
  // Find the two breakpoints to interpolate between
  for (let i = 0; i < sortedBreakpoints.length - 1; i++) {
    const [x1, y1] = sortedBreakpoints[i];
    const [x2, y2] = sortedBreakpoints[i + 1];
    
    if (value >= x1 && value <= x2) {
      // Linear interpolation
      const ratio = (value - x1) / (x2 - x1);
      const interpolated = y1 + ratio * (y2 - y1);
      return Math.max(0, Math.min(100, Math.round(interpolated)));
    }
  }
  
  return 0;
}

/**
 * Computes the overall Clarity Score from Clarity metrics
 * @param metrics - Clarity overview metrics
 * @returns Object containing score, grade, and breakdown
 */
export function computeClarityScore(metrics: ClarityOverview): {
  score: number;
  grade: 'Bra' | 'Behöver förbättras' | 'Dålig' | 'N/A';
  parts: {
    rage: number;
    dead: number;
    quickback: number;
    script: number;
    engagement: number;
    scroll: number;
  };
} {
  // Handle case where there are no sessions
  if (metrics.sessions === 0) {
    return {
      score: 0,
      grade: 'N/A',
      parts: {
        rage: 0,
        dead: 0,
        quickback: 0,
        script: 0,
        engagement: 0,
        scroll: 0,
      },
    };
  }

  // Calculate derived percentages and rates
  const ragePct = (metrics.rageClicks.count / metrics.sessions) * 100;
  const deadPct = (metrics.deadClicks.count / metrics.sessions) * 100;
  const quickbackPct = metrics.quickBack.percentage;
  const scriptPer1k = (metrics.scriptErrors.count / Math.max(metrics.sessions, 1)) * 1000;
  const engagementTime = metrics.avgEngagementTime;
  const scrollDepth = metrics.avgScrollDepth;

  // Normalize each metric to 0-100 scale
  const normalizedRage = normalizeMetric(ragePct, clarityScoreConfig.breakpoints.rage);
  const normalizedDead = normalizeMetric(deadPct, clarityScoreConfig.breakpoints.dead);
  const normalizedQuickback = normalizeMetric(quickbackPct, clarityScoreConfig.breakpoints.quickback);
  const normalizedScript = normalizeMetric(scriptPer1k, clarityScoreConfig.breakpoints.script);
  const normalizedEngagement = normalizeMetric(engagementTime, clarityScoreConfig.breakpoints.engagement);
  const normalizedScroll = normalizeMetric(scrollDepth, clarityScoreConfig.breakpoints.scroll);

  // Calculate weighted score
  const weightedScore = 
    normalizedRage * clarityScoreConfig.weights.rage +
    normalizedDead * clarityScoreConfig.weights.dead +
    normalizedQuickback * clarityScoreConfig.weights.quickback +
    normalizedScript * clarityScoreConfig.weights.script +
    normalizedEngagement * clarityScoreConfig.weights.engagement +
    normalizedScroll * clarityScoreConfig.weights.scroll;

  const score = Math.round(weightedScore);

  // Determine grade
  let grade: 'Bra' | 'Behöver förbättras' | 'Dålig' | 'N/A';
  if (score >= clarityScoreConfig.gradeThresholds.good) {
    grade = 'Bra';
  } else if (score >= clarityScoreConfig.gradeThresholds.needsImprovement) {
    grade = 'Behöver förbättras';
  } else {
    grade = 'Dålig';
  }

  return {
    score,
    grade,
    parts: {
      rage: normalizedRage,
      dead: normalizedDead,
      quickback: normalizedQuickback,
      script: normalizedScript,
      engagement: normalizedEngagement,
      scroll: normalizedScroll,
    },
  };
}
