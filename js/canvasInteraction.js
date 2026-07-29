// js/canvasInteraction.js

import { canvasState, dataState, uiState, config, getters } from './state.js';
import { requestRedraw } from './canvasRenderer.js';
import { distanceToSegment, toDegrees, approxEqual } from './utils.js';
import { 
    selectPoint, 
    selectSegment, 
    deselectAll, 
    addPointByClick,
    closePolygon,
    normalizeDeletedSegments
} from './sketchLogic.js';
import { isMeasuring } from './2D/measurement.js';

let canvasElement = null;

// --- TOUCH-STATE VARIABLEN ---
let lastDist = 0;
let lastCenter = null;
let isPinching = false;
let touchMoved = false;
let touchStartTime = 0;
let touchStartPos = { x: 0, y: 0 };
let lastTouchTime = 0;

// --- Hilfsfunktionen für Interaktion ---

function screenToWorld(sx, sy) {
    if (!canvasElement) return { x: 0, y: 0 };
    const rect = canvasElement.getBoundingClientRect();
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


export function computeSnapping(x, y, dragIndex) {
    if (!getters.snapEnabled()) return { snapped: false, x, y };
    
    const scale = getters.getScale();
    const zoom = canvasState.zoom;
    const points = canvasState.points;

    const thresh = config.snapThresholdPxScreen / zoom / scale;

    for (let i = 0; i < points.length; i++) {
        if (i === dragIndex) continue;
        const p = points[i];
        const d = Math.hypot(x - p.x, y - p.y);
        if (d <= thresh) return { snapped: true, x: p.x, y: p.y };
    }

    for (let i = 0; i < points.length; i++) {
        if (i === dragIndex) continue;
        const p = points[i];
        if (Math.abs(x - p.x) <= thresh) return { snapped: true, x: p.x, y };
        if (Math.abs(y - p.y) <= thresh) return { snapped: true, x, y: p.y };
    }
    
    if (getters.snapGridEnabled()) {
        const gridMeters = getters.getGridSize();

        if (gridMeters > 0.01) {
            const gx = Math.round(x / gridMeters) * gridMeters;
            const gy = Math.round(y / gridMeters) * gridMeters;
            if (Math.hypot(x - gx, y - gy) <= thresh) return { snapped: true, x: gx, y: gy };
            if (Math.abs(x - gx) <= thresh) return { snapped: true, x: gx, y };
            if (Math.abs(y - gy) <= thresh) return { snapped: true, x, y: gy };
        }
    }
    return { snapped: false, x, y };
}

function hitPoint(wx, wy) {
    const scale = getters.getScale();
    const zoom = canvasState.zoom;
    const thresh = (config.snapThresholdPxScreen * 1.5) / zoom / scale;
    const points = canvasState.points;
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (Math.hypot(p.x - wx, p.y - wy) <= thresh) return i;
    }
    return null;
}

function hitSegment(wx, wy) {
    const scale = getters.getScale();
    const zoom = canvasState.zoom;
    const thresh = 20 / zoom / scale;
    const points = canvasState.points;
    for (let i = 1; i < points.length; i++) {
        if (dataState.deletedSegments.has(i - 1)) continue;
        if (dataState.pendingDeletedSegments.has(i - 1)) continue;
        
        const p1 = points[i - 1], p2 = points[i];
        const d = distanceToSegment(wx, wy, p1, p2);
        if (d <= thresh) return i - 1;
    }
    return null;
}

// --- TOUCH-HILFSFUNKTIONEN ---

function getTouchPos(e, touchIndex) {
    return {
        x: e.touches[touchIndex].clientX,
        y: e.touches[touchIndex].clientY
    };
}

function getDistance(p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function getCenter(p1, p2) {
    return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
    };
}

// --- TOUCH-EVENT-HANDLER ---

