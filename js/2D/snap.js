/* global Konva */
import { stage, layer, guideLayer } from './stage.js';
import { snapEnabled, getUserData, getActiveScale, getSnapThreshold, SNAP_RADIUS_PX } from './state.js';
import { highlightNode } from './selection.js';

// --- Private Helfer ---

const snapIndicator = new Konva.Circle({
    radius: 6,
    stroke: 'red',
    strokeWidth: 2,
    visible: false,
    listening: false,
});
if (guideLayer.getChildren(node => node === snapIndicator).length === 0) {
     guideLayer.add(snapIndicator);
}

function getUserFigure(t) {
    if (!t) return null;
    if (t.name() === 'edgeLabel' || t.name() === 'mainLabel') return null; 
    if (getUserData(t)) return t;
    const p = t.getParent && t.getParent();
    return p && getUserData(p) ? p : null;
}

/**
 * Konvertiert einen Punkt von absoluten Stage-Koordinaten (inkl. Stage-Zoom/Pan)
 * in Welt-Koordinaten (Layer-Space, ohne Stage-Zoom/Pan).
 */
function absoluteToWorld(absPoint) {
    const stageTransform = stage.getAbsoluteTransform().copy();
    stageTransform.invert();
    // Das gibt uns den Punkt im Stage-eigenen Raum zurück,
    // aber da Layer direkt auf der Stage liegen, ist das = Welt-Pixel
    // Wir brauchen es anders: stage transform rausrechnen
    const zoom = stage.scaleX() || 1;
    const stagePos = stage.position();
    return {
        x: (absPoint.x - stagePos.x) / zoom,
        y: (absPoint.y - stagePos.y) / zoom
    };
}

// === KORRIGIERTE FUNKTION ===
export function getObjectSnapLines(n) {
    const ud = getUserData(n);
    if (!ud) return { vertical: [], horizontal: [], points: [] };

    if (ud.typ === 'kreis') return { vertical: [], horizontal: [], points: [] };

    const shape = n.findOne('.shape');
    if (!shape) return { vertical: [], horizontal: [], points: [] };
    
    const scale = getActiveScale();
    if (scale === 0) return { vertical: [], horizontal: [], points: [] };
    
    const zoom = stage.scaleX() || 1;

    // === 1) Eckpunkte fuer Point-Snap ===
    const points = [];
    try {
        const transform = n.getAbsoluteTransform();

        if (ud.typ === 'polygon' && ud.pointsInMeters) {
            const localPoints_m = ud.pointsInMeters;
            localPoints_m.forEach(p_m => {
                const localP_px = { x: p_m.x * scale, y: p_m.y * scale };
                const absP = transform.point(localP_px);
                // Stage-Transform rausrechnen → Welt-Pixel → in Meter
                const worldP_px = absoluteToWorld(absP);
                points.push({ x: worldP_px.x / scale, y: worldP_px.y / scale });
            });
        } else if ((ud.typ === 'rechteck' || ud.typ === 'pv_modul') && ud.width_meter) {
            const w_px = ud.width_meter * scale;
            const h_px = ud.height_meter * scale;
            const localCorners = [
                { x: -w_px / 2, y: -h_px / 2 },
                { x:  w_px / 2, y: -h_px / 2 },
                { x:  w_px / 2, y:  h_px / 2 },
                { x: -w_px / 2, y:  h_px / 2 }
            ];
            localCorners.forEach(p => {
                const absP = transform.point(p);
                const worldP_px = absoluteToWorld(absP);
                points.push({ x: worldP_px.x / scale, y: worldP_px.y / scale });
            });
        }
    } catch (e) {
        // Fallback: keine Point-Snaps
    }
    
    // === 2) Achsen-Snaplines (Bounding-Box) ===
    // getClientRect({ skipTransform: false }) gibt Werte in SCREEN-Pixel (inkl. Stage-Zoom/Pan).
    // Wir muessen Stage-Zoom und Stage-Pan rausrechnen.
    const strokeWidth = shape.strokeWidth() || 0;
    const clientRect = shape.getClientRect({ skipTransform: false });

    // Screen-Pixel → Welt-Pixel (Stage-Transform rausrechnen)
    const stagePos = stage.position();
    const worldRect = {
        x: (clientRect.x - stagePos.x) / zoom,
        y: (clientRect.y - stagePos.y) / zoom,
        width: clientRect.width / zoom,
        height: clientRect.height / zoom,
    };

    // Stroke-Korrektur (in Welt-Pixel, nicht Screen-Pixel)
    const strokeCorrection = (strokeWidth * zoom) / 2 / zoom; // = strokeWidth/2
    const correctedRect = {
        x: worldRect.x + strokeCorrection,
        y: worldRect.y + strokeCorrection,
        width: worldRect.width - strokeWidth,
        height: worldRect.height - strokeWidth,
    };

    const minX_m = correctedRect.x / scale;
    const minY_m = correctedRect.y / scale;
    const maxX_m = (correctedRect.x + correctedRect.width) / scale;
    const maxY_m = (correctedRect.y + correctedRect.height) / scale;

    return {
        vertical: [
            { guide: minX_m, snap: "start" },
            { guide: maxX_m, snap: "end" },
            { guide: (minX_m + maxX_m) / 2, snap: "center" }
        ],
        horizontal: [
            { guide: minY_m, snap: "start" },
            { guide: maxY_m, snap: "end" },
            { guide: (minY_m + maxY_m) / 2, snap: "center" }
        ],
        points
    };
}

