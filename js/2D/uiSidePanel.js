import { layer } from './stage.js';
import { selectedNode } from './state.js';
// Importiert Logik aus figure.js
import { normalizeEdgeLabels, updateLockVisual } from './figure.js';
import { deleteSelectedNode } from './selection.js'; // <-- ##### IMPORT IST BEREITS VORHANDEN #####
import { refreshAutoDimensions } from './autoDimension.js';
import { refreshShadingSync } from './shading.js';

// --- DOM-Referenzen ---
const xInput = document.getElementById("pos-x");
const yInput = document.getElementById("pos-y");
const rotInput = document.getElementById("rotation-input");
const bM1 = document.getElementById("rot-m1");
const bM5 = document.getElementById("rot-m5");
const bP1 = document.getElementById("rot-p1");
const bP5 = document.getElementById("rot-p5");
const lockBtn = document.getElementById("lock-btn");
const frontBtn = document.getElementById("front-btn");
const backBtn = document.getElementById("back-btn");

const bM90 = document.getElementById("rot-m90");
const bP90 = document.getElementById("rot-p90");
const deleteBtn = document.getElementById("delete-btn"); 

// --- Private Helfer ---
// HINWEIS: setPanelEnabled(on) wird durch die neue updatePanelState-Logik ersetzt.

function setRotationAroundCenter(node, angle) {
    node.rotation(angle);
    normalizeEdgeLabels(node); // Helfer aus figure.js
    layer.batchDraw();
    refreshAutoDimensions();
    refreshShadingSync();
}

function rotStep(d) {
    if (!selectedNode) return;
    const a = (selectedNode.rotation() || 0) + d;
    rotInput.value = Math.round(a);
    setRotationAroundCenter(selectedNode, a);
}

// --- Exportierte Funktionen ---

/**
 * Aktualisiert die Werte im Panel basierend auf dem ausgewählten Knoten.
 * Wird von selectNode() aufgerufen.
 *
 * ##### HIER IST DIE NEUE LOGIK #####
 */
export function updatePanelState(n) {
    // Alle Eingabefelder und Buttons
    const allInputs = [xInput, yInput, rotInput, bM1, bM5, bP1, bP5, bM90, bP90, lockBtn, frontBtn, backBtn, deleteBtn];

    if (n && (n.name() === 'measurementGroup')) {
        // --- Fall 1: Eine Messlinie ist ausgewählt ---
        
        // Deaktiviere alles, *außer* dem Löschen-Button
        allInputs.forEach(input => {
            if (input !== deleteBtn) {
                input.disabled = true;
            } else {
                input.disabled = false; // Löschen-Button aktivieren
            }
        });
        
        // Felder leeren
        xInput.value = "";
        yInput.value = "";
        rotInput.value = "";
        lockBtn.textContent = "🔒 Lock";

    } else if (n) {
        // --- Fall 2: Eine normale Form ist ausgewählt ---
        
        // Aktiviere alles
        allInputs.forEach(input => input.disabled = false);
        
        // Fülle die Felder
        const pos = n.position();
        xInput.value = Math.round(pos.x);
        yInput.value = Math.round(pos.y);
        rotInput.value = Math.round(n.rotation() || 0);
        lockBtn.textContent = n.getAttr("locked") ? "🔓 Unlock" : "🔒 Lock";
        
    } else {
        // --- Fall 3: Nichts ist ausgewählt ---
        
        // Deaktiviere alles
        allInputs.forEach(input => input.disabled = true);
        
        // Felder leeren
        xInput.value = "";
        yInput.value = "";
        rotInput.value = "";
        lockBtn.textContent = "🔒 Lock";
    }
}

/**
 * Hängt alle Event-Listener an die Panel-Buttons.
 */
export function initSidePanel() {
    xInput.oninput = () => { if (!selectedNode) return; const x = parseFloat(xInput.value); if (isFinite(x)) { const p = selectedNode.position(); selectedNode.position({ x, y: p.y }); layer.batchDraw(); refreshAutoDimensions(); refreshShadingSync(); } };
    yInput.oninput = () => { if (!selectedNode) return; const y = parseFloat(yInput.value); if (isFinite(y)) { const p = selectedNode.position(); selectedNode.position({ x: p.x, y }); layer.batchDraw(); refreshAutoDimensions(); refreshShadingSync(); } };
    rotInput.oninput = () => { if (!selectedNode) return; const v = parseFloat(rotInput.value); if (isFinite(v)) setRotationAroundCenter(selectedNode, v); };
    
    bM1.onclick = () => rotStep(-1);
    bM5.onclick = () => rotStep(-5);
    bP1.onclick = () => rotStep(1);
    bP5.onclick = () => rotStep(5);

    bM90.onclick = () => rotStep(-90);
    bP90.onclick = () => rotStep(90);
    
    lockBtn.onclick = () => {
        if (!selectedNode) return;
        const locked = !selectedNode.getAttr("locked");
        selectedNode.setAttr("locked", locked);
        selectedNode.draggable(!locked);
        lockBtn.textContent = locked ? "🔓 Unlock" : "🔒 Lock";
        updateLockVisual(selectedNode); // Helfer aus figure.js
    };
    
    frontBtn.onclick = () => { if (selectedNode) { selectedNode.moveToTop(); layer.batchDraw(); } };
    backBtn.onclick = () => { if (selectedNode) { selectedNode.moveToBottom(); layer.batchDraw(); } };
    
    // Dieser Button funktioniert jetzt für Formen UND Messlinien
    deleteBtn.onclick = () => {
        if (selectedNode && confirm("Soll das ausgewählte Objekt wirklich gelöscht werden?")) {
            deleteSelectedNode(); // Diese Funktion löscht 'selectedNode', egal was es ist
        }
    };
}