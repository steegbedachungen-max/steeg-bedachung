// js/2D/pages.js

import { layer, guideLayer, stage } from './stage.js';
import { erstelleFigur } from './figure.js';
import { selectNode } from './selection.js';
import { getUserData } from './state.js';
import { refreshAutoDimensions } from './autoDimension.js';
import { refreshShadingSync } from './shading.js';

// ==========================================
// Pages state
// ==========================================

function uid() {
    return 'p_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
}

export const pagesState = {
    pages: [
        // dachneigung (Grad) / dachausrichtung (Grad, Kompass 0=Nord..270=West)
        // werden für die Verschattungsberechnung (shading.js) benötigt.
        // Default: flach/Süden, bis der Nutzer die echten Werte einträgt.
        { id: 'p1', name: 'Seite 1', objects: [], measurements: [], dachneigung: 0, dachausrichtung: 180 }
    ],
    activePageId: 'p1',
    includeMeasurementsOnDuplicate: true,
};

export function getActivePage() {
    return pagesState.pages.find(p => p.id === pagesState.activePageId) || pagesState.pages[0];
}

/**
 * Setzt Dachneigung/-ausrichtung der aktiven Seite (für die
 * Verschattungsberechnung) und stößt ein Neuzeichnen an.
 */
export function setActivePageDachdaten(dachneigung, dachausrichtung) {
    const page = getActivePage();
    if (!page) return;
    if (Number.isFinite(dachneigung)) page.dachneigung = dachneigung;
    if (Number.isFinite(dachausrichtung)) page.dachausrichtung = dachausrichtung;
    refreshShadingSync();
}

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// ==========================================
// Capture current Konva scene into active page
// ==========================================

export function captureCurrentPage() {
    const page = getActivePage();

    // --- Objects (figures) ---
    const objects = [];
    layer.getChildren().forEach(n => {
        const ud = getUserData(n);
        if (ud) {
            // Ensure rotation/locked are synced
            const copy = deepCopy(ud);
            copy.rotation = n.rotation() || 0;
            copy.locked = n.getAttr('locked') || false;
            objects.push(copy);
        }
    });

    // --- Measurements ---
    const measurements = [];
    guideLayer.find('.measurementGroup').forEach(g => {
        const ud = g.getAttr('userData');
        if (ud && ud.typ === 'measurement') measurements.push(deepCopy(ud));
    });

    page.objects = objects;
    page.measurements = measurements;
}

// ==========================================
// Render active page into Konva
// ==========================================

function clearPageLayers() {
    // Remove all figures
    layer.destroyChildren();

    // Remove page-specific guides (but keep snapIndicator etc. that might be managed elsewhere)
    guideLayer.find('.measurementGroup, .selectionBox, .snapLine, .measureLine_temp, .measureText_temp').forEach(n => n.destroy());

    // Also remove any remaining measurement text/lines not inside group (defensive)
    guideLayer.find('.measureLine, .measureText').forEach(n => n.destroy());

    guideLayer.batchDraw();
}

function renderMeasurementsFromData(measurements) {
    const scale = stage.scaleX() || 1;
    const z = scale;

    measurements.forEach(m => {
        try {
            const { p1_m, p2_m } = m;
            if (!p1_m || !p2_m) return;

            // Convert meters to pixels using activeScale in 2D state, stored implicitly in p*_m
            // We store in meters; measurement.js uses getActiveScale(). We'll re-use that here via stage->layer scale.
            // But we do not import getActiveScale here to avoid circular imports; instead read from window.get2DScale.
            const activeScale = (typeof window.get2DScale === 'function') ? window.get2DScale() : 50;

            const group = new Konva.Group({
                draggable: false,
                name: 'measurementGroup'
            });
            group.setAttr('userData', deepCopy(m));

            const line = new Konva.Line({
                points: [p1_m.x * activeScale, p1_m.y * activeScale, p2_m.x * activeScale, p2_m.y * activeScale],
                stroke: '#e74c3c',
                strokeWidth: 2 / z,
                dash: [6 / z, 4 / z],
                listening: true,
                name: 'measureLine'
            });
            line.hitStrokeWidth(20);

            const distM = Math.hypot(p2_m.x - p1_m.x, p2_m.y - p1_m.y);
            const text = new Konva.Text({
                text: `${distM.toFixed(2)} m`,
                fontSize: 14 / z,
                fill: '#e74c3c',
                listening: true,
                draggable: true,
                name: 'measureText'
            });

            // Apply stored offset/rotation (screen-stable)
            const applyTextTransform = () => {
                const ud = group.getAttr('userData');
                const z2 = stage.scaleX() || 1;
                const s = (typeof window.get2DScale === 'function') ? window.get2DScale() : 50;
                const mid_m = { x: (p1_m.x + p2_m.x) / 2, y: (p1_m.y + p2_m.y) / 2 };
                const midPx = { x: mid_m.x * s, y: mid_m.y * s };
                const off = ud.textOffsetScreen || { x: 15, y: 15 };
                text.position({ x: midPx.x + off.x / z2, y: midPx.y + off.y / z2 });
                text.rotation(((ud.angle || 0) + (ud.textRotation || 0)) * 180 / Math.PI);
                text.fontSize(14 / z2);
            };

            applyTextTransform();

            // Re-implement drag move to store offset in SCREEN px
            text.on('dragmove', (evt) => {
                evt.cancelBubble = true;
                const ud = group.getAttr('userData');
                const z2 = stage.scaleX() || 1;
                const s = (typeof window.get2DScale === 'function') ? window.get2DScale() : 50;
                const mid_m = { x: (p1_m.x + p2_m.x) / 2, y: (p1_m.y + p2_m.y) / 2 };
                const midPx = { x: mid_m.x * s, y: mid_m.y * s };
                const pos = text.position();
                ud.textOffsetScreen = { x: (pos.x - midPx.x) * z2, y: (pos.y - midPx.y) * z2 };
                group.setAttr('userData', ud);
                applyTextTransform();
                guideLayer.batchDraw();
            });

            text.on('dblclick dbltap', (evt) => {
                evt.cancelBubble = true;
                const ud = group.getAttr('userData');
                ud.textRotation = (ud.textRotation || 0) + Math.PI / 2;
                group.setAttr('userData', ud);
                applyTextTransform();
                guideLayer.batchDraw();
            });

            text.on('wheel', (evt) => {
                evt.evt.preventDefault();
                evt.cancelBubble = true;
                const ud = group.getAttr('userData');
                const delta = evt.evt.deltaY;
                const step = evt.evt.shiftKey ? (Math.PI / 180) : (5 * Math.PI / 180);
                ud.textRotation = (ud.textRotation || 0) + (delta > 0 ? step : -step);
                group.setAttr('userData', ud);
                applyTextTransform();
                guideLayer.batchDraw();
            });

            group.add(line, text);
            guideLayer.add(group);
        } catch (e) {
            // ignore malformed measurement
        }
    });
}

