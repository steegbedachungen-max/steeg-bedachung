/* global Konva */
import { stage, guideLayer, layer } from './stage.js'; 
import { getActiveScale, getUserData, getSnapThreshold } from './state.js'; 
import { selectNode } from './selection.js'; 
import { getPointerSnap, hidePointerSnap } from './snap.js';

let isActive = false;
let firstPoint = null;
let tempLine = null;
let tempText = null;
let measureButton = null;

let startLineInfo = null; 
let is90DegreeSnapLocked = false;
let snap90DegreeBtn = null;

const originalDragStates = new Map(); 

function convertScreenToWorld(screenPos) {
    if (!screenPos) return null;
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    return transform.point(screenPos);
}

/**
 * Konvertiert absolute Konva-Koordinaten (inkl. Stage-Zoom/Pan) in Welt-Pixel.
 */
function absoluteToWorld(absPoint) {
    const zoom = stage.scaleX() || 1;
    const stagePos = stage.position();
    return {
        x: (absPoint.x - stagePos.x) / zoom,
        y: (absPoint.y - stagePos.y) / zoom
    };
}

function distanceToSegment_m(p, p1, p2) {
    const A = p.x - p1.x, B = p.y - p1.y, C = p2.x - p1.x, D = p2.y - p1.y;
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;
    let xx, yy;
    if (param < 0) { xx = p1.x; yy = p1.y; }
    else if (param > 1) { xx = p2.x; yy = p2.y; }
    else { xx = p1.x + param * C; yy = p1.y + param * D; }
    return Math.hypot(p.x - xx, p.y - yy);
}

function findLineAtPoint(point_m) {
    let closestLine = null;
    const zoom = stage.scaleX() || 1;
    let minDistance = getSnapThreshold(zoom); 
    const scale = getActiveScale();

    layer.getChildren().forEach(fig => {
        const ud = getUserData(fig);
        if (!ud) return;

        let segments = [];
        const transform = fig.getAbsoluteTransform();
        const shape = fig.findOne('.shape');
        if (!shape) return;

        if (ud.typ === 'polygon' && ud.pointsInMeters) {
            const localPoints_px = shape.points();
            const worldPoints_m = [];
            for (let i = 0; i < localPoints_px.length; i += 2) {
                const localP = { x: localPoints_px[i], y: localPoints_px[i+1] };
                const absP = transform.point(localP);
                const worldP_px = absoluteToWorld(absP);
                worldPoints_m.push({ x: worldP_px.x / scale, y: worldP_px.y / scale });
            }

            for (let i = 0; i < worldPoints_m.length; i++) {
                segments.push({ p1: worldPoints_m[i], p2: worldPoints_m[(i + 1) % worldPoints_m.length] });
            }
        } else if ((ud.typ === 'rechteck' || ud.typ === 'pv_modul') && ud.width_meter) {
            const w_px = ud.width_meter * scale;
            const h_px = ud.height_meter * scale;
            
            const localCorners = [
                {x: -w_px / 2, y: -h_px / 2}, 
                {x:  w_px / 2, y: -h_px / 2}, 
                {x:  w_px / 2, y:  h_px / 2}, 
                {x: -w_px / 2, y:  h_px / 2}
            ];

            const corners_px = localCorners.map(p => {
                const absP = transform.point(p);
                return absoluteToWorld(absP);
            });
            const corners_m = corners_px.map(p => ({ x: p.x / scale, y: p.y / scale }));
            
            segments.push({ p1: corners_m[0], p2: corners_m[1] });
            segments.push({ p1: corners_m[1], p2: corners_m[2] });
            segments.push({ p1: corners_m[2], p2: corners_m[3] });
            segments.push({ p1: corners_m[3], p2: corners_m[0] });
        }

        segments.forEach(seg => {
            const dist = distanceToSegment_m(point_m, seg.p1, seg.p2);
            if (dist < minDistance) {
                minDistance = dist;
                closestLine = seg;
            }
        });
    });

    return closestLine;
}


function updateActiveMeasurementLine(snappedWorldPos_m) {
    if (!firstPoint || !tempLine || !tempText) return;
    
    const scale = getActiveScale();
    const zoom = stage.scaleX();
    
    tempLine.points([
        firstPoint.x * scale, firstPoint.y * scale, 
        snappedWorldPos_m.x * scale, snappedWorldPos_m.y * scale
    ]);
    
    const distM = Math.hypot(snappedWorldPos_m.x - firstPoint.x, snappedWorldPos_m.y - firstPoint.y);

    tempText.position({
        x: snappedWorldPos_m.x * scale + 15 / zoom,
        y: snappedWorldPos_m.y * scale + 15 / zoom,
    });
    tempText.text(`${distM.toFixed(2)} m`);
    tempText.fontSize(14 / zoom); 

    guideLayer.batchDraw();
}

