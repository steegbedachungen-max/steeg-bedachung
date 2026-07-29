// js/accessoryManager.js

import { dataState, uiState } from './state.js';
import { renderSkizzenList } from './aufmassManager.js';

/**
 * Öffnet das Zubehör-Modal (Schritt 1).
 * @param {number} sketchIdx 
 */
export function addAccessory(sketchIdx) {
    const sketch = dataState.savedSketches[sketchIdx];
    if (!sketch) return;
    uiState.accessoryModalSketchIdx = sketchIdx;
    document.getElementById('accessory-sketch-name').textContent = sketch.name;
    document.getElementById('accessory-choice-modal').style.display = 'block';
}

/**
 * Schließt das Zubehör-Modal (Schritt 1) und bricht alles ab.
 */
export function cancelAccessoryChoice() {
    document.getElementById('accessory-choice-modal').style.display = 'none';
    uiState.accessoryModalSketchIdx = null;
}

/**
 * Schließt das Fenster-Typ-Modal (Schritt 2) und bricht alles ab.
 */
export function cancelWindowChoice() {
    document.getElementById('window-choice-modal').style.display = 'none';
    uiState.accessoryModalSketchIdx = null;
    uiState.tempWindowType = null;
}

/**
 * Schließt das Fenster-Präfix-Modal (Schritt 3) und bricht alles ab.
 */
export function cancelWindowSizePrefix() {
    document.getElementById('window-size-prefix-modal').style.display = 'none';
    uiState.accessoryModalSketchIdx = null;
    uiState.tempWindowType = null;
}

/**
 * Schließt das Fenster-Suffix-Modal (Schritt 4) und bricht alles ab.
 */
export function cancelWindowSizeSuffix() {
    document.getElementById('window-size-suffix-modal').style.display = 'none';
    uiState.accessoryModalSketchIdx = null;
    uiState.tempWindowType = null;
    uiState.tempWindowPrefix = null;
}

/**
 * Verarbeitet die Auswahl aus dem Haupt-Zubehör-Modal (Schritt 1).
 * @param {string} itemName 
 */
export async function selectAccessoryItem(itemName) {
    const sketchIdx = uiState.accessoryModalSketchIdx;
    if (sketchIdx === null) return;
    const sketch = dataState.savedSketches[sketchIdx];
    
    document.getElementById('accessory-choice-modal').style.display = 'none';
    if (!sketch.accessories) sketch.accessories = {};

    // --- NEUE LOGIK FÜR WOHNRAUMFENSTER ---
    if (itemName === 'Wohnraumfenster') {
        // Öffnet Modal 2 (Fenstertyp)
        // Der accessoryModalSketchIdx bleibt im State gespeichert.
        document.getElementById('window-choice-modal').style.display = 'block';
        return; 
    }
    // --- ENDE NEUE LOGIK ---

    // --- Sonderfall: Sonstiges Zubehör (bleibt gleich) ---
    if (itemName === 'Sonstiges') {
        const customNameInput = await window.showPrompt("Sonstiger Posten", "Bezeichnung für den sonstigen Posten:");
        if (customNameInput === null) {
            uiState.accessoryModalSketchIdx = null; return;
        }
        const customName = customNameInput.trim();
        if (!customName) {
            uiState.accessoryModalSketchIdx = null; return;
        }

        const predefinedItems = ['Kamin', 'Lüfter', 'Wohnraumfenster', 'Stahlfenster', 'Antenne'];
        if (predefinedItems.includes(customName)) {
             await window.showAlert("Fehler", `"${customName}" ist ein vordefinierter Posten und kann nicht als sonstiger Posten hinzugefügt werden.`);
             uiState.accessoryModalSketchIdx = null; return;
        }

        const currentData = sketch.accessories[customName];
        let currentQty = 0;
        let currentUnit = 'Stück';
        if (typeof currentData === 'object' && currentData !== null && typeof currentData.qty === 'number') {
            currentQty = currentData.qty;
            currentUnit = currentData.unit || 'Stück';
        } else if (typeof currentData === 'number') {
            currentQty = currentData;
        }

        const qtyInput = await window.showPrompt(`Menge für "${customName}"`, "Gesamtmenge (0 zum Löschen):", currentQty);
        if (qtyInput === null) { uiState.accessoryModalSketchIdx = null; return; }

        const newQty = parseFloat(qtyInput.replace(',', '.'));
        if (isNaN(newQty) || newQty < 0) {
            await window.showAlert("Ungültige Eingabe", "Die eingegebene Menge ist ungültig.");
            uiState.accessoryModalSketchIdx = null; return;
        }

        if (newQty > 0) {
            const unitInput = await window.showPrompt(`Einheit für "${customName}"`, "Einheit (z.B. Stück, m, m², Pkt):", currentUnit);
            if (unitInput === null) { uiState.accessoryModalSketchIdx = null; return; }
            const newUnit = unitInput.trim() || 'Stück';
            sketch.accessories[customName] = { qty: newQty, unit: newUnit };
            await window.showAlert("Gespeichert", `${newQty} ${newUnit} "${customName}" wurde für die Skizze "${sketch.name}" gespeichert.`);
        } else {
            delete sketch.accessories[customName];
            await window.showAlert("Gelöscht", `Der Posten "${customName}" wurde für die Skizze "${sketch.name}" gelöscht.`);
        }
        uiState.accessoryModalSketchIdx = null;
        renderSkizzenList();
        return;
    }

    // --- Logik für vordefinierte Items (Kamin, Lüfter etc. - OHNE FENSTER) ---
    // (bleibt gleich)
    const validItem = itemName;
    let currentQty = 0;
    let currentData = sketch.accessories[validItem];
    if (typeof currentData === 'object' && currentData !== null && typeof currentData.qty === 'number') {
         currentQty = currentData.qty;
    } else if (typeof currentData === 'number') {
         currentQty = currentData;
    }

    const qtyInput = await window.showPrompt(`Stückzahl für "${validItem}"`, "Gesamtstückzahl (0 zum Löschen):", currentQty);
    if (qtyInput === null) { uiState.accessoryModalSketchIdx = null; return; }

    const newQty = parseInt(qtyInput, 10);
    if (isNaN(newQty) || newQty < 0) {
        await window.showAlert("Ungültige Eingabe", "Die eingegebene Stückzahl ist ungültig.");
        uiState.accessoryModalSketchIdx = null; return;
    }

    if (newQty > 0) {
        sketch.accessories[validItem] = { qty: newQty, unit: 'Stück' };
        await window.showAlert("Gespeichert", `${newQty} Stück "${validItem}" wurde für die Skizze "${sketch.name}" gespeichert.`);
    } else {
        delete sketch.accessories[validItem];
        await window.showAlert("Gelöscht", `Der Posten "${validItem}" wurde für die Skizze "${sketch.name}" gelöscht.`);
    }
    uiState.accessoryModalSketchIdx = null;
    renderSkizzenList();
}


