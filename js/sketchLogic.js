// js/sketchLogic.js

import { canvasState, dataState, uiState, getters, labelState } from './state.js';
import { requestRedraw } from './canvasRenderer.js';
import { toRadians, toDegrees, approxEqual } from './utils.js';

// NEU: Startet den Prozess, um jede Linie nach dem Schließen zu beschriften
function startLabelingProcess() {
    const points = canvasState.points;
    canvasState.labelingQueue = [];
    for (let i = 0; i < points.length - 1; i++) {
        if (!dataState.deletedSegments.has(i) && !dataState.pendingDeletedSegments.has(i)) {
            // Nur Segmente zur Warteschlange hinzufügen, die noch kein Label haben
            if (!dataState.segmentLabels[i]) {
                canvasState.labelingQueue.push(i);
            }
        }
    }

    if (canvasState.labelingQueue.length > 0) {
        const firstIndex = canvasState.labelingQueue.shift();
        selectSegment(firstIndex); // Dies zeigt das "Segment bearbeiten"-Panel
    } else {
        // Wenn keine Labels benötigt werden, Workflow sofort beenden
        canvasState.isLabelingWorkflowActive = false;
        updateCloseButton(); // Dies zeigt das "Skizze fertig"-Panel
        requestRedraw();
    }
}


function shiftLabelsAfterInsert(startIdx) {
    const newLabels = {};
    for (const key in dataState.segmentLabels) {
        const idx = parseInt(key, 10);
        if (idx > startIdx) {
            newLabels[idx + 1] = dataState.segmentLabels[key];
        } else if (idx < startIdx) {
            newLabels[idx] = dataState.segmentLabels[key];
        }
        else if (idx === startIdx) {
             newLabels[idx] = dataState.segmentLabels[key];
        }
    }
    dataState.segmentLabels = newLabels;
}

function screenToWorld(sx, sy) {
    const canvas = document.getElementById('canvas');
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const zoom = canvasState.zoom;
    const viewOffset = canvasState.viewOffset;
    const scale = getters.getScale();

    if (scale === 0) return { x: 0, y: 0 };

    const worldX_px = (sx - rect.left - viewOffset.x) / zoom;
    const worldY_px = (sy - rect.top - viewOffset.y) / zoom;

    return {
        x: worldX_px / scale,
        y: worldY_px / scale
    };
}
function shiftSegmentSetsAfterInsert(startIdx) {
    const shiftSet = (s) => {
        const ns = new Set();
        for (const idx of s) {
            if (idx >= startIdx) ns.add(idx + 1);
            else ns.add(idx);
        }
        return ns;
    };
    dataState.pendingDeletedSegments = shiftSet(dataState.pendingDeletedSegments);
    dataState.deletedSegments = shiftSet(dataState.deletedSegments);
}

export function normalizeDeletedSegments() {
    const points = canvasState.points;
    const newPending = new Set();
    for (const idx of dataState.pendingDeletedSegments) {
        if (idx < points.length - 1) newPending.add(idx);
    }
    dataState.pendingDeletedSegments = newPending;

    const newDeleted = new Set();
    for (const idx of dataState.deletedSegments) {
        if (idx < points.length - 1) newDeleted.add(idx);
    }
    dataState.deletedSegments = newDeleted;
}