function getAngleDifference(angle1, angle2) {
    let diff = Math.abs(angle1 - angle2) % (2 * Math.PI);
    return diff > Math.PI ? (2 * Math.PI) - diff : diff;
}

// === KORRIGIERTE FUNKTION ===
function onMeasureMouseMove() {
    const scale = getActiveScale();
    if (scale === 0) return;
    
    const pointerScreen = stage.getPointerPosition();
    if (!pointerScreen) return; 

    const worldPx = convertScreenToWorld(pointerScreen);
    if (!worldPx) return;

    const rawMousePos_m = { x: worldPx.x / scale, y: worldPx.y / scale };

    // Fall 1: Messung hat noch nicht begonnen. Nur Fangpunkte anzeigen.
    if (!firstPoint) {
        getPointerSnap(rawMousePos_m);
        return;
    }

    // Fall 2: Messung ist aktiv. Alle Berechnungen durchführen.
    const snappedPos_m = getPointerSnap(rawMousePos_m);
    let finalPos_m = snappedPos_m;

    if (is90DegreeSnapLocked && startLineInfo) {
        const baseAngle = startLineInfo.angle;
        const perpAngle1 = baseAngle + Math.PI / 2;
        const perpAngle2 = baseAngle - Math.PI / 2;

        const dx = rawMousePos_m.x - firstPoint.x;
        const dy = rawMousePos_m.y - firstPoint.y;
        const currentAngle = Math.atan2(dy, dx);

        const diff1 = getAngleDifference(currentAngle, perpAngle1);
        const diff2 = getAngleDifference(currentAngle, perpAngle2);
        const chosenAngle = (diff1 < diff2) ? perpAngle1 : perpAngle2;

        const start = firstPoint;
        const target = snappedPos_m; 

        const lineVec = { x: Math.cos(chosenAngle), y: Math.sin(chosenAngle) };
        const pointVec = { x: target.x - start.x, y: target.y - start.y };
        const t = pointVec.x * lineVec.x + pointVec.y * lineVec.y;

        finalPos_m = {
            x: start.x + t * lineVec.x,
            y: start.y + t * lineVec.y
        };
    }
    
    updateActiveMeasurementLine(finalPos_m);
}

