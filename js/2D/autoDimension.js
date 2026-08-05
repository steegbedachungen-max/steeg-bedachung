// js/2D/autoDimension.js
//
// "Autobemaßung": zeigt automatisch für jedes platzierte Objekt (PV-Modul,
// Fenster, Hindernis wie Kamin/Lüfter) zwei Maßlinien an:
//   1. den kürzesten Abstand zur nächsten Dachkante (Traufe/Ortgang/First/...
//      der als Polygon transferierten Dachskizze)
//   2. den kürzesten Abstand zum nächsten anderen Objekt auf der Fläche
// Es wird bewusst kein fester Mindestabstand vorausgesetzt/geprüft - es wird
// nur der tatsächliche IST-Abstand gemessen und angezeigt, die Bewertung
// (reicht der Abstand?) bleibt beim Nutzer.
//
// Die Berechnung arbeitet komplett in "Welt-Metern" (unabhängig vom
// aktuellen Zoom/Pan der Stage), damit die Ergebnisse beim Ein-/Auszoomen
// stabil bleiben - dieselbe Umrechnung wie im bestehenden manuellen
// Mess-Werkzeug (measurement.js).

/* global Konva */
import { stage, layer, guideLayer } from './stage.js';
import { getActiveScale, getUserData, autoDimensionVisible } from './state.js';

const AUTO_DIM_COLOR = '#e67e22'; // Orange - unterscheidet sich von roten manuellen Messungen und blauer Auswahl
const GROUP_NAME = 'autoDimGroup';
const MIN_DRAW_DIST_M = 0.01; // Abstände unter 1cm (praktisch 0/anliegend) nicht extra einzeichnen

function absoluteToWorld(absPoint) {
    const zoom = stage.scaleX() || 1;
    const stagePos = stage.position();
    return { x: (absPoint.x - stagePos.x) / zoom, y: (absPoint.y - stagePos.y) / zoom };
}

/**
 * Liefert die Geometrie einer Figur in Welt-Metern:
 * - Dachumriss (typ "polygon") -> Liste der Kanten-Segmente
 * - PV-Modul/Fenster/Hindernis/Kreis -> achsenparallele Bounding-Box
 * Alles andere (z.B. Kreis ohne radius_meter) wird ignoriert.
 */
function getFigureGeometry(fig) {
    const ud = getUserData(fig);
    if (!ud) return null;
    const scale = getActiveScale();
    if (!scale) return null;
    const transform = fig.getAbsoluteTransform();

    if (ud.typ === 'polygon' && ud.pointsInMeters) {
        const shape = fig.findOne('.shape');
        if (!shape) return null;
        const localPoints_px = shape.points();
        const pts = [];
        for (let i = 0; i < localPoints_px.length; i += 2) {
            const localP = { x: localPoints_px[i], y: localPoints_px[i + 1] };
            const absP = transform.point(localP);
            const worldP_px = absoluteToWorld(absP);
            pts.push({ x: worldP_px.x / scale, y: worldP_px.y / scale });
        }
        if (pts.length < 2) return null;
        const segments = [];
        for (let i = 0; i < pts.length - 1; i++) segments.push({ p1: pts[i], p2: pts[i + 1] });
        // Kontur bei Bedarf schließen (letzter -> erster Punkt)
        const first = pts[0], last = pts[pts.length - 1];
        if (Math.hypot(first.x - last.x, first.y - last.y) > MIN_DRAW_DIST_M) {
            segments.push({ p1: last, p2: first });
        }
        return { typ: 'polygon', segments };
    }

    if ((ud.typ === 'rechteck' || ud.typ === 'pv_modul') && ud.width_meter) {
        const w_px = ud.width_meter * scale;
        const h_px = ud.height_meter * scale;
        const localCorners = [
            { x: -w_px / 2, y: -h_px / 2 }, { x: w_px / 2, y: -h_px / 2 },
            { x: w_px / 2, y: h_px / 2 }, { x: -w_px / 2, y: h_px / 2 }
        ];
        const corners_m = localCorners.map(p => {
            const absP = transform.point(p);
            const worldP_px = absoluteToWorld(absP);
            return { x: worldP_px.x / scale, y: worldP_px.y / scale };
        });
        const xs = corners_m.map(p => p.x), ys = corners_m.map(p => p.y);
        const rect = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
        return { typ: 'obstacle', rect };
    }

    if (ud.typ === 'kreis' && ud.radius_meter) {
        const centerAbsPx = transform.point({ x: 0, y: 0 });
        const centerWorldPx = absoluteToWorld(centerAbsPx);
        const center_m = { x: centerWorldPx.x / scale, y: centerWorldPx.y / scale };
        const r = ud.radius_meter;
        const rect = { x: center_m.x - r, y: center_m.y - r, width: 2 * r, height: 2 * r };
        return { typ: 'obstacle', rect };
    }

    return null;
}

