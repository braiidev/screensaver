import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../src/config.js";
import { wallpapers } from "../src/data/wallpapers.js";
import { identify } from "../src/data/wno.js";
import { ICON_NAMES } from "../src/ui/icons.js";

describe("CONFIG", () => {
  it("no tiene maxIndex hardcodeado", () => {
    assert.equal(CONFIG.wallpaper.maxIndex, undefined);
  });
  it("tiene claves esperadas", () => {
    assert.ok(CONFIG.cities);
    assert.ok(CONFIG.weather);
    assert.ok(CONFIG.storage);
  });
});

describe("wallpapers", () => {
  it("tiene entradas con url https", () => {
    assert.ok(wallpapers.length > 100);
    for (const w of wallpapers.slice(0, 5)) {
      assert.equal(typeof w.id, "number");
      assert.match(w.url, /^https:\/\//);
    }
  });
  it("sin ids repetidos", () => {
    const ids = new Set(wallpapers.map(w => w.id));
    assert.equal(ids.size, wallpapers.length);
  });
});

describe("wno", () => {
  const codes = ["0","1","2","3","45","48","51","53","55","56","57","61","63","65","66","67","71","73","75","77","80","81","82","85","86","95","96","99"];
  it("cubre todos los códigos con etiqueta e icono", () => {
    for (const c of codes) {
      const e = identify(Number(c));
      assert.ok(e?.label, `falta etiqueta para ${c}`);
      assert.ok(ICON_NAMES.includes(e.icon), `icono inválido para ${c}`);
      const n = identify(Number(c), false);
      assert.ok(n?.label, `falta etiqueta nocturna para ${c}`);
      assert.ok(ICON_NAMES.includes(n.icon), `icono nocturno inválido para ${c}`);
    }
  });
});
