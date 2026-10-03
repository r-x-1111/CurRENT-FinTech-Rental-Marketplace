import type { RiskLevel } from '../types';

export interface RiskInputs {
  verified: boolean;
  completedRentals: number;
  averageRating: number;
  lateReturns: number;
  resolvedDisputes: number;
  unresolvedSeriousDisputes: number;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
}

export function calculateRiskScore(input: RiskInputs): RiskResult {
  let score = 50;

  if (input.verified) score += 15;
  score += Math.min(input.completedRentals * 2, 20);
  if (input.averageRating >= 4.5) score += 10;
  score -= input.lateReturns * 10;
  score -= input.resolvedDisputes * 5;
  score -= input.unresolvedSeriousDisputes * 20;

  score = Math.max(0, Math.min(100, score));

  const level: RiskLevel = score >= 75 ? 'low' : score >= 50 ? 'standard' : 'higher';
  return { score, level };
}
