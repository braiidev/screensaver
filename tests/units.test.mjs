import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { convertTemperature, formatTemperature } from "../src/utils/units.js";

describe("convertTemperature", () => {
  it("convierte a fahrenheit", () => {
    assert.equal(convertTemperature(0, "fahrenheit"), 32);
    assert.equal(convertTemperature(100, "fahrenheit"), 212);
    assert.equal(convertTemperature(20, "fahrenheit"), 68);
  });
  it("mantiene celsius", () => {
    assert.equal(convertTemperature(20, "celsius"), 20);
  });
});

describe("formatTemperature", () => {
  it("formatea sin decimales", () => {
    assert.equal(formatTemperature(20.4, "celsius"), "20°");
    assert.equal(formatTemperature(20, "fahrenheit"), "68°");
  });
});
