// js/importExportManager.js

import { dataState } from "./state.js";
import { renderSkizzenList, activateAufmassTab } from "./aufmassManager.js";
import { generateThumbnail } from "./utils.js";
import { uploadToGoogleDrive } from "./googleDriveManager.js";
// 2D-Planung/PV-Belegung (separates Canvas-System, siehe js/2D/*) - wird
// seit Version 2.1 ZUSÄTZLICH mit exportiert/importiert (siehe
// buildProjectJsonBlob/handleProjectImport unten). Vorher fehlte das im
// manuellen Projekt-JSON-Export komplett (nur der Autosave in
// autosaveManager.js hat es gesichert) - dieselbe Serialisierungslogik wird
// hier wiederverwendet.
import { pagesState, captureCurrentPage, renderActivePage } from "./2D/pages.js";
import { getActiveScale, setActiveScale } from "./2D/state.js";

/**
 * Hilfsfunktion zum Neu-Generieren von Thumbnails nach Import.
 */
function regenerateSketchImages() {
    dataState.savedSketches.forEach(sk => {
        if (!sk.image) {
            const deletedSet = new Set(sk.deletedSegments || []);
            sk.image = generateThumbnail(sk.points, deletedSet);
        }
    });
}

/**
 * Prüft, ob die 2D-Planung/PV-Belegung irgendwelche Objekte enthält (auf
 * irgendeiner Seite) - damit ein reines 2D-Planung-Projekt (ohne separate
 * Freihand-Skizzen) beim Export nicht fälschlich als "leer" behandelt wird.
 */
function has2DPlanungContent() {
    return (pagesState.pages || []).some(p =>
        (p.objects && p.objects.length > 0) || (p.measurements && p.measurements.length > 0)
    );
}

/**
 * Baut die JSON-Projektdaten (Metadaten + Skizzen + 2D-Planung, jeweils ohne
 * Bilder) als Blob. Gemeinsame Basis für lokalen Download UND
 * Google-Drive-Upload.
 *
 * WICHTIG: bis Version 2.0 fehlte die 2D-Planung/PV-Belegung (pagesState)
 * hier komplett - nur der Hintergrund-Autosave (autosaveManager.js) hat sie
 * gesichert. Ein manueller Projekt-Export/-Import (oder der automatische
 * JSON-Google-Drive-Upload beim PDF-Export) hat die 2D-Zeichnung dadurch
 * NICHT mitgenommen. Seit Version 2.1 wird sie immer mit exportiert -
 * dieselbe Serialisierungslogik wie im Autosave (siehe buildPayload() dort).
 *
 * @returns {Blob|null} null, wenn weder Skizzen noch 2D-Planung-Inhalte vorhanden sind
 */
function buildProjectJsonBlob() {
    const savedSketches = dataState.savedSketches;
    if (savedSketches.length === 0 && !has2DPlanungContent()) return null;

    const metadata = {
        bauvorhaben: document.getElementById('projekt-bauvorhaben').value,
        name: document.getElementById('projekt-name').value,
        anschrift: document.getElementById('projekt-anschrift').value,
        telefon: document.getElementById('projekt-telefon').value,
        email: document.getElementById('projekt-email').value
    };

    const sketchesToExport = savedSketches.map(({ image, ...rest }) => rest);

    // Sicherstellen, dass der aktuell auf der 2D-Zeichenfläche sichtbare
    // Bearbeitungsstand in pagesState übernommen wird, bevor wir sichern
    // (derselbe Grund wie beim Autosave - sonst fehlt ggf. der letzte,
    // noch nicht auf eine andere Seite weggewechselte Bearbeitungsstand).
    try { captureCurrentPage(); } catch (e) { /* 2D-Editor evtl. noch nicht bereit */ }

    const fullProjectData = {
        version: "2.1",
        metadata: metadata,
        sketches: sketchesToExport,
        pages2D: {
            pages: pagesState.pages,
            activePageId: pagesState.activePageId,
            scale: getActiveScale()
        }
    };

    const dataStr = JSON.stringify(fullProjectData, null, 2);
    return new Blob([dataStr], { type: 'application/json' });
}

/**
 * Berechnet den Standard-Dateinamen fürs Projekt (Bauvorhaben oder Datum-basiert).
 * @param {string} [suffix] - optionales Suffix vor der Dateiendung (z.B. "_Angebot")
 */
