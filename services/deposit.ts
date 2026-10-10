import type { RiskLevel } from '../types';

export const DEPOSIT_TIERS: Record<RiskLevel, { rate: number; cap: number; label: string }> = {
  low: { rate: 0.05, cap: 500, label: "5% (capped at RM500)" },
  medium: { rate: 0.1, cap: 1000, label: "10% (capped at RM1,000)" },
  high: { rate: 0.15, cap: 1500, label: "15% (capped at RM1,500)" },
  very_high: { rate: 0, cap: 0, label: "Platform assessment required" },
  unverified: { rate: 0, cap: 0, label: "Verification required" },
};

export function calculateSecurityDeposit(itemValue: number, riskLevel: RiskLevel) {
  const tier = DEPOSIT_TIERS[riskLevel];
  if (!tier || tier.rate === 0) return 0;
  const raw = Math.round(itemValue * tier.rate * 100) / 100;
  return Math.min(raw, tier.cap);
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

export const LENDER_BOOST_FEE = 10; // RM10
export const LENDER_BOOST_DAYS = 7; // 7 days

export function calculateConsecutiveQuote(additionalRentalFee: number) {
  const serviceFee = calculateBorrowerServiceFee(additionalRentalFee);
  return {
    additionalRentalFee,
    serviceFee,
    deposit: 0, // RM0 extra deposit for consecutive chain
    total: Math.round((additionalRentalFee + serviceFee) * 100) / 100,
  };
}

