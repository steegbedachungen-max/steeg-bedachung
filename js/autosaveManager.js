// js/autosaveManager.js
//
// Autosave: sichert den kompletten Projektzustand regelmäßig (und beim
// Wechsel in den Hintergrund / Schließen der App) im localStorage, damit auf
// dem iPad nichts verloren geht, wenn die PWA im Hintergrund vom Betriebs-
// system beendet wird.
//
// WICHTIG: Bisher lag der komplette Zustand (Skizzen, 2D-Planung, Notizen)
// NUR im Arbeitsspeicher (dataState/canvasState/pagesState/Konva-Layer) und
// ging beim Schließen der App vollständig verloren, sofern nicht manuell
// exportiert wurde (Projekt-JSON, PDF, Google Drive). Dieser Autosave ändert
// daran nichts am regulären Export-Workflow, sondern dient als reines
// Sicherheitsnetz im Hintergrund.
//
// Auslöser für das Speichern:
//   - alle 15 Sekunden (Intervall)
//   - 'visibilitychange' -> 'hidden' (Nutzer wechselt App/Tab)
//   - 'pagehide' (Seite wird verlassen/beendet)
//   - 'beforeunload' (bestmöglicher Versuch, auf iOS/iPadOS nicht garantiert)
// 'visibilitychange' und 'pagehide' sind entscheidend für iOS/iPadOS PWAs:
// sie feuern zuverlässig, BEVOR die App im Hintergrund vom Betriebssystem
// beendet wird - anders als 'beforeunload', auf das man sich dort nicht
// verlassen kann.

import { canvasState, dataState, uiState, getters } from './state.js';
import { requestRedraw } from './canvasRenderer.js';
import { updateCloseButton } from './sketchLogic.js';
import { renderSkizzenList, renderMaterialPage } from './aufmassManager.js';
import { generateThumbnail } from './utils.js';
import { pagesState, captureCurrentPage, renderActivePage } from './2D/pages.js';
import { getActiveScale, setActiveScale } from './2D/state.js';
import { serializeNotizen, restoreNotizen } from './notizenManager.js';

const AUTOSAVE_KEY = 'aufmassAutosaveV1';
const AUTOSAVE_INTERVAL_MS = 15000;
const AUTOSAVE_VERSION = 1;

let autosaveTimer = null;
let quotaWarningShown = false;

function getProjectFields() {
    return {
        bauvorhaben: document.getElementById('projekt-bauvorhaben')?.value || '',
        name: document.getElementById('projekt-name')?.value || '',
        anschrift: document.getElementById('projekt-anschrift')?.value || '',
        telefon: document.getElementById('projekt-telefon')?.value || '',
        email: document.getElementById('projekt-email')?.value || '',
    };
}

function buildPayload() {
    // Sicherstellen, dass der aktuell auf der 2D-Zeichenfläche sichtbare
    // Bearbeitungsstand in pagesState übernommen wird, bevor wir sichern.
    try { captureCurrentPage(); } catch (e) { /* 2D-Editor evtl. noch nicht bereit */ }

    return {
        version: AUTOSAVE_VERSION,
        savedAt: new Date().toISOString(),
        projekt: getProjectFields(),
        aktuelleSkizze: {
            points: canvasState.points,
            segmentLabels: dataState.segmentLabels,
            deletedSegments: Array.from(dataState.deletedSegments),
            pendingDeletedSegments: Array.from(dataState.pendingDeletedSegments),
            currentlyEditingSketchIndex: dataState.currentlyEditingSketchIndex,
            scale: getters.getScale(),
        },
        // Thumbnails (sk.image) werden bewusst NICHT mitgesichert: das sind
        // Base64-PNGs, die beim Wiederherstellen ohnehin aus den Punkten neu
        // generiert werden (generateThumbnail) - spart deutlich Platz im
        // ohnehin begrenzten localStorage.
        savedSketches: dataState.savedSketches.map(({ image, ...rest }) => rest),
        uiState: {
            pvTotalsPageId: uiState.pvTotalsPageId,
            target2DScale: uiState.target2DScale,
        },
        pages2D: {
            pages: pagesState.pages,
            activePageId: pagesState.activePageId,
            scale: getActiveScale(),
        },
        notizen: serializeNotizen(),
    };
}

