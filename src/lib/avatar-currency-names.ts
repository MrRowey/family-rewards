/**
 * The names are display-only. Every theme draws from the same per-child wallet.
 */
const LABELS: Record<string, [string, string]> = {
  sprouts: ["Seed", "Seeds"],
  bottts: ["Cog", "Cogs"],
  botttsNeutral: ["Bolt", "Bolts"],
  critters: ["Paw", "Paws"],
  voxelBot: ["Pixel", "Pixels"],
  planets: ["Orbit", "Orbits"],
  constellation: ["Stardust", "Stardust"],
};
export function avatarCurrencyName(theme: string | null | undefined, count = 2): string {
  const [singular, plural] = LABELS[theme ?? ""] ?? ["Avatar Coin", "Avatar Coins"];
  return count === 1 ? singular : plural;
}