function onTouchStart(e) {
    if (isMeasuring()) return;

    e.preventDefault();
    lastTouchTime = Date.now();
    const touches = e.touches;
    touchMoved = false;
    touchStartTime = Date.now();
    
    if (touches.length === 1) {
        isPinching = false;
        const touch = touches[0];
        touchStartPos = { x: touch.clientX, y: touch.clientY };

        const world = screenToWorld(touch.clientX, touch.clientY);
        const hit = hitPoint(world.x, world.y);

        if (hit !== null) {
            canvasState.isPanning = false;
            canvasState.draggingPoint = hit;
            canvasState.dragStartOffset.x = canvasState.points[hit].x - world.x;
            canvasState.dragStartOffset.y = canvasState.points[hit].y - world.y;

            canvasState.isDraggingClosedLoop = (
                canvasState.points.length > 2 && 
                (hit === 0 || hit === canvasState.points.length - 1) &&
                approxEqual(canvasState.points[0].x, canvasState.points[canvasState.points.length - 1].x) &&
                approxEqual(canvasState.points[0].y, canvasState.points[canvasState.points.length - 1].y)
            );
            requestRedraw();
        } else {
            canvasState.draggingPoint = null;
            canvasState.isPanning = true;
            canvasState.panStart.x = touch.clientX - canvasState.viewOffset.x;
            canvasState.panStart.y = touch.clientY - canvasState.viewOffset.y;
            requestRedraw();
        }

    } else if (touches.length === 2) {
        canvasState.isPanning = false;
        canvasState.draggingPoint = null;
        touchMoved = true;
        isPinching = true;
        const p1 = getTouchPos(e, 0);
        const p2 = getTouchPos(e, 1);
        lastDist = getDistance(p1, p2);
        lastCenter = getCenter(p1, p2);
    }
}

function onTouchMove(e) {
    if (isMeasuring()) return;

    e.preventDefault();
    lastTouchTime = Date.now();
    const touches = e.touches;

    if (isPinching && touches.length === 2) {
        touchMoved = true;
        const p1 = getTouchPos(e, 0);
        const p2 = getTouchPos(e, 1);
        const newDist = getDistance(p1, p2);
        const newCenter = getCenter(p1, p2);

        const before = screenToWorld(lastCenter.x, lastCenter.y);
        const factor = newDist / lastDist;
        
        canvasState.zoom *= factor;
        canvasState.zoom = Math.min(Math.max(canvasState.zoom, 0.2), 12);
        
        const newViewOffsetX = newCenter.x - before.x * getters.getScale() * canvasState.zoom - canvasElement.getBoundingClientRect().left;
        const newViewOffsetY = newCenter.y - before.y * getters.getScale() * canvasState.zoom - canvasElement.getBoundingClientRect().top;
        canvasState.viewOffset.x = newViewOffsetX;
        canvasState.viewOffset.y = newViewOffsetY;
        
        lastDist = newDist;
        lastCenter = newCenter;
        requestRedraw();

    } else if (!isPinching && touches.length === 1) {
        const touch = touches[0];
        const dist = Math.hypot(touch.clientX - touchStartPos.x, touch.clientY - touchStartPos.y);
        if (dist > 10) {
            touchMoved = true;
        }
        
        if (touchMoved) {
            canvasState.mouseWorld = screenToWorld(touch.clientX, touch.clientY);

            if (canvasState.draggingPoint !== null) {
                let nx = canvasState.mouseWorld.x + canvasState.dragStartOffset.x;
                let ny = canvasState.mouseWorld.y + canvasState.dragStartOffset.y;
                
                const snap = computeSnapping(nx, ny, canvasState.draggingPoint);
                if (snap.snapped) { nx = snap.x; ny = snap.y; }

                canvasState.points[canvasState.draggingPoint].x = nx;
                canvasState.points[canvasState.draggingPoint].y = ny;

                if (canvasState.isDraggingClosedLoop) {
                    const lastIndex = canvasState.points.length - 1;
                    if (canvasState.draggingPoint === 0) {
                        canvasState.points[lastIndex].x = nx;
                        canvasState.points[lastIndex].y = ny;
                    } else if (canvasState.draggingPoint === lastIndex) {
                        canvasState.points[0].x = nx;
                        canvasState.points[0].y = ny;
                    }
                }
                normalizeDeletedSegments();
                requestRedraw();

            } else if (canvasState.isPanning) {
                canvasState.viewOffset.x = touch.clientX - canvasState.panStart.x;
                canvasState.viewOffset.y = touch.clientY - canvasState.panStart.y;
                requestRedraw();
            }

            if (document.getElementById('mode').value === 'click') {
                const snap = computeSnapping(canvasState.mouseWorld.x, canvasState.mouseWorld.y, null);
                canvasState.hoverPos = snap.snapped ? { x: snap.x, y: snap.y } : { x: canvasState.mouseWorld.x, y: canvasState.mouseWorld.y };
            } else {
                canvasState.hoverPos = null;
            }
            requestRedraw();
        }
    }
}