export function renderActivePage() {
    const page = getActivePage();
    clearPageLayers();

    // Render figures
    page.objects.forEach(ud => {
        erstelleFigur(deepCopy(ud), selectNode);
    });

    // Render measurements
    if (Array.isArray(page.measurements) && page.measurements.length) {
        renderMeasurementsFromData(page.measurements);
    }

    // Reset selection
    selectNode(null);

    layer.batchDraw();
    guideLayer.batchDraw();

    // Autobemaßung (Abstand zu Dachkante/Nachbarobjekt) für die neu
    // gerenderte Seite neu berechnen - u.a. wichtig für den PDF-Export,
    // der renderActivePage() je Seite aufruft, bevor er sie als Bild einfängt.
    refreshAutoDimensions();
    refreshShadingSync();
}

// ==========================================
// Page operations
// ==========================================

export function addEmptyPage() {
    captureCurrentPage();

    // Dachneigung/-ausrichtung von der aktuellen Seite übernehmen (häufig
    // dieselbe Dachfläche/dasselbe Gebäude) - kann pro Seite angepasst werden.
    const current = getActivePage();
    const newId = uid();
    const pageNumber = pagesState.pages.length + 1;
    pagesState.pages.push({
        id: newId, name: `Seite ${pageNumber}`, objects: [], measurements: [],
        dachneigung: current?.dachneigung ?? 0,
        dachausrichtung: current?.dachausrichtung ?? 180
    });
    pagesState.activePageId = newId;
    renderActivePage();
}

export function duplicateActivePage() {
    captureCurrentPage();

    const src = getActivePage();
    const newId = uid();
    const pageNumber = pagesState.pages.length + 1;

    const clone = {
        id: newId,
        name: `${src.name} (Kopie)`,
        objects: deepCopy(src.objects || []),
        measurements: pagesState.includeMeasurementsOnDuplicate ? deepCopy(src.measurements || []) : [],
        dachneigung: src.dachneigung ?? 0,
        dachausrichtung: src.dachausrichtung ?? 180,
    };

    pagesState.pages.push(clone);
    pagesState.activePageId = newId;
    renderActivePage();
}

export function renameActivePage(newName) {
    const page = getActivePage();
    page.name = (newName || '').trim() || page.name;
}

export function deleteActivePage() {
    if (pagesState.pages.length <= 1) return false;
    captureCurrentPage();

    const idx = pagesState.pages.findIndex(p => p.id === pagesState.activePageId);
    if (idx < 0) return false;

    pagesState.pages.splice(idx, 1);
    const newIdx = Math.max(0, idx - 1);
    pagesState.activePageId = pagesState.pages[newIdx].id;
    renderActivePage();
    return true;
}

export function switchPage(pageId) {
    if (!pageId) return;
    if (pageId === pagesState.activePageId) return;

    captureCurrentPage();
    pagesState.activePageId = pageId;
    renderActivePage();
}

// ==========================================
// UI helpers
// ==========================================

export function getPagesForUI() {
    return pagesState.pages.map(p => ({ id: p.id, name: p.name }));
}