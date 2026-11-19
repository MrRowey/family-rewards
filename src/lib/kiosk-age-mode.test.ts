import { describe, expect, it } from "vitest";
import { resolveKioskMode } from "./kiosk-age-mode";

describe("age-adaptive kiosk", () => {
  it("uses junior for young or unknown ages", () => {
    expect(resolveKioskMode(6)).toBe("JUNIOR");
    expect(resolveKioskMode(undefined)).toBe("JUNIOR");
    expect(resolveKioskMode(7)).toBe("JUNIOR");
  });
  it("uses explorer and teen at age boundaries", () => {
    expect(resolveKioskMode(8)).toBe("EXPLORER");
    expect(resolveKioskMode(12)).toBe("EXPLORER");
    expect(resolveKioskMode(13)).toBe("TEEN");
  });
  it("honours parent override regardless of age", () => {
    expect(resolveKioskMode(6, "TEEN")).toBe("TEEN");
    expect(resolveKioskMode(16, "JUNIOR")).toBe("JUNIOR");
  });
});