function onTouchEnd(e) {
    if (isMeasuring()) return;
    
    lastTouchTime = Date.now();
    const tapDuration = Date.now() - touchStartTime;

    if (e.touches.length === 0 && !isPinching) {
        if (!touchMoved && tapDuration < 300) {
            const touch = e.changedTouches[0];
            const world = screenToWorld(touch.clientX, touch.clientY);
            const mode = document.getElementById('mode').value;
            const pIdx = hitPoint(world.x, world.y);
            const points = canvasState.points;
            
            let effectivelyClosed = false;
            if (points.length > 2) {
              const first = points[0], last = points[points.length - 1];
              const closingSegmentIndex = points.length - 2;
              effectivelyClosed = approxEqual(first.x, last.x) && approxEqual(first.y, last.y) &&
                                  !dataState.deletedSegments.has(closingSegmentIndex) &&
                                  !dataState.pendingDeletedSegments.has(closingSegmentIndex);
            }
            
            // FINALE KORREKTUR: Polygon schließen hat absolute Priorität
            if (mode === 'click' && pIdx === 0 && points.length >= 3 && !effectivelyClosed) {
                const activeStartPoint = canvasState.activeStartPoint;
                const startCloseIdx = (activeStartPoint !== null && activeStartPoint < points.length) ? activeStartPoint : points.length - 1;
                if (startCloseIdx !== 0) {
                    closePolygon();
                    return; // WICHTIG: Beendet die Funktion hier, um Konflikte zu vermeiden.
                }
            }

            // Zweite Priorität: Punkt oder Segment auswählen
            if (pIdx !== null) {
                selectPoint(pIdx);
            } else {
                const seg = hitSegment(world.x, world.y);
                if (seg !== null) {
                    selectSegment(seg);
                } else {
                    // Letzte Priorität: Deselektieren und ggf. neuen Punkt hinzufügen
                    deselectAll();
                    if (mode === 'click') {
                        const snap = computeSnapping(world.x, world.y, null);
                        const snappedWorldPos = snap.snapped ? { x: snap.x, y: snap.y } : world;
                        addPointByClick(snappedWorldPos, effectivelyClosed);
                    }
                }
            }
        }
    }

    // Cleanup-Logik, die immer laufen muss
    if (e.touches.length === 0) {
        canvasState.draggingPoint = null;
        canvasState.isDraggingClosedLoop = false;
        canvasState.isPanning = false;
        isPinching = false;
        canvasState.hoverPos = null;
        requestRedraw();

    } else if (e.touches.length === 1) {
        isPinching = false;
        const touch = e.touches[0];
        canvasState.isPanning = true;
        canvasState.panStart.x = touch.clientX - canvasState.viewOffset.x;
        canvasState.panStart.y = touch.clientY - canvasState.viewOffset.y;
    }
    
    touchMoved = false;
    touchStartTime = 0;
}


// --- MAUS-EVENT-HANDLER ---

