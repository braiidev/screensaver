import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClockFormat, createDayFormat } from "../src/utils/time.js";

describe("createClockFormat", () => {
  it("devuelve hora formateada", () => {
    const fmt = createClockFormat("Europe/Madrid", "h23");
    const d = new Date(Date.UTC(2026, 9, 23, 8, 5, 0));
    const { time } = fmt.now(d);
    assert.match(time, /^\d{2}:\d{2}$/);
  });
  it("funciona en 12h", () => {
    const fmt = createClockFormat("Europe/Madrid", "h12");
    const d = new Date(Date.UTC(2026, 9, 23, 13, 30, 0));
    const { time } = fmt.now(d);
    assert.ok(typeof time === "string" && time.length > 0);
  });
});

describe("createDayFormat", () => {
  it("formatea fecha ISO en UTC", () => {
    const fmt = createDayFormat();
    assert.ok(typeof fmt("2026-10-23") === "string" && fmt("2026-10-23").length > 0);
  });
});
