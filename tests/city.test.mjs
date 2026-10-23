import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cityId, toCity } from "../src/utils/city.js";

describe("cityId", () => {
  it("redondea con dos decimales por defecto", () => {
    assert.equal(cityId(40.416775, -3.70379), "40.42,-3.70");
  });
  it("es estable con decimales distintos", () => {
    assert.equal(cityId(41.3879, 2.1699), "41.39,2.17");
  });
});

describe("toCity", () => {
  it("devuelve null sin coordenadas", () => {
    assert.equal(toCity({ name: "X" }), null);
    assert.equal(toCity({}), null);
  });
  it("calcula id con las coordenadas", () => {
    const c = toCity({ latitude: 28.09, longitude: -16.73, city: "Tenerife", timezone: "Atlantic/Canary" });
    assert.equal(c.id, "28.09,-16.73");
    assert.equal(c.timezone, "Atlantic/Canary");
  });
});
