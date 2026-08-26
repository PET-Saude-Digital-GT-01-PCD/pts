import { describe, expect, it } from "vitest";

import { ZARIT_ALTO, zaritAlto } from "@/server/reception/zarit";

describe("zaritAlto", () => {
  it("constante é 12 (escala rápida adaptada)", () => {
    expect(ZARIT_ALTO).toBe(12);
  });

  it.each([12, 13, 24])("score %s é alto", (score) => {
    expect(zaritAlto(score)).toBe(true);
  });

  it.each([0, 11])("score %s não é alto", (score) => {
    expect(zaritAlto(score)).toBe(false);
  });

  it("score ausente não é alto", () => {
    expect(zaritAlto(null)).toBe(false);
    expect(zaritAlto(undefined)).toBe(false);
  });
});
