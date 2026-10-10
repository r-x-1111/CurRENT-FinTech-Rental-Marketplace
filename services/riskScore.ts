import type { RiskLevel } from "../types";

export interface RentalIncident {
  type: "on_time_success" | "late_return" | "minor_damage" | "serious_damage" | "theft_fraud";
  hoursLate?: number;
  confirmed: boolean;
  status: "pending" | "confirmed" | "rejected";
}

export interface RentalHistoryItem {
  id: string;
  incidents: RentalIncident[];
}

export interface RiskInputs {
  verified: boolean;
  rentalHistory?: RentalHistoryItem[];
  // Backwards compatibility fields
  completedRentals?: number;
  lateReturns?: number;
  resolvedDisputes?: number;
  unresolvedSeriousDisputes?: number;
}

export interface RiskResult {
  score: number | null;
  level: RiskLevel;
  label: string;
  canDirectBook: boolean;
}

export function tierForScore(score: number | null): { level: RiskLevel; label: string; canDirectBook: boolean } {
  if (score === null || score === undefined) {
    return { level: "unverified", label: "Unverified", canDirectBook: false };
  }
  if (score >= 80) {
    return { level: "low", label: "Low Risk", canDirectBook: true };
  }
  if (score >= 40) {
    return { level: "medium", label: "Medium Risk", canDirectBook: true };
  }
  if (score >= 30) {
    return { level: "high", label: "High Risk", canDirectBook: true };
  }
  return { level: "very_high", label: "Very High Risk", canDirectBook: false };
}

export function calculateLatePenalty(hoursLate: number): number {
  if (hoursLate <= 2) return 0;
  return -Math.min(5, Math.ceil(hoursLate - 2));
}

export function calculateRiskScore(input: RiskInputs): RiskResult {
  if (!input.verified) {
    return {
      score: null,
      level: "unverified",
      label: "Unverified",
      canDirectBook: false,
    };
  }

  // Newly verified renter starts at 78/100 Medium (V3.23 rule)
  let score = 78;

  if (input.rentalHistory && input.rentalHistory.length > 0) {
    for (const rental of input.rentalHistory) {
      const confirmedIncidents = rental.incidents.filter((i) => i.confirmed);
      if (confirmedIncidents.length === 0) {
        // Successful on-time rental: +2
        score += 2;
      } else {
        // Pick only the single most serious confirmed penalty (V1.8 rule)
        let maxPenalty = 0; // negative number
        for (const inc of confirmedIncidents) {
          let pen = 0;
          if (inc.type === "minor_damage") pen = -10;
          else if (inc.type === "serious_damage") pen = -30;
          else if (inc.type === "late_return" && inc.hoursLate) pen = calculateLatePenalty(inc.hoursLate);
          if (pen < maxPenalty) maxPenalty = pen;
        }
        score += maxPenalty;
      }
    }
  } else if (input.completedRentals !== undefined) {
    // Basic accumulator fallback
    score += Math.min((input.completedRentals || 0) * 2, 30);
    if (input.lateReturns) score -= Math.min(input.lateReturns * 2, 10);
    if (input.resolvedDisputes) score -= input.resolvedDisputes * 10;
    if (input.unresolvedSeriousDisputes) score -= input.unresolvedSeriousDisputes * 30;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const tier = tierForScore(score);

  return {
    score,
    level: tier.level,
    label: tier.label,
    canDirectBook: tier.canDirectBook,
  };
}

export function evaluateRentalOutcome(
  rawIncidents: {
    type: "on_time_success" | "late_return" | "minor_damage" | "serious_damage" | "theft_fraud";
    hoursLate?: number;
    confirmed?: boolean;
    description?: string;
  }[],
): {
  effectiveAdjustment: number;
  incidents: {
    type: "on_time_success" | "late_return" | "minor_damage" | "serious_damage" | "theft_fraud";
    description: string;
    penalty: number;
    hoursLate?: number;
    isWinning: boolean;
  }[];
  isBanned: boolean;
} {
  const confirmed = rawIncidents.filter((i) => i.confirmed !== false);

  if (confirmed.length === 0 || (confirmed.length === 1 && confirmed[0].type === "on_time_success")) {
    return {
      effectiveAdjustment: 2,
      incidents: [
        {
          type: "on_time_success",
          description: "Completed on-time with no confirmed issues (+2 points)",
          penalty: 2,
          isWinning: true,
        },
      ],
      isBanned: false,
    };
  }

  let minPenalty = 0;
  let winningIndex = -1;
  let isBanned = false;

  const processed = confirmed.map((inc, index) => {
    let penalty = 0;
    let description = inc.description || "";

    if (inc.type === "minor_damage") {
      penalty = -10;
      if (!description) description = "Confirmed minor damage (−10 points)";
    } else if (inc.type === "serious_damage") {
      penalty = -30;
      if (!description) description = "Confirmed serious damage or accidental loss (−30 points)";
    } else if (inc.type === "late_return") {
      const late = inc.hoursLate ?? 0;
      penalty = calculateLatePenalty(late);
      if (!description) {
        description =
          late <= 2
            ? `Late return within 2h grace period (RM0 / 0 points)`
            : `Unapproved late return (${late}h) (${penalty} points)`;
      }
    } else if (inc.type === "theft_fraud") {
      penalty = -100;
      isBanned = true;
      if (!description) description = "Confirmed intentional theft or fraud (Permanent account ban)";
    }

    if (penalty < minPenalty) {
      minPenalty = penalty;
      winningIndex = index;
    }

    return {
      type: inc.type,
      description,
      penalty,
      hoursLate: inc.hoursLate,
      isWinning: false,
    };
  });

  if (winningIndex >= 0) {
    processed[winningIndex].isWinning = true;
  }

  // Clamped between -30 and 0 for numerical adjustments (theft/fraud causes ban)
  const effectiveAdjustment = isBanned ? 0 : minPenalty;

  return {
    effectiveAdjustment,
    incidents: processed,
    isBanned,
  };
}