/**
 * Versucht die vollständigen Daten zu speichern; falls der localStorage voll
 * ist (z.B. durch große Fotos in den Notizen), wird stufenweise abgespeckt,
 * statt den kompletten Autosave scheitern zu lassen.
 */
function trySaveWithFallback(payload) {
    const attempts = [
        payload,
        { ...payload, notizen: null },
        { ...payload, notizen: null, pages2D: null },
    ];
    for (const attempt of attempts) {
        try {
            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(attempt));
            return true;
        } catch (e) {
            // weiter zum nächsten, abgespeckten Versuch
        }
    }
    return false;
}

function updateIndicator(state) {
    const el = document.getElementById('autosave-indicator');
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    if (state === 'saved') {
        el.textContent = `💾 automatisch gespeichert ${timeStr}`;
        el.classList.remove('autosave-indicator--error');
    } else if (state === 'error') {
        el.textContent = `⚠️ Autosave fehlgeschlagen (Speicher voll)`;
        el.classList.add('autosave-indicator--error');
    }
    el.classList.add('autosave-indicator--visible');
    clearTimeout(updateIndicator._fadeTimer);
    updateIndicator._fadeTimer = setTimeout(() => {
        el.classList.remove('autosave-indicator--visible');
    }, 4000);
}

/**
 * Sichert den aktuellen Projektzustand sofort in den localStorage.
 * @param {{silent?: boolean}} [options] - silent: true unterdrückt die kleine
 * "automatisch gespeichert"-Anzeige unten rechts (genutzt für die
 * automatischen Hintergrund-Speicherungen, damit diese nicht alle 15
 * Sekunden aufploppen). Fehler werden IMMER angezeigt, auch im Silent-Modus,
 * da sie für den Nutzer relevant/handlungsrelevant sind (z.B. Speicher voll).
 */
export function saveAutosave({ silent = false } = {}) {
    try {
        const payload = buildPayload();
        const ok = trySaveWithFallback(payload);
        if (ok) {
            if (!silent) updateIndicator('saved');
        } else if (!quotaWarningShown) {
            quotaWarningShown = true;
            updateIndicator('error');
            console.error('Autosave: localStorage voll, Speichern fehlgeschlagen.');
        }
    } catch (e) {
        console.error('Autosave fehlgeschlagen:', e);
    }
}

function clearAutosave() {
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch (e) { /* ignore */ }
}