// === KORRIGIERTE FUNKTION ===
export function updateCloseButton() {
    const closeBtn = document.getElementById('close-btn');
    const modeSelect = document.getElementById('mode');
    const distPanel = document.getElementById('dist-winkel-panel');
    const panelTitle = document.getElementById('dist-winkel-title');

    const distInputs = document.getElementById('dist-winkel-inputs');
    const panelActions = document.getElementById('panel-actions-dist-winkel');
    const finishedActions = document.getElementById('panel-finished-actions');
    const hilfspunktToggle = document.getElementById('toggle-hilfspunkt');

    if (!closeBtn || !distPanel || !panelTitle || !distInputs || !panelActions || !finishedActions) return;

    const points = canvasState.points;
    const mode = modeSelect ? modeSelect.value : 'click';

    let buttonDisabled = false;
    let alreadyClosed = false;
    if (points.length < 3) {
        buttonDisabled = true;
        closeBtn.title = "Min. 3 Punkte";
    } else {
        const first = points[0], last = points[points.length - 1];
        alreadyClosed = approxEqual(last.x, first.x) && approxEqual(last.y, first.y);

        if (alreadyClosed) {
            buttonDisabled = true;
            closeBtn.title = "Bereits geschlossen";
        } else {
            buttonDisabled = false;

            closeBtn.title = "Polygon schließen";
        }
    }

    closeBtn.disabled = buttonDisabled;
    closeBtn.style.opacity = buttonDisabled ? 0.5 : 1;

    // Strikte Logik zur Panel-Anzeige
    if (alreadyClosed) {
        // Wenn geschlossen, zeige ENTWEDER "fertig" ODER nichts, aber nie das Eingabe-Panel
        distInputs.style.display = 'none';
        panelActions.style.display = 'none';

        if (canvasState.isLabelingWorkflowActive) {
            // Während der Beschriftung ist das "fertig" Panel aus
            distPanel.style.display = 'none';
            finishedActions.style.display = 'none';
        } else {
            // Nach der Beschriftung ist das "fertig" Panel an
            distPanel.style.display = 'block';
            panelTitle.textContent = "Skizze fertig";
            finishedActions.style.display = 'flex';
            // Im "Skizze fertig"-Zustand gehoert der Hilfspunkt-Pfeil
            // aus dem Distanz-Panel nicht hierher.
            if (hilfspunktToggle) hilfspunktToggle.style.display = 'none';
        }
    } else if (mode === 'distance') {
        // Wenn offen und im Distanz-Modus, zeige das Eingabe-Panel
        distPanel.style.display = 'block';
        panelTitle.textContent = "Distanz & Winkel";
        distInputs.style.display = 'block';
        panelActions.style.display = 'flex';
        finishedActions.style.display = 'none';
        // Hilfspunkt-Pfeil im Eingabe-Modus wieder einblenden
        if (hilfspunktToggle) hilfspunktToggle.style.display = '';

        const distInput = document.getElementById('distance');
        if (document.activeElement !== distInput && document.activeElement.tagName !== 'INPUT') {
           distInput.focus();
           distInput.select();
        }
    } else {
        // In allen anderen Fällen (z.B. Klick-Modus) ist das Panel aus
        distPanel.style.display = 'none';
    }
}




// --- Exportierte Aktionen ---

export function selectPoint(index) {
    canvasState.activeStartPoint = index;
    canvasState.selectedSegment = null;
    uiState.editSnapshot = null;
    document.getElementById('edit-panel').style.display = 'none';
    requestRedraw();
}

export function selectSegment(index) {
    canvasState.selectedSegment = index;
    canvasState.activeStartPoint = null;

    const points = canvasState.points;

    uiState.editSnapshot = points.map(p => ({ x: p.x, y: p.y }));

    const p1 = points[index], p2 = points[index + 1];
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    let mathAng = toDegrees(Math.atan2(p2.y - p1.y, p2.x - p1.x));
    let userAng = (mathAng + 90 + 360) % 360;

    uiState.editSnapshotOriginalLength = len.toFixed(2);
    uiState.editSnapshotOriginalAngle = userAng.toFixed(1);

    document.getElementById('seg-id').textContent = index + 1;
    const lenInput = document.getElementById('edit-length');
    const angInput = document.getElementById('edit-angle');
    
    lenInput.value = uiState.editSnapshotOriginalLength;
    angInput.value = uiState.editSnapshotOriginalAngle;
    document.getElementById('edit-label').value = dataState.segmentLabels[index] || "";

    const dataList = document.getElementById('label-suggestions');
    const sortedLabels = labelState.getSortedLabels();
    dataList.innerHTML = '';
    sortedLabels.forEach(label => {
        const option = document.createElement('option');
        option.value = label;
        dataList.appendChild(option);
    });

    // --- NEU: LOCK-STATUS WIEDERHERSTELLEN ---
    const btnLockLen = document.getElementById('btn-lock-length');
    const btnLockAng = document.getElementById('btn-lock-angle');

    // Länge
    if (p2.lockedLength) {
        btnLockLen.classList.add('locked');
        btnLockLen.innerHTML = '🔒';
        lenInput.disabled = true;
    } else {
        btnLockLen.classList.remove('locked');
        btnLockLen.innerHTML = '🔓';
        lenInput.disabled = false;
    }

    // Winkel
    if (p2.lockedAngle) {
        btnLockAng.classList.add('locked');
        btnLockAng.innerHTML = '🔒';
        angInput.disabled = true;
    } else {
        btnLockAng.classList.remove('locked');
        btnLockAng.innerHTML = '🔓';
        angInput.disabled = false;
    }
    // ----------------------------------------

    document.getElementById('edit-panel').style.display = 'block';
    document.getElementById('edit-label').focus();
    document.getElementById('edit-label').select();
    requestRedraw();
}