export function handleMeasurementClick(e) {
    if (e.evt.button !== 0) return;

    const scale = getActiveScale();
    if (scale === 0) return;
    const zoom = stage.scaleX();
    
    const screenPos = stage.getPointerPosition();
    if (!screenPos) return;

    const worldPos_px = convertScreenToWorld(screenPos);
    if (!worldPos_px) return;

    let worldPos_m = { x: worldPos_px.x / scale, y: worldPos_px.y / scale };
    
    if (is90DegreeSnapLocked && startLineInfo && firstPoint) {
        const baseAngle = startLineInfo.angle;
        const perpAngle1 = baseAngle + Math.PI / 2;
        const perpAngle2 = baseAngle - Math.PI / 2;
        const dx = worldPos_m.x - firstPoint.x;
        const dy = worldPos_m.y - firstPoint.y;
        const currentAngle = Math.atan2(dy, dx);
        const diff1 = getAngleDifference(currentAngle, perpAngle1);
        const diff2 = getAngleDifference(currentAngle, perpAngle2);
        const chosenAngle = (diff1 < diff2) ? perpAngle1 : perpAngle2;
        const target = getPointerSnap(worldPos_m);
        const start = firstPoint;
        const lineVec = { x: Math.cos(chosenAngle), y: Math.sin(chosenAngle) };
        const pointVec = { x: target.x - start.x, y: target.y - start.y };
        const t = pointVec.x * lineVec.x + pointVec.y * lineVec.y;
        worldPos_m = { x: start.x + t * lineVec.x, y: start.y + t * lineVec.y };
    } else {
        worldPos_m = getPointerSnap(worldPos_m);
    }

    const snappedWorldPos_m = worldPos_m;
    hidePointerSnap();
    
    if (!firstPoint) {
        firstPoint = snappedWorldPos_m;
        
        const line = findLineAtPoint(snappedWorldPos_m);
        if (line) {
            const dx = line.p2.x - line.p1.x;
            const dy = line.p2.y - line.p1.y;
            startLineInfo = { angle: Math.atan2(dy, dx) };
            
            is90DegreeSnapLocked = false;
            if (snap90DegreeBtn) {
                snap90DegreeBtn.style.display = 'inline-block';
                snap90DegreeBtn.classList.toggle('active', false);
            }
        } else {
            startLineInfo = null;
            is90DegreeSnapLocked = false;
            if (snap90DegreeBtn) {
                snap90DegreeBtn.style.display = 'none';
                snap90DegreeBtn.classList.remove('active');
            }
        }

        const startPos_px = { x: firstPoint.x * scale, y: firstPoint.y * scale };

        tempLine = new Konva.Line({
            points: [startPos_px.x, startPos_px.y, startPos_px.x, startPos_px.y],
            stroke: '#e74c3c', strokeWidth: 2 / zoom, dash: [6 / zoom, 4 / zoom],
            listening: false, name: 'measureLine_temp'
        });

        tempText = new Konva.Text({
            x: startPos_px.x + 15 / zoom, y: startPos_px.y + 15 / zoom,
            text: '0.00 m', fontSize: 14 / zoom, fill: '#e74c3c',
            listening: false, name: 'measureText_temp'
        });

        guideLayer.add(tempLine, tempText);

    } else {
        const finalPos_m = snappedWorldPos_m;
        const distM = Math.hypot(finalPos_m.x - firstPoint.x, finalPos_m.y - firstPoint.y);
        
        // --- Finales Mess-Element ---
        // Ziel:
        // 1) Text frei von der Bemaessungslinie verschiebbar (drag nur am Text)
        // 2) Text drehbar (Doppelklick: 90°, Mausrad: fein)
        // 3) Offset in SCREEN-Pixeln speichern, damit es bei Zoom stabil bleibt

        const p1_m = { x: firstPoint.x, y: firstPoint.y };
        const p2_m = { x: finalPos_m.x, y: finalPos_m.y };
        const mid_m = { x: (p1_m.x + p2_m.x) / 2, y: (p1_m.y + p2_m.y) / 2 };
        const angle = Math.atan2(p2_m.y - p1_m.y, p2_m.x - p1_m.x);

        const finalGroup = new Konva.Group({
            draggable: false,
            name: 'measurementGroup'
        });
        finalGroup.setAttr('userData', {
            typ: 'measurement',
            p1_m,
            p2_m,
            angle,
            // Text-Offset relativ zum Mittelpunkt in SCREEN-Pixeln
            textOffsetScreen: { x: 15, y: 15 },
            // Text-Rotation relativ zur Linienrichtung (rad)
            textRotation: 0
        });

        tempLine.points([
            p1_m.x * scale, p1_m.y * scale,
            p2_m.x * scale, p2_m.y * scale
        ]);

        const finalLine = tempLine.clone({ name: 'measureLine' });
        const finalText = tempText.clone({ name: 'measureText' });
        finalText.text(`${distM.toFixed(2)} m`);

        // Text interaktiv machen
        finalText.listening(true);
        finalText.draggable(true);

        const applyTextTransform = () => {
            const ud = finalGroup.getAttr('userData');
            if (!ud) return;
            const z = stage.scaleX() || 1;
            const s = getActiveScale();
            const midPx = { x: mid_m.x * s, y: mid_m.y * s };
            const off = ud.textOffsetScreen || { x: 0, y: 0 };
            finalText.position({ x: midPx.x + off.x / z, y: midPx.y + off.y / z });
            finalText.rotation(((ud.angle || 0) + (ud.textRotation || 0)) * 180 / Math.PI);
            finalText.fontSize(14 / z);
        };

        applyTextTransform();

        // Beim Ziehen: Offset in SCREEN-Pixeln speichern
        finalText.on('dragmove', (evt) => {
            evt.cancelBubble = true;
            const ud = finalGroup.getAttr('userData');
            if (!ud) return;
            const z = stage.scaleX() || 1;
            const s = getActiveScale();
            const midPx = { x: mid_m.x * s, y: mid_m.y * s };
            const pos = finalText.position();
            ud.textOffsetScreen = {
                x: (pos.x - midPx.x) * z,
                y: (pos.y - midPx.y) * z
            };
            finalGroup.setAttr('userData', ud);
            applyTextTransform();
            guideLayer.batchDraw();
        });

        // Doppelklick / Doppeltap: 90° drehen
        finalText.on('dblclick dbltap', (evt) => {
            evt.cancelBubble = true;
            const ud = finalGroup.getAttr('userData');
            if (!ud) return;
            ud.textRotation = (ud.textRotation || 0) + Math.PI / 2;
            finalGroup.setAttr('userData', ud);
            applyTextTransform();
            guideLayer.batchDraw();
        });

        // Mausrad ueber Text: fein drehen (Shift = 1° Schritte, sonst 5°)
        finalText.on('wheel', (evt) => {
            evt.evt.preventDefault();
            evt.cancelBubble = true;
            const ud = finalGroup.getAttr('userData');
            if (!ud) return;
            const delta = evt.evt.deltaY;
            const step = evt.evt.shiftKey ? (Math.PI / 180) : (5 * Math.PI / 180);
            ud.textRotation = (ud.textRotation || 0) + (delta > 0 ? step : -step);
            finalGroup.setAttr('userData', ud);
            applyTextTransform();
            guideLayer.batchDraw();
        });

        finalGroup.add(finalLine, finalText);
        guideLayer.add(finalGroup);

        tempLine.destroy();
        tempText.destroy();
        
        firstPoint = null;
        tempLine = null;
        tempText = null;
        startLineInfo = null;
        is90DegreeSnapLocked = false;
        if (snap90DegreeBtn) {
            snap90DegreeBtn.style.display = 'none';
            snap90DegreeBtn.classList.remove('active');
        }
    }
    guideLayer.batchDraw();
}