function getSnapResult(drag, stat) {
    const r = { vertical: [], horizontal: [] };
    const zoom = stage.scaleX() || 1;
    const threshold = getSnapThreshold(zoom);

    ["vertical", "horizontal"].forEach(ax => {
        drag[ax].forEach(dl => {
            stat[ax].forEach(sl => {
                const d = Math.abs(dl.guide - sl.guide);
                if (d < threshold) r[ax].push({ guide: sl.guide, diff: d, snap: dl.snap });
            });
        });
    });
    return r;
}

function findClosestSnap(r) {
    const c = { vertical: null, horizontal: null };
    ["vertical", "horizontal"].forEach(ax => {
        let m = Infinity;
        r[ax].forEach(s => { if (s.diff < m) { m = s.diff; c[ax] = s; } });
    });
    return c;
}

function drawGuides(guides_m) {
    guideLayer.find('.snapLine').forEach(line => line.destroy());
    
    const scale = getActiveScale();
    const zoom = stage.scaleX() || 1;

    if (guides_m.vertical) {
        const x_px = guides_m.vertical.guide * scale;
        guideLayer.add(new Konva.Line({ 
            points: [x_px, -1e4, x_px, 1e4], 
            stroke: "red", strokeWidth: 1 / zoom, dash: [4, 6],
            name: 'snapLine' 
        }));
    }
    if (guides_m.horizontal) {
        const y_px = guides_m.horizontal.guide * scale;
        guideLayer.add(new Konva.Line({ 
            points: [-1e4, y_px, 1e4, y_px], 
            stroke: "red", strokeWidth: 1 / zoom, dash: [4, 6],
            name: 'snapLine' 
        }));
    }
    guideLayer.batchDraw();
}

