export type KioskMode = "JUNIOR" | "EXPLORER" | "TEEN";
export type KioskPreference = "AUTO" | KioskMode;

export function resolveKioskMode(ageYears: number | null | undefined, preference: KioskPreference = "AUTO"): KioskMode {
  if (preference !== "AUTO") return preference;
  // Unknown ages use the accessible, large-target junior layout.
  if (ageYears == null || !Number.isFinite(ageYears) || ageYears <= 7) return "JUNIOR";
  if (ageYears <= 12) return "EXPLORER";
  return "TEEN";
}
