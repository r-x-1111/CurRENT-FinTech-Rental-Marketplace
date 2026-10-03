import type { RiskLevel } from '../types';

const depositRate: Record<RiskLevel, number> = {
  low: 0.1,
  standard: 0.2,
  higher: 0.3
};

export function calculateSecurityDeposit(itemValue: number, riskLevel: RiskLevel) {
  const amount = itemValue * depositRate[riskLevel];
  return Math.round(amount * 100) / 100;
}

export function calculateBorrowerServiceFee(rentalFee: number) {
  return Math.max(5, Math.round(rentalFee * 0.05 * 100) / 100);
}

export function calculateOwnerPayout(rentalFee: number) {
  const commission = Math.round(rentalFee * 0.12 * 100) / 100;
  return {
    commission,
    payout: Math.round((rentalFee - commission) * 100) / 100
  };
}