// --- NEUE FUNKTIONEN FÜR DEN MEHRSTUFIGEN FENSTER-PROZESS ---

/**
 * Verarbeitet die Auswahl aus Modal 2 (Fenstertyp).
 * @param {string} typeName z.B. "Velux GGU"
 */
export async function selectWindowType(typeName) {
    document.getElementById('window-choice-modal').style.display = 'none';
    
    // "Sonstiges" fängt den alten Prompt-Workflow ab
    if (typeName === 'Sonstiges') {
        const sketchIdx = uiState.accessoryModalSketchIdx;
        if (sketchIdx === null) return;
        const sketch = dataState.savedSketches[sketchIdx];
        if (!sketch.accessories["Wohnraumfenster"]) {
            sketch.accessories["Wohnraumfenster"] = [];
        }
        
        const customDesc = await window.showPrompt("Benutzerdefiniertes Fenster", "Bitte geben Sie eine genaue Bezeichnung für das Fenster ein:");
        if (customDesc === null) {
            uiState.accessoryModalSketchIdx = null;
            return;
        }
        const finalDesc = customDesc.trim();
        if (!finalDesc) {
            uiState.accessoryModalSketchIdx = null;
            return;
        }

        sketch.accessories["Wohnraumfenster"].push({ desc: finalDesc });
        await window.showAlert("Fenster hinzugefügt", `Das Fenster "${finalDesc}" wurde zur Skizze "${sketch.name}" hinzugefügt.`);
        uiState.accessoryModalSketchIdx = null;
        renderSkizzenList();
    } else {
        // Standard-Workflow: Speichere Typ und öffne Modal 3 (Präfix)
        uiState.tempWindowType = typeName;
        document.getElementById('window-size-prefix-modal').style.display = 'block';
    }
}

/**
 * Verarbeitet die Auswahl aus Modal 3 (Präfix).
 * @param {string} prefix z.B. "MK"
 */
export function selectWindowSizePrefix(prefix) {
    document.getElementById('window-size-prefix-modal').style.display = 'none';
    // Speichere Präfix und öffne Modal 4 (Suffix)
    uiState.tempWindowPrefix = prefix;
    document.getElementById('window-size-suffix-modal').style.display = 'block';
}

/**
 * Verarbeitet die Auswahl aus Modal 4 (Suffix) und schließt den Vorgang ab.
 * @param {string} suffix z.B. "04"
 */
export async function selectWindowSizeSuffix(suffix) {
    document.getElementById('window-size-suffix-modal').style.display = 'none';

    // Hole alle zwischengespeicherten Daten
    const sketchIdx = uiState.accessoryModalSketchIdx;
    const typeName = uiState.tempWindowType;
    const prefix = uiState.tempWindowPrefix;

    if (sketchIdx === null || !typeName || !prefix) {
        await window.showAlert("Fehler", "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
        // State zurücksetzen
        uiState.accessoryModalSketchIdx = null;
        uiState.tempWindowType = null;
        uiState.tempWindowPrefix = null;
        return;
    }

    const sketch = dataState.savedSketches[sketchIdx];
    if (!sketch.accessories["Wohnraumfenster"]) {
        sketch.accessories["Wohnraumfenster"] = [];
    }

    // Endgültige Bezeichnung zusammenbauen
    const finalDesc = `${typeName} (${prefix}${suffix})`;

    // Zum Array hinzufügen
    sketch.accessories["Wohnraumfenster"].push({ desc: finalDesc });
    await window.showAlert("Fenster hinzugefügt", `Das Fenster "${finalDesc}" wurde zur Skizze "${sketch.name}" hinzugefügt.`);

    // State komplett zurücksetzen
    uiState.accessoryModalSketchIdx = null;
    uiState.tempWindowType = null;
    uiState.tempWindowPrefix = null;

    renderSkizzenList();
}