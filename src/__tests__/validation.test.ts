import { describe, it, expect } from "vitest";
import { CreateTaskSchema, CreateRewardSchema } from "@/lib/validation/schemas";

describe("Input Validation Schemas", () => {
  it("should validate a valid task payload", () => {
    const validData = {
      title: "Clean Bedroom",
      starValue: 3,
      subSteps: ["Make bed", "Fold laundry"],
    };

    const parsed = CreateTaskSchema.parse(validData);
    expect(parsed.title).toBe("Clean Bedroom");
    expect(parsed.starValue).toBe(3);
    expect(parsed.subSteps).toHaveLength(2);
  });

  it("should fail task validation if starValue is less than 1", () => {
    const invalidData = {
      title: "Brush Teeth",
      starValue: 0,
    };

    expect(() => CreateTaskSchema.parse(invalidData)).toThrow();
  });

  it("should validate a valid reward payload", () => {
    const validReward = {
      title: "Ice Cream Cone",
      starCost: 10,
      monthlyStock: 5,
    };

    const parsed = CreateRewardSchema.parse(validReward);
    expect(parsed.title).toBe("Ice Cream Cone");
    expect(parsed.starCost).toBe(10);
  });
});