function handleCancel(e) {
    if (e.type === 'contextmenu') e.evt.preventDefault();
    hidePointerSnap(); 
    stopMeasurement(); 
}

function startMeasurement() {
    isActive = true;
    if (measureButton) measureButton.classList.add('active'); 
    stage.container().style.cursor = 'crosshair'; 
    selectNode(null);
    guideLayer.find('.measurementGroup, .measureLine_temp, .measureText_temp').forEach(el => el.destroy());
    guideLayer.batchDraw();
    originalDragStates.clear(); 
    layer.getChildren().forEach(fig => {
        originalDragStates.set(fig, fig.draggable()); 
        fig.draggable(false); 
    });
    stage.on('mousemove.measure', onMeasureMouseMove);
    stage.on('contextmenu.measure', handleCancel);
    window.addEventListener('keydown', handleEscKey);
}

function handleEscKey(e) {
    if (e.key === 'Escape') {
        handleCancel(e);
    }
}

function stopMeasurement() {
    isActive = false;
    if (measureButton) measureButton.classList.remove('active');
    if (snap90DegreeBtn) snap90DegreeBtn.style.display = 'none';

    stage.container().style.cursor = 'default';
    hidePointerSnap(); 
    if(tempLine) tempLine.destroy();
    if(tempText) tempText.destroy();
    firstPoint = null;
    
    startLineInfo = null; 
    is90DegreeSnapLocked = false;
    if(snap90DegreeBtn) snap90DegreeBtn.classList.remove('active');
    
    layer.getChildren().forEach(fig => {
        const originalState = originalDragStates.get(fig);
        const ud = getUserData(fig);
        const isLocked = ud && ud.locked;
        if (originalState === true && !isLocked) {
             fig.draggable(true);
        } else {
             fig.draggable(false);
        }
    });
    originalDragStates.clear();
    stage.off('contextmenu.measure');
    stage.off('mousemove.measure');
    window.removeEventListener('keydown', handleEscKey);
    
    guideLayer.find('.measurementGroup').forEach(group => {
        group.listening(true);  
        // Gruppe selbst nicht mehr draggable: nur der Text soll verschiebbar sein
        group.draggable(false);
        const line = group.findOne('.measureLine');
        const text = group.findOne('.measureText');
        const onSelectGroup = (e) => {
            e.cancelBubble = true;
            if (isMeasuring()) return; 
            selectNode(group); 
        };
        const showPointer = () => {
            if (isMeasuring()) return;
            stage.container().style.cursor = 'pointer';
        };
        const showDefault = () => {
            if (isMeasuring()) return;
            stage.container().style.cursor = 'default';
        };
        if (line) {
            line.listening(true); 
            line.hitStrokeWidth(20); 
        }
        if (text) {
            text.listening(true); 
        }
        group.on('mousedown.select tap.select', onSelectGroup);
        group.on('mouseenter.select', showPointer);
        group.on('mouseleave.select', showDefault);
    });
}

export function initMeasurementModule(buttonElement) {
    measureButton = buttonElement;
    
    snap90DegreeBtn = document.getElementById('snap-90-degree-btn');
    if (snap90DegreeBtn) {
        snap90DegreeBtn.addEventListener('click', () => {
            is90DegreeSnapLocked = !is90DegreeSnapLocked;
            snap90DegreeBtn.classList.toggle('active', is90DegreeSnapLocked);
        });
    }
}

export function toggleMeasurementMode() {
    if (isActive) {
        stopMeasurement();
    } else {
        startMeasurement();
    }
}

export function isMeasuring() {
    return isActive;
}

export function clearAllMeasurements() {
    guideLayer.find('.measurementGroup, .measureLine_temp, .measureText_temp').forEach(el => el.destroy());
    guideLayer.batchDraw();
    if (firstPoint) {
        firstPoint = null;
    }
}
