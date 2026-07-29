// js/sketchManager.js

import { canvasState, dataState, uiState, getters } from './state.js';
import { normalizeDeletedSegments, newSketch, updateCloseButton } from './sketchLogic.js';
import { requestRedraw } from './canvasRenderer.js';
import { renderSkizzenList } from './aufmassManager.js';
import { generateThumbnail } from './utils.js';

// Interne Kern-Speicherfunktion
function doSave(sketchName) {
    const points = canvasState.points;
    if (!points || points.length < 2) {
        alert("Bitte zuerst eine Skizze zeichnen (mind. 2 Punkte).");
        return false;
    }

    for (const idx of dataState.pendingDeletedSegments) {
        dataState.deletedSegments.add(idx);
    }
    dataState.pendingDeletedSegments.clear();
    normalizeDeletedSegments();

    const scale = getters.getScale();
    const pointsInPixels = points.map(p => ({ x: p.x * scale, y: p.y * scale }));
    const imgData = generateThumbnail(pointsInPixels, dataState.deletedSegments);

    const currentLabels = JSON.parse(JSON.stringify(dataState.segmentLabels));
    const newSegmentInclusion = {};
    for (const key in currentLabels) {
        if (currentLabels[key]) { newSegmentInclusion[key] = true; }
    }

    let accessoriesData = {};
    let materialData = null;
    let daemmungData = null;
    let metallItemsData = [];
    let eindeckungLayersData = [];
    const editIndex = dataState.currentlyEditingSketchIndex;
    const savedSketches = dataState.savedSketches;

    if (editIndex !== null && savedSketches[editIndex]) {
        if (savedSketches[editIndex].accessories) {
            accessoriesData = savedSketches[editIndex].accessories;
        }
        if (savedSketches[editIndex].material) {
            materialData = savedSketches[editIndex].material;
        }
        if (savedSketches[editIndex].daemmung) {
            daemmungData = savedSketches[editIndex].daemmung;
        }
        if (savedSketches[editIndex].metallItems) {
            metallItemsData = savedSketches[editIndex].metallItems;
        }
        if (savedSketches[editIndex].eindeckungLayers) {
            eindeckungLayersData = savedSketches[editIndex].eindeckungLayers;
        }
    }

    const sketchData = {
        name: sketchName,
        points: JSON.parse(JSON.stringify(points)),
        scale: scale,
        image: imgData,
        deletedSegments: Array.from(dataState.deletedSegments),
        labels: currentLabels,
        inclusionMode: 1,
        segmentInclusion: newSegmentInclusion,
        accessories: accessoriesData,
        material: materialData,
        daemmung: daemmungData,
        metallItems: metallItemsData,
        eindeckungLayers: eindeckungLayersData
    };

    if (editIndex !== null && savedSketches[editIndex]) {
        savedSketches[editIndex] = sketchData;
    } else {
        if (!sketchData.accessories) sketchData.accessories = {};
        savedSketches.push(sketchData);
    }
    
    renderSkizzenList();
    return true;
}

// Funktion für "Speichern und weitere Skizze"
export async function saveAndContinue() {
    const name = await window.showPrompt("Name der neuen Skizze", "Bitte geben Sie einen Namen für die neue Skizze ein (z.B. Dach, Gaube):", `Skizze ${dataState.savedSketches.length + 1}`);
    if (name === null) return; // User cancelled

    if (doSave(name)) {
        newSketch();
    }
}

// Funktion für "Skizze speichern" (und zum Aufmaßblatt wechseln)
export async function saveAndExit() {
    const name = await window.showPrompt("Name der neuen Skizze", "Bitte geben Sie einen Namen für die neue Skizze ein (z.B. Dach, Gaube):", `Skizze ${dataState.savedSketches.length + 1}`);
    if (name === null) return; // User cancelled

    if (doSave(name)) {
        newSketch();
        document.getElementById('tab-blatt').click();
    }
}


export async function loadSketch(idx) {
    const sketchToLoad = dataState.savedSketches[idx];
    if (!sketchToLoad) return;
    const confirmed = await window.showConfirm("Skizze laden?", `Möchten Sie die aktuelle Skizze verwerfen und "${sketchToLoad.name}" zum Bearbeiten laden?`);
    if (!confirmed) return;
    
    canvasState.points = JSON.parse(JSON.stringify(sketchToLoad.points));
    dataState.deletedSegments = new Set(sketchToLoad.deletedSegments || []);
    dataState.segmentLabels = JSON.parse(JSON.stringify(sketchToLoad.labels || {}));
    
    document.getElementById('scale').value = sketchToLoad.scale;
    
    dataState.currentlyEditingSketchIndex = idx;

    dataState.pendingDeletedSegments.clear();
    canvasState.activeStartPoint = null;
    canvasState.selectedSegment = null;
    uiState.editSnapshot = null;
    document.getElementById('edit-panel').style.display = 'none';
    canvasState.isPanning = false;
    canvasState.draggingPoint = null;
    canvasState.hoverPos = null;

    document.getElementById('tab-skizze').click();
    
    updateCloseButton();
}

export async function deleteSketch(i) {
    const confirmed = await window.showConfirm("Skizze löschen?", `Soll die Skizze "${dataState.savedSketches[i].name}" wirklich gelöscht werden?`);
    if (!confirmed) return; 
    
    dataState.savedSketches.splice(i, 1);
    
    if (dataState.currentlyEditingSketchIndex === i) {
        dataState.currentlyEditingSketchIndex = null;
    } else if (dataState.currentlyEditingSketchIndex > i) {
        dataState.currentlyEditingSketchIndex--;
    }
    
    renderSkizzenList();
}

export async function clearAllSketches() {
    const confirmed = await window.showConfirm("Alle Skizzen löschen?", "Möchten Sie wirklich alle gespeicherten Skizzen unwiderruflich löschen?");
    if (!confirmed) return;
    dataState.savedSketches = [];
    dataState.currentlyEditingSketchIndex = null;
    renderSkizzenList();
}