export function deselectAll() {
    canvasState.labelingQueue = [];
    canvasState.isLabelingWorkflowActive = false;
    canvasState.selectedSegment = null;
    canvasState.activeStartPoint = null;
    uiState.editSnapshot = null;
    uiState.editSnapshotOriginalLength = "";
    uiState.editSnapshotOriginalAngle = "";
    document.getElementById('edit-panel').style.display = 'none';
    updateCloseButton();
    requestRedraw();
}

export function addPointByClick(worldPos, effectivelyClosed) {
    const points = canvasState.points;

    // NEUE PRÜFUNG: Wenn der neue Punkt dem Startpunkt entspricht, Polygon schließen.
    if (points.length >= 2 && !effectivelyClosed) {
        const first = points[0];
        if (approxEqual(worldPos.x, first.x) && approxEqual(worldPos.y, first.y)) {
            closePolygon();
            return;
        }
    }
    if (effectivelyClosed) {
        canvasState.activeStartPoint = null;
    } else {
        const newPoint = { x: worldPos.x, y: worldPos.y };

        const activeStartPoint = canvasState.activeStartPoint;
        const startIndex = (activeStartPoint !== null && activeStartPoint < points.length) ? activeStartPoint : points.length - 1;
        const insertPos = startIndex + 1;

        points.splice(insertPos, 0, newPoint);

        shiftSegmentSetsAfterInsert(startIndex);
        shiftLabelsAfterInsert(startIndex);

        canvasState.activeStartPoint = insertPos;
        normalizeDeletedSegments();
        updateCloseButton();
    }
    requestRedraw();
}

export function addPointByInput() {
    if (document.getElementById('mode').value === 'click') return;

    const distM = parseFloat(document.getElementById('distance').value) || 0;

    const userAngleDeg = parseFloat(document.getElementById('angle').value) || 0;
    const mathAngleDeg = userAngleDeg - 90;
    const trigAngleRad = toRadians(mathAngleDeg);

    const points = canvasState.points;
    const activeStartPoint = canvasState.activeStartPoint;

    const startIdx = (activeStartPoint !== null && activeStartPoint < points.length) ? activeStartPoint : (points.length - 1);

    if (points.length === 0) {
        points.push({ x: 2, y: 2 });
    }

    const start = points[startIdx];

    const newPoint = {
        x: start.x + distM * Math.cos(trigAngleRad),
        y: start.y + distM * Math.sin(trigAngleRad)
    };

    // NEUE PRÜFUNG: Wenn der neue Punkt dem Startpunkt entspricht, Polygon schließen.
    if (points.length >= 2) {
        const first = points[0];
        if (approxEqual(newPoint.x, first.x) && approxEqual(newPoint.y, first.y)) {
            closePolygon();
            return;
        }
    }
    if (startIdx === points.length - 1) {
        points.push(newPoint);
    } else {
        const insertPos = startIdx + 1;
        points.splice(insertPos, 0, newPoint);
        shiftSegmentSetsAfterInsert(startIdx);
        shiftLabelsAfterInsert(startIdx);
    }

    canvasState.activeStartPoint = null;
    normalizeDeletedSegments();
    updateCloseButton();
    requestRedraw();
}

// Neuer Workflow: Punkt per Horizontal/Vertikal-Offset einmessen
// Konvention (passt zu deiner Aussage "ja"):
//  +X = rechts, -X = links
//  +Y = nach unten, -Y = nach oben (Canvas-typisch)
export function addPointByOffsetXY() {
    if (document.getElementById('mode').value === 'click') return;

    const dx = parseFloat(document.getElementById('offset-x')?.value) || 0;
    const dy = parseFloat(document.getElementById('offset-y')?.value) || 0;

    const points = canvasState.points;
    const activeStartPoint = canvasState.activeStartPoint;
    const startIdx = (activeStartPoint !== null && activeStartPoint < points.length) ? activeStartPoint : (points.length - 1);

    if (points.length === 0) {
        points.push({ x: 2, y: 2 });
    }

    const start = points[startIdx];
    const newPoint = { x: start.x + dx, y: start.y + dy };

    // Wenn Zielpunkt = Startpunkt vom Polygon -> schließen
    if (points.length >= 2) {
        const first = points[0];
        if (approxEqual(newPoint.x, first.x) && approxEqual(newPoint.y, first.y)) {
            closePolygon();
            return;
        }
    }

    // Punkt einfügen (identisch zur addPointByInput-Logik)
    if (startIdx === points.length - 1) {
        points.push(newPoint);
    } else {
        const insertPos = startIdx + 1;
        points.splice(insertPos, 0, newPoint);
        shiftSegmentSetsAfterInsert(startIdx);
        shiftLabelsAfterInsert(startIdx);
    }

    canvasState.activeStartPoint = null;
    normalizeDeletedSegments();
    updateCloseButton();
    requestRedraw();
}

