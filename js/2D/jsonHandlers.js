import { layer, stage } from './stage.js';
import { erstelleFigur } from './figure.js';
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
            // Nutze die neue Lade-Logik
            loadDataFromArray(d); 
            alert("✅ JSON geladen!");
        } catch (err) { alert("❌ Fehler: " + err.message); }
    };
    r.readAsText(f);
}

function saveJson() {
    const arr = [];
    layer.getChildren().forEach(n => {
        const ud = n.getAttr("userData");
        if (ud) {
            ud.rotation = n.rotation() || 0;
            ud.locked = n.getAttr("locked") || false;
            
            // Bereinige unnötige Daten
            delete ud.labelPos;
            delete ud.labelRot;
            delete ud.edgeLabelData;
            
            arr.push(ud);
        }
    });
    
    const blob = new Blob([JSON.stringify(arr, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "canvas_data.json"; a.click();
    URL.revokeObjectURL(url);
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