// js/importExportManager.js

import { dataState } from "./state.js";
import { renderSkizzenList, activateAufmassTab } from "./aufmassManager.js";
import { generateThumbnail } from "./utils.js";
import { uploadToGoogleDrive } from "./googleDriveManager.js";

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
 * Baut die JSON-Projektdaten (Metadaten + Skizzen ohne Bilder) als Blob.
 * Gemeinsame Basis für lokalen Download UND Google-Drive-Upload.
 * @returns {Blob|null} null, wenn keine Skizzen vorhanden sind
 */
function buildProjectJsonBlob() {
    const savedSketches = dataState.savedSketches;
    if (savedSketches.length === 0) return null;

    const metadata = {
        bauvorhaben: document.getElementById('projekt-bauvorhaben').value,
        name: document.getElementById('projekt-name').value,
        anschrift: document.getElementById('projekt-anschrift').value,
        telefon: document.getElementById('projekt-telefon').value,
        email: document.getElementById('projekt-email').value
    };

    const sketchesToExport = savedSketches.map(({ image, ...rest }) => rest);

    const fullProjectData = {
        version: "2.0",
        metadata: metadata,
        sketches: sketchesToExport
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

            // Prüfen, ob es das neue Format (Version 2.0) oder das alte Array-Format ist
            if (importedData.version === "2.0" && importedData.sketches) {
                sketchesToLoad = importedData.sketches;
                metadata = importedData.metadata;
            } else if (Array.isArray(importedData)) {
                sketchesToLoad = importedData;
            } else {
                throw new Error("Ungültiges Projektformat.");
            }

            // Sicherheits-Check für die Skizzen
            if (!Array.isArray(sketchesToLoad) || !sketchesToLoad.every(sk => sk && typeof sk === 'object' && Array.isArray(sk.points))) {
                throw new Error("Ungültige Skizzendaten in der Datei.");
            }

            const confirmed = await window.showConfirm(
                "Projekt importieren?",
                `Möchten Sie die aktuellen ${dataState.savedSketches.length} Skizzen wirklich durch die ${sketchesToLoad.length} Skizzen aus der Datei "${file.name}" ersetzen?`
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