function computeDefaultProjectFilename(suffix = '') {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    const bauvorhabenInput = (document.getElementById('projekt-bauvorhaben')?.value || '').trim();

    if (bauvorhabenInput) {
        const sanitizedBauvorhaben = bauvorhabenInput.replace(/[\\/:*?"<>|]/g, '_').trim();
        return `${sanitizedBauvorhaben}${suffix}.json`;
    }
    return `aufmass_${dateStr}${suffix}.json`;
}


/**
 * Lädt das Projekt automatisch als JSON nach Google Drive hoch, OHNE nach
 * einem Dateinamen zu fragen und ohne Erfolgsmeldung. Gedacht, um beim
 * PDF-Export automatisch "im Hintergrund" mit hochgeladen zu werden, damit
 * PDF und JSON immer als zusammengehöriges Paar in Google Drive landen.
 * @param {string} [suffix] - optionales Suffix vor der Dateiendung (z.B. "_Angebot"),
 * damit der Dateiname zum PDF passt.
 */
export async function exportProjectDataToGoogleDriveSilent(suffix = '') {
    const blob = buildProjectJsonBlob();
    if (!blob) return false;
    const finalName = computeDefaultProjectFilename(suffix);
    await uploadToGoogleDrive(blob, finalName, 'application/json');
    return true;
}

/**
 * Löst den Datei-Laden-Dialog aus.
 */
export function importProjectDataTrigger() {
    document.getElementById('import-file').click();
}

/**
 * Verarbeitet die geladene JSON-Projekt-Datei (altes und neues Format).
 * @param {Event} event 
 */
async function handleProjectImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            let sketchesToLoad = [];
            let metadata = null;
            let pages2D = null;

            // Prüfen, ob es das neue Format (Version 2.0/2.1) oder das alte Array-Format ist.
            // Version 2.1 enthält zusätzlich "pages2D" (2D-Planung/PV-Belegung) - bei 2.0
            // (oder älteren 2.1-losen Dateien) ist das Feld einfach nicht vorhanden, dann
            // bleibt die aktuelle 2D-Planung beim Import unangetastet.
            if ((importedData.version === "2.0" || importedData.version === "2.1") && importedData.sketches) {
                sketchesToLoad = importedData.sketches;
                metadata = importedData.metadata;
                pages2D = importedData.pages2D || null;
            } else if (Array.isArray(importedData)) {
                sketchesToLoad = importedData;
            } else {
                throw new Error("Ungültiges Projektformat.");
            }

            // Sicherheits-Check für die Skizzen
            if (!Array.isArray(sketchesToLoad) || !sketchesToLoad.every(sk => sk && typeof sk === 'object' && Array.isArray(sk.points))) {
                throw new Error("Ungültige Skizzendaten in der Datei.");
            }
            // Sicherheits-Check für die 2D-Planung (falls vorhanden)
            const has2DToImport = pages2D && Array.isArray(pages2D.pages) && pages2D.pages.length > 0;

            const confirmed = await window.showConfirm(
                "Projekt importieren?",
                `Möchten Sie die aktuellen ${dataState.savedSketches.length} Skizzen${has2DToImport ? ' sowie die aktuelle 2D-Planung' : ''} wirklich durch die ${sketchesToLoad.length} Skizzen${has2DToImport ? ' und die 2D-Planung' : ''} aus der Datei "${file.name}" ersetzen?`
            );

            if (confirmed) {
                // Falls Metadaten vorhanden sind, in die UI eintragen
                if (metadata) {
                    document.getElementById('projekt-bauvorhaben').value = metadata.bauvorhaben || '';
                    document.getElementById('projekt-name').value = metadata.name || '';
                    document.getElementById('projekt-anschrift').value = metadata.anschrift || '';
                    document.getElementById('projekt-telefon').value = metadata.telefon || '';
                    document.getElementById('projekt-email').value = metadata.email || '';
                }

                // Skizzen laden
                dataState.savedSketches = sketchesToLoad.map(sk => {
                    const mode = sk.inclusionMode ?? (sk.includeInTotals === false ? 0 : 1);
                    return { ...sk, image: null, inclusionMode: mode };
                });

                regenerateSketchImages();
                dataState.currentlyEditingSketchIndex = null;
                renderSkizzenList();
                activateAufmassTab();

                // 2D-Planung/PV-Belegung laden (falls in der Datei vorhanden - siehe
                // has2DToImport oben; sonst bleibt die aktuelle 2D-Planung unverändert).
                if (has2DToImport) {
                    pagesState.pages = pages2D.pages;
                    pagesState.activePageId = pages2D.activePageId || pages2D.pages[0].id;
                    if (pages2D.scale) setActiveScale(pages2D.scale);
                    try { renderActivePage(); } catch (err) { /* 2D-Editor evtl. noch nicht bereit (Tab nie geöffnet) */ }
                }

                await window.showAlert("Import erfolgreich", `Das Projekt aus "${file.name}" wurde erfolgreich geladen.`);
            }
        } catch (error) {
            console.error("Importfehler:", error);
            await window.showAlert("Importfehler", `Die Datei konnte nicht geladen werden: ${error.message}`);
        } finally {
            event.target.value = null;
        }
    };

    reader.onerror = async (e) => {
        console.error("Fehler beim Lesen:", e);
        await window.showAlert("Fehler", "Die Datei konnte nicht gelesen werden.");
        event.target.value = null;
    };
    
    reader.readAsText(file);
}

/**
 * Richtet den Listener für das <input type="file"> Element ein.
 */
export function setupImportListener() {
    document.getElementById('import-file').addEventListener('change', handleProjectImport);
}