function pointToSegmentDistance(p, a, b) {
    const abx = b.x - a.x, aby = b.y - a.y;
    const lenSq = abx * abx + aby * aby;
    const t = lenSq > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq)) : 0;
    const closest = { x: a.x + t * abx, y: a.y + t * aby };
    return { dist: Math.hypot(p.x - closest.x, p.y - closest.y), point: closest };
}

function pointToRectDistance(p, rect) {
    const cx = Math.max(rect.x, Math.min(p.x, rect.x + rect.width));
    const cy = Math.max(rect.y, Math.min(p.y, rect.y + rect.height));
    return { dist: Math.hypot(p.x - cx, p.y - cy), point: { x: cx, y: cy } };
}

function rectCorners(rect) {
    return [
        { x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height }, { x: rect.x, y: rect.y + rect.height }
    ];
}

// Kürzeste Distanz + Punktepaar zwischen einem (achsenparallelen) Rechteck
// und einem Liniensegment: Minimum aus "Rechteck-Ecke -> Segment" und
// "Segment-Endpunkt -> Rechteck" deckt (mathematisch korrekt für konvexe
// Formen) alle Fälle ab.
function rectToSegmentDistance(rect, a, b) {
    let best = null;
    rectCorners(rect).forEach(c => {
        const r = pointToSegmentDistance(c, a, b);
        if (!best || r.dist < best.dist) best = { dist: r.dist, p1: c, p2: r.point };
    });
    [a, b].forEach(endpoint => {
        const r = pointToRectDistance(endpoint, rect);
        if (!best || r.dist < best.dist) best = { dist: r.dist, p1: r.point, p2: endpoint };
    });
    return best;
}

// Kürzeste Distanz + nächstgelegene Punkte zwischen zwei achsenparallelen
// Rechtecken (Standardverfahren über Achsen-Überlappung).
function rectToRectDistance(a, b) {
    const ax2 = a.x + a.width, ay2 = a.y + a.height;
    const bx2 = b.x + b.width, by2 = b.y + b.height;
    const xOverlapLo = Math.max(a.x, b.x), xOverlapHi = Math.min(ax2, bx2);
    const yOverlapLo = Math.max(a.y, b.y), yOverlapHi = Math.min(ay2, by2);
    let p1x, p2x, p1y, p2y;
    if (xOverlapLo <= xOverlapHi) { p1x = p2x = (xOverlapLo + xOverlapHi) / 2; }
    else if (ax2 < b.x) { p1x = ax2; p2x = b.x; } else { p1x = a.x; p2x = bx2; }
    if (yOverlapLo <= yOverlapHi) { p1y = p2y = (yOverlapLo + yOverlapHi) / 2; }
    else if (ay2 < b.y) { p1y = ay2; p2y = b.y; } else { p1y = a.y; p2y = by2; }
    return { dist: Math.hypot(p1x - p2x, p1y - p2y), p1: { x: p1x, y: p1y }, p2: { x: p2x, y: p2y } };
}

