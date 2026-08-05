// js/2D/state.js
// Zentraler Zustand fuer 2D-Editor (Snapping, Labels, Grid, Massstab, Selection)

// --- Selection ---
export let selectedNode = null;
export function setSelectedNode(node) {
    selectedNode = node;
}

// --- Zuletzt verwendete PV-Modulgröße ---
// Wird sowohl beim Hinzufügen eines neuen Moduls (über das Auswahl-Modal)
// als auch beim Anklicken/Auswählen eines bestehenden PV-Moduls auf der
// Zeichenfläche aktualisiert. So dupliziert der "+"-Schnellzugriff-Button
// immer die Größe des zuletzt relevanten Moduls, auch wenn zwischendurch
// zwischen unterschiedlichen Modulen gewechselt wurde.
export let lastPvModuleSize = null; // { name, w, h } oder null
export let pvCascadeCount = 0;

export function setLastPvModuleSize(size) {
    lastPvModuleSize = size;
    pvCascadeCount = 0; // Versatz-Kaskade bei neuer Referenzgröße zurücksetzen
}

export function incrementPvCascadeCount() {
    pvCascadeCount++;
    return pvCascadeCount;
}

// --- Snap ---
export let snapEnabled = true;
export function setSnapEnabled(value) {
    snapEnabled = value;
}

// --- Labels ---
export let labelsVisible = true;
export function setLabelsVisible(value) {
    labelsVisible = value;
}

// --- Maßstab (px pro Meter) ---
// Wichtig: activeScale ist die Umrechnung Welt(Meter) -> Welt(Pixel) im Layer-Space.
// Beispiel: 50 bedeutet 50px entsprechen 1m.
export let activeScale = 50; // Default (50 px/m)
export function getActiveScale() {
    return activeScale;
}
export function setActiveScale(scale) {
    // defensive: nur sinnvolle Werte zulassen
    const s = Number(scale);
    if (!Number.isFinite(s) || s <= 0) return;
    activeScale = s;
}

// --- Grid ---
export let gridVisible = true;
export function setGridVisible(value) {
    gridVisible = value;
}

// --- Autobemaßung (automatische Abstandsanzeige zu Dachkante/Nachbarobjekt) ---
export let autoDimensionVisible = false;
export function setAutoDimensionVisible(value) {
    autoDimensionVisible = value;
}

// --- Konstanten / Utilities ---

// Fester Fang-Radius in SCREEN-PIXELN (unabhaengig von Zoom und Massstab).
// 10px auf dem Bildschirm fuehlt sich immer gleich an.
export const SNAP_RADIUS_PX = 10;

// Legacy-Konstante bleibt als Fallback erhalten (wird aber nicht mehr direkt genutzt)
export const SNAP_THRESHOLD = 0.1;

/**
 * Berechnet den Snap-Schwellenwert in METER-Koordinaten,
 * basierend auf dem aktuellen Maßstab (px/m) und dem Konva-Stage-Zoom.
 *
 * Idee:
 * - Fangzone ist in Screen-Pixeln definiert (SNAP_RADIUS_PX)
 * - Um in Welt-Meter vergleichen zu koennen, rechnen wir um:
 *   screenPx -> worldPx  durch /zoom
 *   worldPx  -> meter    durch /activeScale
 *   => meterThreshold = SNAP_RADIUS_PX / (activeScale * zoom)
 *
 * @param {number} zoom Der aktuelle stage.scaleX() Wert (Konva-Stage-Zoom)
 * @returns {number} Schwellenwert in Metern
 */
export function getSnapThreshold(zoom) {
    const scale = activeScale || 50;
    const z = (typeof zoom === 'number' && Number.isFinite(zoom) && zoom > 0) ? zoom : 1;
    return SNAP_RADIUS_PX / (scale * z);
}

// Basis-Fontgroessen (werden i.d.R. mit 1/zoom skaliert)
export const BASE_FONT_SIZE_EDGE = 16;
export const BASE_FONT_SIZE_MAIN = 20;

// Hilfsfunktion um UserData robust zu lesen
export const getUserData = (n) => n?.getAttr("userData") || null; null;