function onMouseMove(e) {
    if (isMeasuring()) {
        return;
    }

    canvasState.lastMouseMoveTime = Date.now();
    canvasState.mouseWorld = screenToWorld(e.clientX, e.clientY);

    if (canvasState.draggingPoint !== null) {
        let nx = canvasState.mouseWorld.x + canvasState.dragStartOffset.x;
        let ny = canvasState.mouseWorld.y + canvasState.dragStartOffset.y;
        
        const snap = computeSnapping(nx, ny, canvasState.draggingPoint);
        if (snap.snapped) { nx = snap.x; ny = snap.y; }

        canvasState.points[canvasState.draggingPoint].x = nx;
        canvasState.points[canvasState.draggingPoint].y = ny;

        if (canvasState.isDraggingClosedLoop) {
            const lastIndex = canvasState.points.length - 1;
            if (canvasState.draggingPoint === 0) {
                canvasState.points[lastIndex].x = nx;
                canvasState.points[lastIndex].y = ny;
            } else if (canvasState.draggingPoint === lastIndex) {
                canvasState.points[0].x = nx;
                canvasState.points[0].y = ny;
            }
        }
        
        normalizeDeletedSegments();
        requestRedraw();
        return;
    }

    if (canvasState.isPanning) {
        canvasState.viewOffset.x = e.clientX - canvasState.panStart.x;
        canvasState.viewOffset.y = e.clientY - canvasState.panStart.y;
        canvasElement.style.cursor = 'grabbing';
        requestRedraw();
        return;
    }

    const hit = hitPoint(canvasState.mouseWorld.x, canvasState.mouseWorld.y);
    canvasElement.style.cursor = (hit !== null ? 'pointer' : 'grab');

    if (document.getElementById('mode').value === 'click') {
        const snap = computeSnapping(canvasState.mouseWorld.x, canvasState.mouseWorld.y, null);
        canvasState.hoverPos = snap.snapped ? { x: snap.x, y: snap.y } : { x: canvasState.mouseWorld.x, y: canvasState.mouseWorld.y };
    } else {
        canvasState.hoverPos = null;
    }
    requestRedraw();
}

function onMouseDown(e) {
    if (isMeasuring()) return;

    const world = screenToWorld(e.clientX, e.clientY);
    const hit = hitPoint(world.x, world.y);

    if (e.button === 0) {
        if (hit !== null) {
            canvasState.draggingPoint = hit;
            canvasState.dragStartOffset.x = canvasState.points[hit].x - world.x;
            canvasState.dragStartOffset.y = canvasState.points[hit].y - world.y;
            canvasElement.style.cursor = 'grabbing';

            canvasState.isDraggingClosedLoop = (
                canvasState.points.length > 2 && 
                (hit === 0 || hit === canvasState.points.length - 1) &&
                approxEqual(canvasState.points[0].x, canvasState.points[canvasState.points.length - 1].x) &&
                approxEqual(canvasState.points[0].y, canvasState.points[canvasState.points.length - 1].y)
            );
            requestRedraw();
            return; 
        }
        canvasState.isPanning = true;
        canvasState.panStart.x = e.clientX - canvasState.viewOffset.x;
        canvasState.panStart.y = e.clientY - canvasState.viewOffset.y;
        canvasElement.style.cursor = 'grabbing';
        requestRedraw();
    }

    if (e.button === 1 || e.button === 2 || (e.shiftKey && e.button === 0)) {
        if (!canvasState.isPanning) {
            canvasState.isPanning = true;
            canvasState.panStart.x = e.clientX - canvasState.viewOffset.x;
            canvasState.panStart.y = e.clientY - canvasState.viewOffset.y;
            canvasElement.style.cursor = 'grabbing';
            requestRedraw();
        }
        e.preventDefault();
        return;
    }
}

function onMouseUp(e) {
    if (isMeasuring()) return;

    if (canvasState.draggingPoint !== null) {
        canvasState.draggingPoint = null;
        canvasState.isDraggingClosedLoop = false;
        canvasElement.style.cursor = 'grab';
        requestRedraw();
    }
    if (canvasState.isPanning) {
        canvasState.isPanning = false;
        setTimeout(() => {
            const worldNow = screenToWorld(e.clientX, e.clientY);
            const hitNow = hitPoint(worldNow.x, worldNow.y);
            canvasElement.style.cursor = (hitNow !== null ? 'pointer' : 'grab');
            requestRedraw();
        }, 50);
    }
}