function drawDimensionLine(p1_m, p2_m, distM) {
    const scale = getActiveScale();
    const zoom = stage.scaleX() || 1;
    const group = new Konva.Group({ name: GROUP_NAME, listening: false });

    const line = new Konva.Line({
        points: [p1_m.x * scale, p1_m.y * scale, p2_m.x * scale, p2_m.y * scale],
        stroke: AUTO_DIM_COLOR,
        strokeWidth: 1.5 / zoom,
        dash: [5 / zoom, 4 / zoom],
        listening: false,
        name: 'autoDimLine'
    });

    const midX = ((p1_m.x + p2_m.x) / 2) * scale;
    const midY = ((p1_m.y + p2_m.y) / 2) * scale;
    const text = new Konva.Text({
        x: midX, y: midY,
        text: `${distM.toFixed(2)} m`,
        fontSize: 12 / zoom,
        fill: '#ffffff',
        fontStyle: 'bold',
        padding: 2 / zoom,
        listening: false,
        name: 'autoDimText'
    });
    text.offsetX(text.width() / 2);
    text.offsetY(text.height() / 2);

    // Kleiner Hintergrund hinter dem Text, damit die Zahl auf der
    // gestrichelten Linie/über der Zeichnung lesbar bleibt.
    const bg = new Konva.Rect({
        x: text.x() - text.width() / 2, y: text.y() - text.height() / 2,
        width: text.width(), height: text.height(),
        fill: AUTO_DIM_COLOR, cornerRadius: 2 / zoom,
        listening: false, name: 'autoDimTextBg'
    });

    group.add(line, bg, text);
    guideLayer.add(group);
}

/**
 * Berechnet und zeichnet alle Autobemaßungen neu. Günstig genug, um nach
 * jeder relevanten Änderung (Verschieben, Hinzufügen, Löschen, Rotieren,
 * Seitenwechsel, ...) aufgerufen zu werden - bei ausgeschalteter
 * Autobemaßung werden nur die evtl. vorhandenen alten Linien entfernt.
 */
export function refreshAutoDimensions() {
    guideLayer.find(`.${GROUP_NAME}`).forEach(n => n.destroy());

    if (!autoDimensionVisible) {
        guideLayer.batchDraw();
        return;
    }

    const figures = layer.getChildren();
    const geoms = figures.map(getFigureGeometry).filter(Boolean);
    const polySegments = geoms.filter(g => g.typ === 'polygon').flatMap(g => g.segments);
    const obstacles = geoms.filter(g => g.typ === 'obstacle');

    const drawnPairs = new Set();

    obstacles.forEach((obs, i) => {
        // 1) Abstand zur nächsten Dachkante
        if (polySegments.length > 0) {
            let bestEdge = null;
            polySegments.forEach(seg => {
                const r = rectToSegmentDistance(obs.rect, seg.p1, seg.p2);
                if (!bestEdge || r.dist < bestEdge.dist) bestEdge = r;
            });
            if (bestEdge && bestEdge.dist > MIN_DRAW_DIST_M) {
                drawDimensionLine(bestEdge.p1, bestEdge.p2, bestEdge.dist);
            }
        }

        // 2) Abstand zum nächsten anderen Objekt (nur einmal pro Paar zeichnen)
        let bestOther = null, bestOtherIdx = -1;
        obstacles.forEach((other, j) => {
            if (i === j) return;
            const r = rectToRectDistance(obs.rect, other.rect);
            if (!bestOther || r.dist < bestOther.dist) { bestOther = r; bestOtherIdx = j; }
        });
        if (bestOther && bestOtherIdx > -1 && bestOther.dist > MIN_DRAW_DIST_M) {
            const pairKey = [i, bestOtherIdx].sort((a, b) => a - b).join('-');
            if (!drawnPairs.has(pairKey)) {
                drawnPairs.add(pairKey);
                drawDimensionLine(bestOther.p1, bestOther.p2, bestOther.dist);
            }
        }
    });

    guideLayer.batchDraw();
}

/**
 * Passt Strichstärke/Schriftgröße der bereits gezeichneten Autobemaßungen
 * an einen neuen Zoom-Faktor an, ohne die Geometrie neu zu berechnen
 * (analog zur Gitter-Anpassung beim Zoomen in controls.js) - hält die
 * Linien beim schnellen Ein-/Auszoomen optisch konstant dünn/lesbar.
 */
export function rescaleAutoDimensionsForZoom(zoom) {
    const z = zoom || 1;
    guideLayer.find('.autoDimLine').forEach(line => line.strokeWidth(1.5 / z));
    guideLayer.find('.autoDimText').forEach(text => text.fontSize(12 / z));
}