function readAutosave() {
    try {
        const raw = localStorage.getItem(AUTOSAVE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        console.error('Autosave: gespeicherte Daten konnten nicht gelesen werden:', e);
        return null;
    }
}

function applyAutosavePayload(payload) {
    // Projektfelder
    const fields = payload.projekt || {};
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    setVal('projekt-bauvorhaben', fields.bauvorhaben);
    setVal('projekt-name', fields.name);
    setVal('projekt-anschrift', fields.anschrift);
    setVal('projekt-telefon', fields.telefon);
    setVal('projekt-email', fields.email);

    // Aktuell in Bearbeitung befindliche Skizze
    const aktuell = payload.aktuelleSkizze;
    if (aktuell) {
        canvasState.points = (Array.isArray(aktuell.points) && aktuell.points.length > 0)
            ? aktuell.points
            : [{ x: 2, y: 2 }];
        dataState.segmentLabels = aktuell.segmentLabels || {};
        dataState.deletedSegments = new Set(aktuell.deletedSegments || []);
        dataState.pendingDeletedSegments = new Set(aktuell.pendingDeletedSegments || []);
        dataState.currentlyEditingSketchIndex = aktuell.currentlyEditingSketchIndex ?? null;
        if (aktuell.scale) {
            const scaleInput = document.getElementById('scale');
            if (scaleInput) scaleInput.value = aktuell.scale;
        }
    }

    // Gespeicherte Skizzen (Thumbnails neu generieren, da nicht mitgesichert)
    const sketches = Array.isArray(payload.savedSketches) ? payload.savedSketches : [];
    dataState.savedSketches = sketches.map(sk => {
        const deletedSet = new Set(sk.deletedSegments || []);
        return { ...sk, image: generateThumbnail(sk.points || [], deletedSet) };
    });

    // UI-Zustand
    if (payload.uiState) {
        uiState.pvTotalsPageId = payload.uiState.pvTotalsPageId ?? 'active';
        uiState.target2DScale = payload.uiState.target2DScale ?? 100;
    }

    // 2D-Planung
    if (payload.pages2D && Array.isArray(payload.pages2D.pages) && payload.pages2D.pages.length > 0) {
        pagesState.pages = payload.pages2D.pages;
        pagesState.activePageId = payload.pages2D.activePageId || payload.pages2D.pages[0].id;
        if (payload.pages2D.scale) setActiveScale(payload.pages2D.scale);
        // Falls die 2D-App in dieser Sitzung bereits initialisiert ist, den
        // wiederhergestellten Stand auch sofort zeichnen. Beim normalen
        // Programmstart (vor dem ersten Öffnen des 2D-Tabs) übernimmt das
        // automatisch start2DApp() beim ersten Öffnen des Tabs.
        try { renderActivePage(); } catch (e) { /* 2D-Editor noch nicht bereit */ }
    }

    // Notizen-Whiteboard
    if (payload.notizen) {
        try { restoreNotizen(payload.notizen); } catch (e) { console.error('Notizen konnten nicht wiederhergestellt werden:', e); }
    }

    updateCloseButton();
    requestRedraw();
    renderSkizzenList();
    renderMaterialPage();
}

function formatTimestamp(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return iso;
    }
}

/**
 * Prüft beim Programmstart, ob ein Autosave-Stand vorliegt, und fragt den
 * Nutzer, ob er wiederhergestellt werden soll.
 * @returns {Promise<boolean>} true, wenn wiederhergestellt wurde (dann soll
 * die normale Projekt-Start-Abfrage NICHT zusätzlich angezeigt werden).
 */
export async function tryRestoreAutosave() {
    const payload = readAutosave();
    if (!payload) return false;

    const zeitpunkt = formatTimestamp(payload.savedAt);
    const confirmed = await window.showConfirm(
        'Automatisch gespeicherten Stand wiederherstellen?',
        `Es wurde ein automatisch gespeicherter Stand vom ${zeitpunkt} gefunden (z.B. weil die App zwischenzeitlich geschlossen wurde, bevor manuell gespeichert/exportiert wurde). Möchten Sie diesen Stand wiederherstellen?`
    );

    if (!confirmed) {
        clearAutosave();
        return false;
    }

    applyAutosavePayload(payload);
    return true;
}

/**
 * Startet den periodischen Autosave sowie die Sicherung bei App-Hintergrund
 * bzw. -Schließung.
 */
export function startAutosave() {
    if (autosaveTimer) return; // bereits gestartet
    // silent: true - die automatischen Speicherungen (Intervall + Hintergrund/
    // Schließen) laufen bewusst UNAUFFÄLLIG im Hintergrund, ohne bei jedem
    // Tick die Anzeige unten rechts aufblinken zu lassen. Fehler (z.B. voller
    // Speicher) werden trotzdem immer angezeigt, siehe saveAutosave().
    autosaveTimer = setInterval(() => saveAutosave({ silent: true }), AUTOSAVE_INTERVAL_MS);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveAutosave({ silent: true });
    });
    window.addEventListener('pagehide', () => saveAutosave({ silent: true }));
    window.addEventListener('beforeunload', () => saveAutosave({ silent: true }));
}