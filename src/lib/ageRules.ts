export interface AgeProfile {
    ageYears: number;
    ageMonths: number;
    stageName: string;
    isUnlocked: boolean;
    maxDailyTasks: number;
    defaultSubstepLimit: number;
}


export function calculateAgeProfile(dob: Date): AgeProfile {
    const now = new Date();
    const difftime = Math.abs(now.getTime() - dob.getTime());
    const diffDays = Math.ceil(difftime / (1000 * 60 * 60 * 24));
    const ageYears = Math.floor(diffDays / 365.25);
    const ageMonths = Math.floor((diffDays % 365.25) / 30.44);

    // 0 - 23 Months: Infant Stage
    if (ageYears < 2) {
        return {
            ageYears,
            ageMonths,
            stageName: "Infant Stage",
            isUnlocked: false,
            maxDailyTasks: 0,
            defaultSubstepLimit: 0,
        };
    }

    // Age 2 - 4: Toddler Stage
    if (ageYears >= 2 && ageYears <= 4) {
        return {
            ageYears,
            ageMonths,
            stageName: "Toddler Stage",
            isUnlocked: true,
            maxDailyTasks: 3,
            defaultSubstepLimit: 2,
        };
    }

    // Age 5 - 7: KS1 Stage
    if (ageYears >= 5 && ageYears <= 7) {
        return {
            ageYears,
            ageMonths,
            stageName: "KS1 Stage",
            isUnlocked: true,
            maxDailyTasks: 5,
            defaultSubstepLimit: 3,
        };
    }

    // Age 8 - 11: KS2 Stage
    if (ageYears >= 8 && ageYears <= 11) {
        return {
            ageYears,
            ageMonths,
            stageName: "KS2 Stage",
            isUnlocked: true,
            maxDailyTasks: 7,
            defaultSubstepLimit: 4,
        };
    }

    // Age 12 - 14: KS3 Stage
    if (ageYears >= 12 && ageYears <= 14) {
        return {
            ageYears,
            ageMonths,
            stageName: "KS3 Stage",
            isUnlocked: true,
            maxDailyTasks: 10,
            defaultSubstepLimit: 5,
        };
    }
}

/**
 *  Check if a task in the Task Vault is eligible for the child's current age
 */

export function isTaskEligibleForAge(minAge: number, maxAge: number, childAgeYears: number): boolean {
    return childAgeYears >= minAge && childAgeYears <= maxAge;
}