function onMouseLeave() {
    if (isMeasuring()) return;

    canvasState.mouseWorld = null;
    canvasState.hoverPos = null;
    if (canvasState.draggingPoint !== null) {
        canvasState.draggingPoint = null;
        canvasState.isDraggingClosedLoop = false;
        requestRedraw();
    }
    if (canvasState.isPanning) {
        canvasState.isPanning = false;
        requestRedraw();
    }
    canvasElement.style.cursor = 'grab';
}

function onClick(e) {
    if (isMeasuring()) return;
    
    const mouseMovedRecently = (Date.now() - canvasState.lastMouseMoveTime < 60);
    const touchEventRecently = (lastTouchTime > 0 && (Date.now() - lastTouchTime < 500));

    if (canvasState.draggingPoint !== null || canvasState.isPanning || mouseMovedRecently || touchEventRecently) {
       if (canvasState.isPanning) {
           canvasState.isPanning = false;
           const worldNow = screenToWorld(e.clientX, e.clientY);
           const hitNow = hitPoint(worldNow.x, worldNow.y);
           canvasElement.style.cursor = (hitNow !== null ? 'pointer' : 'grab');
           requestRedraw();
       }
       return; 
    }

    const world = screenToWorld(e.clientX, e.clientY);
    const mode = document.getElementById('mode').value;
    const pIdx = hitPoint(world.x, world.y);
    const points = canvasState.points;
    
    let effectivelyClosed = false;
    if (points.length > 2) {
      const first = points[0], last = points[points.length - 1];
      const closingSegmentIndex = points.length - 2;
      effectivelyClosed = approxEqual(first.x, last.x) && approxEqual(first.y, last.y) &&
                          !dataState.deletedSegments.has(closingSegmentIndex) &&
                          !dataState.pendingDeletedSegments.has(closingSegmentIndex);
    }

    // FINALE KORREKTUR: Polygon schließen hat absolute Priorität
    if (mode === 'click' && pIdx === 0 && points.length >= 3 && !effectivelyClosed) {
        const activeStartPoint = canvasState.activeStartPoint;
        const startCloseIdx = (activeStartPoint !== null && activeStartPoint < points.length) ? activeStartPoint : points.length - 1;
        if (startCloseIdx !== 0) {
            closePolygon();
            return; // WICHTIG: Beendet die Funktion hier, um Konflikte zu vermeiden.
        }
    }

    // Zweite Priorität: Punkt oder Segment auswählen
    if (pIdx !== null) {
        selectPoint(pIdx); 
        return;
    }

    const seg = hitSegment(world.x, world.y);
    if (seg !== null) {
        selectSegment(seg); 
        return;
    }

    // Letzte Priorität: Deselektieren und ggf. neuen Punkt hinzufügen
    deselectAll(); 

    if (mode === 'click') {
        const snap = computeSnapping(world.x, world.y, null);
        const snappedWorldPos = snap.snapped ? { x: snap.x, y: snap.y } : world;
        addPointByClick(snappedWorldPos, effectivelyClosed);
    }
}

function onWheel(e) {
    if (isMeasuring()) {
        e.preventDefault();
        return;
    }

    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    const before = screenToWorld(sx, sy);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    
    canvasState.zoom *= factor;
    canvasState.zoom = Math.min(Math.max(canvasState.zoom, 0.2), 12);
    
    const newViewOffsetX = sx - before.x * getters.getScale() * canvasState.zoom - canvasElement.getBoundingClientRect().left;
    const newViewOffsetY = sy - before.y * getters.getScale() * canvasState.zoom - canvasElement.getBoundingClientRect().top;
    canvasState.viewOffset.x = newViewOffsetX;
    canvasState.viewOffset.y = newViewOffsetY;
    
    requestRedraw();
}

// --- Haupt-Export ---

export function setupCanvasListeners(canvas) {
    if (!canvas) return;
    canvasElement = canvas;
    
    lastTouchTime = 0;

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);
}
