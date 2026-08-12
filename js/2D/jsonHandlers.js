import { layer, stage } from './stage.js';
import { erstelleFigur } from './figure.js';
import { pagesState, captureCurrentPage, renderActivePage } from './pages.js';
import { getActiveScale, setActiveScale } from './state.js';
// selectNode wird hier nicht direkt importiert, um zirkuläre Abhängigkeiten zu vermeiden

const loadInput = document.getElementById("load-input");
const saveBtn = document.getElementById("save-btn");

let onSelectNodeCallback = null; // Platzhalter für die selectNode-Funktion

function loadJson(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (x) => {
        try {
            const d = JSON.parse(x.target.result);
            if (Array.isArray(d)) {
                // Altes Format (vor der Mehrseiten-Unterstützung): flaches
                // Array von Figuren, betrifft nur die aktuell aktive Seite -
                // aus Kompatibilitätsgründen weiterhin unterstützt.
                loadDataFromArray(d);
            } else if (d && Array.isArray(d.pages)) {
                // Neues Format: ALLE Seiten der 2D-Planung/PV-Belegung
                // (inkl. Dachneigung/-ausrichtung je Seite), siehe saveJson().
                loadPagesFromObject(d);
            } else {
                throw new Error("Unbekanntes Datenformat.");
            }
            alert("✅ JSON geladen!");
        } catch (err) { alert("❌ Fehler: " + err.message); }
    };
    r.readAsText(f);
}

function saveJson() {
    // Sicherstellen, dass der gerade sichtbare Bearbeitungsstand der aktiven
    // Seite in pagesState übernommen wird, bevor wir exportieren - sonst
    // würde eine Bearbeitung ohne vorherigen Seitenwechsel fehlen.
    try { captureCurrentPage(); } catch (e) { /* noch nicht bereit */ }

    // WICHTIG: exportiert ALLE Seiten der 2D-Planung/PV-Belegung (nicht nur
    // die gerade sichtbare) inklusive Dachneigung/-ausrichtung je Seite -
    // vorher wurde hier nur layer.getChildren() der aktiven Seite
    // exportiert, wodurch alle anderen Dachflächen/Seiten beim erneuten
    // Laden verloren gingen.
    const exportData = {
        version: '2d-pages-v1',
        pages: pagesState.pages,
        activePageId: pagesState.activePageId,
        scale: getActiveScale()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "2d_planung.json"; a.click();
    URL.revokeObjectURL(url);
}

/**
 * Lädt ALLE Seiten aus einem Export-Objekt (neues Mehrseiten-Format, siehe
 * saveJson()) - ersetzt die komplette 2D-Planung/PV-Belegung.
 * @param {{pages: Array<object>, activePageId?: string, scale?: number}} data
 */
function loadPagesFromObject(data) {
    if (!Array.isArray(data.pages) || data.pages.length === 0) {
        throw new Error("Datei enthält keine Seiten.");
    }
    pagesState.pages = data.pages;
    pagesState.activePageId = data.activePageId || data.pages[0].id;
    if (data.scale) setActiveScale(data.scale);
    renderActivePage();
}

/**
 * NEUE FUNKTION: Lädt Daten direkt aus einem Array-Objekt.
 * Diese Funktion wird vom Aufmaß-Tool aufgerufen.
 * @param {Array<object>} dataArray - Ein Array von "Figur"-Objekten.
 */
export function loadDataFromArray(dataArray) {
    if (!Array.isArray(dataArray)) throw new Error("Daten müssen ein Array sein!");

    layer.destroyChildren();
    // Hier wird die übergebene Callback-Funktion genutzt
    dataArray.forEach(o => erstelleFigur(o, onSelectNodeCallback));
    stage.draw();
}

/**
 * Initialisiert die JSON-Handler.
 * @param {function} onSelectNode - Die selectNode-Funktion aus dem selection-Modul.
 */
export function initJsonHandlers(onSelectNode) {
    onSelectNodeCallback = onSelectNode; // Speichere die Funktion für loadJson
    loadInput.onchange = loadJson;
    saveBtn.onclick = saveJson;
}