export function undo() {
    const points = canvasState.points;
    if (points.length > 1) {
        const removedSegmentIdx = points.length - 2;
        delete dataState.segmentLabels[removedSegmentIdx];
        points.pop();

        normalizeDeletedSegments();

        canvasState.activeStartPoint = points.length > 0 ? points.length - 1 : null;
        updateCloseButton();
        requestRedraw();
    }
}

export function closePolygon() {
    const points = canvasState.points;
    if (points.length < 3) {
        window.showAlert("Schließen nicht möglich", "Zum Schließen eines Polygons werden mindestens 3 Punkte benötigt.");
        return;
    }
    const first = points[0];
    const last = points[points.length - 1];

    if (approxEqual(last.x, first.x) && approxEqual(last.y, first.y)) {
        return;
    }

    if (points.length > 1) {
        const secondLast = points[points.length - 2];
        if (approxEqual(secondLast.x, last.x) && approxEqual(secondLast.y, last.y)) {
            points.pop();
        }
    }

    points.push({ x: first.x, y: first.y });
    const idx = points.length - 2;

    dataState.deletedSegments.delete(idx);
    dataState.pendingDeletedSegments.delete(idx);

    normalizeDeletedSegments();
    canvasState.activeStartPoint = null;
    document.getElementById('dist-winkel-panel').style.display = 'none';
    canvasState.isLabelingWorkflowActive = true;
    startLabelingProcess();
}
export function newSketch() {
    canvasState.points = [{ x: 2, y: 2 }];
    canvasState.viewOffset = { x: 0, y: 0 };
    canvasState.zoom = 1;
    dataState.pendingDeletedSegments.clear();
    dataState.deletedSegments.clear();
    dataState.segmentLabels = {};
    canvasState.activeStartPoint = null;
    canvasState.selectedSegment = null;
    uiState.editSnapshot = null;
    dataState.currentlyEditingSketchIndex = null;
    canvasState.isLabelingWorkflowActive = false;

    document.getElementById('edit-panel').style.display = 'none';
    updateCloseButton();
    requestRedraw();
}

