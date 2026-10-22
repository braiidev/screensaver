/**
 * theme.js - Sistema de temas combinables A+B + alineación + color + Custom
 */

import { storage } from "./storage.js";

const THEME_KEY = "weatherapp:v1:themes";
const LEGACY_KEY = "weatherapp:v1:theme";

const DEFAULTS = {
  themeA: "clasico",
  themeB: "clasico",
  align: "left",
  accent: "#4f9bff",
  name: "Clásico",
  id: "default-clasico",
};

const PRESETS_A = ["minimal", "clasico", "compacto", "tv"];
const PRESETS_B = ["elegante", "dev", "clasico", "arial"];
const ALIGNS = ["left", "center", "right"];

function uid() {
  return "th-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function load() {
  try {
    const raw = storage.get(THEME_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  try {
    const raw = storage.get(LEGACY_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const data = {
        activeId: "migrated",
        slots: [{
          id: "migrated",
          name: p.name || "Migrado",
          themeA: PRESETS_A.includes(p.themeA) ? p.themeA : "clasico",
          themeB: PRESETS_B.includes(p.themeB) ? p.themeB : "clasico",
          align: ALIGNS.includes(p.align) ? p.align : "left",
          accent: p.accent || "#4f9bff",
          custom: !!p.custom,
        }],
      };
      save(data);
      storage.remove?.(LEGACY_KEY);
      return data;
    }
  } catch {}
  return null;
}

function save(data) {
  storage.set(THEME_KEY, JSON.stringify(data));
}

function apply(state) {
  const root = document.documentElement;
  root.setAttribute("data-theme-a", state.themeA);
  root.setAttribute("data-theme-b", state.themeB);
  root.setAttribute("data-align", state.align);
  root.style.setProperty("--color-accent", state.accent);
  document.body?.setAttribute("data-theme-a", state.themeA);
  document.body?.setAttribute("data-theme-b", state.themeB);
  document.body?.setAttribute("data-align", state.align);
}

export function initTheme() {
  const saved = load();
  if (saved?.slots?.length && saved.activeId) {
    const slot = saved.slots.find(s => s.id === saved.activeId) || saved.slots[0];
    apply(slot);
    return { state: slot, all: saved };
  }
  apply(DEFAULTS);
  const init = {
    activeId: DEFAULTS.id,
    slots: [{ ...DEFAULTS, custom: false }],
  };
  save(init);
  return { state: init.slots[0], all: init };
}

export function saveTheme(theme) {
  const saved = load() || { activeId: null, slots: [] };
  const slot = { ...theme, id: theme.id || uid(), custom: true };
  const idx = saved.slots.findIndex(s => s.id === slot.id);
  if (idx >= 0) saved.slots[idx] = slot;
  else saved.slots.push(slot);
  saved.activeId = slot.id;
  save(saved);
  apply(slot);
  return { state: slot, all: saved };
}

export function setTheme(themeA, themeB, align, accent) {
  const current = load() || { activeId: null, slots: [] };
  let base = current.slots.find(s => s.id === current.activeId);
  const isPreset = base && !base.custom && base.themeA === themeA && base.themeB === themeB && base.align === align && base.accent === accent;
  if (isPreset) {
    apply(base);
    return { state: base, all: current };
  }
  const slot = {
    id: base?.custom ? base.id : uid(),
    name: base?.custom ? base.name : "Custom",
    themeA,
    themeB,
    align,
    accent,
    custom: true,
  };
  const idx = current.slots.findIndex(s => s.id === slot.id);
  if (idx >= 0) current.slots[idx] = { ...current.slots[idx], ...slot };
  else current.slots.push(slot);
  current.activeId = slot.id;
  save(current);
  apply(slot);
  return { state: slot, all: current };
}

export function applySlot(id) {
  const saved = load();
  if (!saved) return null;
  const slot = saved.slots.find(s => s.id === id);
  if (!slot) return null;
  saved.activeId = id;
  save(saved);
  apply(slot);
  return { state: slot, all: saved };
}

export function renameSlot(id, name) {
  const saved = load();
  if (!saved) return null;
  const slot = saved.slots.find(s => s.id === id);
  if (!slot) return null;
  slot.name = name;
  save(saved);
  apply(slot);
  return { state: slot, all: saved };
}

export function duplicateSlot(id) {
  const saved = load();
  if (!saved) return null;
  const slot = saved.slots.find(s => s.id === id);
  if (!slot) return null;
  const dup = { ...slot, id: uid(), name: slot.name + " (copia)", custom: true };
  saved.slots.push(dup);
  saved.activeId = dup.id;
  save(saved);
  apply(dup);
  return { state: dup, all: saved };
}

export function removeSlot(id) {
  const saved = load();
  if (!saved) return null;
  saved.slots = saved.slots.filter(s => s.id !== id);
  if (saved.activeId === id && saved.slots.length) saved.activeId = saved.slots[0].id;
  else if (!saved.slots.length) {
    apply(DEFAULTS);
    saved.activeId = DEFAULTS.id;
    saved.slots = [{ ...DEFAULTS, custom: false }];
  }
  save(saved);
  apply(saved.slots.find(s => s.id === saved.activeId));
  return { state: saved.slots.find(s => s.id === saved.activeId), all: saved };
}

export { PRESETS_A, PRESETS_B, ALIGNS, DEFAULTS };
