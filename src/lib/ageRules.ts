export interface AgeProfile {
    ageYears: number;
    ageMonths: number;
    stageName: string;
    isUnlocked: boolean;
    maxDailyTasks: number;
    defaultSubstepLimit: number;
}

export function calculateAgeProfile(dob: Date) {
  const today = new Date();
  let ageYears = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    ageYears--;
  }

  if (ageYears < 6) {
    return { ageYears, tier: "toddler", stageName: "Early Years", maxDailyTasks: 3 };
  }
  if (ageYears < 12) {
    return { ageYears, tier: "primary", stageName: "Primary School", maxDailyTasks: 5 };
  }

  // Fallback for teens (Ages 12-18+)
  return {
    ageYears,
    tier: "teen",
    stageName: "Secondary / Teen",
    maxDailyTasks: 8,
  };
}

/**
 *  Check if a task in the Task Vault is eligible for the child's current age
 */

export function isTaskEligibleForAge(minAge: number, maxAge: number, childAgeYears: number): boolean {
    return childAgeYears >= minAge && childAgeYears <= maxAge;
}