export function applyEdit() {
    const selectedSegment = canvasState.selectedSegment;
    const editSnapshot = uiState.editSnapshot;
    if (selectedSegment === null || !editSnapshot) return;

    const newLabel = document.getElementById('edit-label').value.trim();
    if (newLabel) {
        dataState.segmentLabels[selectedSegment] = newLabel;
        labelState.incrementLabelUsage(newLabel);
    } else {
        delete dataState.segmentLabels[selectedSegment];
    }

    const newLenStr = document.getElementById('edit-length').value;
    const newAngStr = document.getElementById('edit-angle').value;
    const angleChanged = (newAngStr !== uiState.editSnapshotOriginalAngle);
    const lengthChanged = (newLenStr !== uiState.editSnapshotOriginalLength);

    if (!angleChanged && !lengthChanged) {
        if (canvasState.labelingQueue.length > 0) {
            const nextIndex = canvasState.labelingQueue.shift();
            selectSegment(nextIndex);
        } else {
            deselectAll();
        }
        requestRedraw();
        return;
    }

    const originalUserAngDeg = parseFloat(uiState.editSnapshotOriginalAngle);
    const newUserAngDeg = parseFloat(newAngStr);
    const finalUserAngDeg = (angleChanged && !isNaN(newUserAngDeg)) ? newUserAngDeg : originalUserAngDeg;

    const finalMathAngDeg = finalUserAngDeg - 90;
    const angRad = toRadians(finalMathAngDeg);

    const originalLenM = parseFloat(uiState.editSnapshotOriginalLength);
    const newLenM = parseFloat(newLenStr);
    const finalLenM = (lengthChanged && !isNaN(newLenM)) ? newLenM : originalLenM;
    const i = selectedSegment;
    const newLen = finalLenM;

    const points = canvasState.points;
    const isClosed = points.length > 2 &&
                     approxEqual(points[0].x, points[points.length - 1].x) &&
                     approxEqual(points[0].y, points[points.length - 1].y);

    if (isClosed && i === points.length - 2) {
        const p_fixed = points[i + 1];
        const old_p_start = editSnapshot[i];
        const new_p_start = {
            x: p_fixed.x + newLen * Math.cos(angRad + Math.PI),
            y: p_fixed.y + newLen * Math.sin(angRad + Math.PI)
        };
        const shift = { x: new_p_start.x - old_p_start.x, y: new_p_start.y - old_p_start.y };
        for (let k = 1; k <= i; k++) {
            points[k].x += shift.x;
            points[k].y += shift.y;
        }
    } else {
        const p1 = points[i];
        const oldP2 = editSnapshot[i + 1];
        const newP2 = {
            x: p1.x + newLen * Math.cos(angRad),
            y: p1.y + newLen * Math.sin(angRad)
        };
        const shift = { x: newP2.x - oldP2.x, y: newP2.y - oldP2.y };
        points[i + 1].x = newP2.x;
        points[i + 1].y = newP2.y;

        const loopLimit = isClosed ? points.length - 1 : points.length;
        for (let k = i + 2; k < loopLimit; k++) {
            points[k].x += shift.x;
            points[k].y += shift.y;
        }
    }

    // --- NEU: LOCK-STATUS SPEICHERN ---
    // Wir speichern den aktuellen Status der Buttons im Punkt p2 (Endpunkt des Segments)
    const currentP2 = points[selectedSegment + 1];
    currentP2.lockedLength = document.getElementById('btn-lock-length').classList.contains('locked');
    currentP2.lockedAngle = document.getElementById('btn-lock-angle').classList.contains('locked');
    // ------------------------------------

    // Wenn wir im Beschriftungs-Workflow sind, zum nächsten Segment springen
    if (canvasState.labelingQueue.length > 0) {
        const nextIndex = canvasState.labelingQueue.shift();
        selectSegment(nextIndex);
    } else {
        deselectAll();
    }

    normalizeDeletedSegments();
}
export function cancelEdit() {
    if (canvasState.labelingQueue.length > 0) {
        const nextIndex = canvasState.labelingQueue.shift();
        selectSegment(nextIndex);
    } else {
        deselectAll();
    }
}

export async function deleteSegment() {
    const selectedSegment = canvasState.selectedSegment;
    if (selectedSegment === null) return;
    const confirmed = await window.showConfirm("Linie löschen?", `Soll die Linie #${selectedSegment + 1} wirklich gelöscht werden?`);
    if (!confirmed) return;

    dataState.pendingDeletedSegments.add(selectedSegment);

    if (canvasState.labelingQueue.length > 0) {
        const nextIndex = canvasState.labelingQueue.shift();
        selectSegment(nextIndex);
    } else {
        deselectAll();
    }
    
    normalizeDeletedSegments();
    requestRedraw();
}

export function setScale(newScaleValue) {
    const scaleInput = document.getElementById('scale');
    if (!scaleInput) return;

    const oldScaleValue = parseFloat(scaleInput.value) || 50;
    const newScale = parseFloat(newScaleValue);

    if (isNaN(newScale) || newScale <= 0 || isNaN(oldScaleValue) || oldScaleValue <= 0 || newScale === oldScaleValue) {
         scaleInput.value = newScaleValue;
         requestRedraw();
         return;
    }

    const canvas = document.getElementById('canvas');
    const viewCenterXScreen = canvas.width / 2;
    const viewCenterYScreen = canvas.height / 2;

    const centerWorld_Old = screenToWorld(viewCenterXScreen, viewCenterYScreen);

    scaleInput.value = newScaleValue;

    const zoom = canvasState.zoom;
    const rect = canvas.getBoundingClientRect();
    canvasState.viewOffset.x = viewCenterXScreen - rect.left - (centerWorld_Old.x * newScale * zoom);
    canvasState.viewOffset.y = viewCenterYScreen - rect.top - (centerWorld_Old.y * newScale * zoom);

    requestRedraw();
}