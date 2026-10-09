import { describe, expect, it } from "vitest";
import { typeEffectiveness } from "../src/engine";

describe("type chart", () => {
  it("handles single types", () => {
    expect(typeEffectiveness("fire", ["grass"])).toBe(2);
    expect(typeEffectiveness("water", ["grass"])).toBe(0.5);
    expect(typeEffectiveness("normal", ["normal"])).toBe(1);
  });

  it("handles immunities", () => {
    expect(typeEffectiveness("electric", ["ground"])).toBe(0);
    expect(typeEffectiveness("normal", ["ghost"])).toBe(0);
    expect(typeEffectiveness("ghost", ["normal"])).toBe(0);
    expect(typeEffectiveness("dragon", ["fairy"])).toBe(0);
    expect(typeEffectiveness("ground", ["flying"])).toBe(0);
    expect(typeEffectiveness("psychic", ["dark"])).toBe(0);
    expect(typeEffectiveness("poison", ["steel"])).toBe(0);
    expect(typeEffectiveness("fighting", ["ghost"])).toBe(0);
  });

  it("multiplies dual types", () => {
    expect(typeEffectiveness("water", ["fire", "rock"])).toBe(4);
    expect(typeEffectiveness("grass", ["fire", "flying"])).toBe(0.25);
    expect(typeEffectiveness("ice", ["dragon", "ground"])).toBe(4);
    expect(typeEffectiveness("electric", ["water", "ground"])).toBe(0);
    expect(typeEffectiveness("fire", ["water", "grass"])).toBe(1);
  });
});