export function initSnap() {
    layer.on("dragmove", (e) => {
        if (!snapEnabled) return; 
        const t = getUserFigure(e.target);
        if (!t) return;
        
        const ud = getUserData(t);
        if (!ud || (ud.typ !== "rechteck" && ud.typ !== "polygon" && ud.typ !== "pv_modul")) return;
        
        const stat = { vertical: [], horizontal: [] };
        layer.getChildren().forEach(n => {
            if (n === t) return;
            const l = getObjectSnapLines(n);
            stat.vertical.push(...l.vertical);
            stat.horizontal.push(...l.horizontal);
        });
        
        const drag = getObjectSnapLines(t);
        
        const res = getSnapResult(drag, stat);
        const closest = findClosestSnap(res);
        
        const scale = getActiveScale();
        const box_m = getObjectSnapLines(t);
        
        let dx_m = 0, dy_m = 0;
        if (closest.vertical) {
            const x_m = closest.vertical.guide;
            if (closest.vertical.snap === "center") dx_m = x_m - box_m.vertical[2].guide;
            else if (closest.vertical.snap === "end") dx_m = x_m - box_m.vertical[1].guide;
            else dx_m = x_m - box_m.vertical[0].guide;
        }
        if (closest.horizontal) {
            const y_m = closest.horizontal.guide;
            if (closest.horizontal.snap === "center") dy_m = y_m - box_m.horizontal[2].guide;
            else if (closest.horizontal.snap === "end") dy_m = y_m - box_m.horizontal[1].guide;
            else dy_m = y_m - box_m.horizontal[0].guide;
        }
        
        t.move({ x: dx_m * scale, y: dy_m * scale });
        
        highlightNode(t, true); 
        drawGuides(closest);
    });
    
    layer.on("dragend", (e) => {
        guideLayer.find('.snapLine').forEach(line => line.destroy());
        highlightNode(e.target, true);
        guideLayer.batchDraw();
    });
}

// ===============================================
// FUNKTIONEN FÜR DAS MESS-WERKZEUG
// ===============================================

export function hidePointerSnap() {
    snapIndicator.visible(false);
    guideLayer.batchDraw();
}

/**
 * Erhält die Mausposition in Metern und gibt die gesnappte Position in Metern zurück.
 */
export function getPointerSnap(pointerPos_m) {
    if (!snapEnabled) {
        hidePointerSnap();
        return pointerPos_m;
    }

    const zoom = stage.scaleX() || 1;
    const threshold = getSnapThreshold(zoom);

    const allLines = { vertical: [], horizontal: [], points: [] };
    layer.getChildren().forEach(n => {
        const l = getObjectSnapLines(n);
        allLines.vertical.push(...l.vertical.map(v => v.guide));
        allLines.horizontal.push(...l.horizontal.map(h => h.guide));
        if (Array.isArray(l.points)) allLines.points.push(...l.points);
    });

    let snappedPos_m = { ...pointerPos_m };

    // 1) Point-Snap (Eckpunkte) hat Prioritaet
    let bestPointDist_m = threshold;
    allLines.points.forEach(p => {
        const d = Math.hypot(p.x - pointerPos_m.x, p.y - pointerPos_m.y);
        if (d < bestPointDist_m) {
            bestPointDist_m = d;
            snappedPos_m = { x: p.x, y: p.y };
        }
    });

    // 2) Danach Achsen-Snap (vertikal/horizontal), aber nur wenn kein Point-Snap gegriffen hat
    let bestDistX_m = threshold;
    let bestDistY_m = threshold;

    if (bestPointDist_m >= threshold) {
        allLines.vertical.forEach(vx_m => {
            const dist_m = Math.abs(vx_m - pointerPos_m.x);
            if (dist_m < bestDistX_m) {
                bestDistX_m = dist_m;
                snappedPos_m.x = vx_m;
            }
        });
        
        allLines.horizontal.forEach(hy_m => {
            const dist_m = Math.abs(hy_m - pointerPos_m.y);
            if (dist_m < bestDistY_m) {
                bestDistY_m = dist_m;
                snappedPos_m.y = hy_m;
            }
        });
    }

    const didSnap = (bestPointDist_m < threshold) || (bestDistX_m < threshold) || (bestDistY_m < threshold);
    if (didSnap) {
        const scale = getActiveScale();
        
        const snappedPos_world_px = { 
            x: snappedPos_m.x * scale, 
            y: snappedPos_m.y * scale 
        };

        snapIndicator.position(snappedPos_world_px);
        snapIndicator.scale({ x: 1 / zoom, y: 1 / zoom });
        snapIndicator.visible(true);
        
        guideLayer.batchDraw();
    } else {
        snapIndicator.visible(false);
        guideLayer.batchDraw();
    }
    
    return snappedPos_m;
}