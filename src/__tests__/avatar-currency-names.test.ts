import { describe, expect, it } from "vitest";
import { avatarCurrencyName } from "@/lib/avatar-currency-names";

describe("theme currency names", () => {
  it.each([
    ["sprouts", "Seed", "Seeds"],
    ["bottts", "Cog", "Cogs"],
    ["botttsNeutral", "Bolt", "Bolts"],
    ["critters", "Paw", "Paws"],
    ["voxelBot", "Pixel", "Pixels"],
    ["planets", "Orbit", "Orbits"],
    ["constellation", "Stardust", "Stardust"],
  ])("supports the %s theme's display label", (theme, one, multiple) => {
    expect(avatarCurrencyName(theme, 1)).toBe(one);
    expect(avatarCurrencyName(theme, 5)).toBe(multiple);
  });
  it("does not replace the shared wallet with a separate balance", () => {
    expect(avatarCurrencyName(null, 1)).toBe("Avatar Coin");
    expect(avatarCurrencyName("unknown", 10)).toBe("Avatar Coins");
  });
});
