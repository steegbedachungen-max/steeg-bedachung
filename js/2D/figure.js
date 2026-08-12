/* global Konva */
import { stage, layer } from './stage.js';
import { labelsVisible, BASE_FONT_SIZE_EDGE, BASE_FONT_SIZE_MAIN, getActiveScale, FENSTER_ABSTAND_M } from './state.js';
import { isMeasuring, handleMeasurementClick } from './measurement.js';
import { refreshAutoDimensions } from './autoDimension.js';
import { refreshShadingSync } from './shading.js';

let selectedLabel = null;
const DEFAULT_FILL = '#222';
const SELECTED_FILL = 'dodgerblue';

// --- Dachfenster-Sperrzone (rot schraffiert) ---
// Kleine, einmalig erzeugte Canvas-Kachel mit diagonalen roten Linien, die
// als Konva-Füllmuster (fillPatternImage, repeat) für den Sperrbereich rund
// um jedes Dachfenster genutzt wird - macht auf einen Blick sichtbar, dass
// dort kein PV-Modul hin sollte (siehe FENSTER_ABSTAND_M in state.js).
let fensterHatchPatternCache = null;
function getFensterHatchPattern() {
    if (fensterHatchPatternCache) return fensterHatchPatternCache;
    const size = 10;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const pctx = c.getContext('2d');
    pctx.strokeStyle = 'rgba(220, 38, 38, 0.6)';
    pctx.lineWidth = 1.5;
    // Drei parallele diagonale Linien (inkl. Randstücke), damit das Muster
    // beim Kacheln (repeat) lückenlos ineinander übergeht.
    [-size, 0, size].forEach(offset => {
        pctx.beginPath();
        pctx.moveTo(offset, size);
        pctx.lineTo(offset + size, 0);
        pctx.stroke();
    });
    fensterHatchPatternCache = c;
    return c;
}

let onSelectNodeCallback = null; 

let labelRotPanel = null;
let labelRotM15 = null;
let labelRotP15 = null;

function saveEdgeLabelState(label) {
    const group = label.getParent();
    if (!group) return;
    const ud = group.getAttr('userData');
    const index = label.getAttr('labelIndex');
    if (ud && typeof index === 'number') {
        if (!ud.labelOffsets) ud.labelOffsets = [];
        ud.labelOffsets[index] = { x: label.x(), y: label.y(), rot: label.rotation() };
        group.setAttr('userData', ud);
    }
}

function saveMainLabelState(label) {
    const group = label.getParent();
    if (!group) return;
    const ud = group.getAttr('userData');
    if (ud) {
        ud.mainLabelOffset = { x: label.x(), y: label.y(), rot: label.rotation() };
        group.setAttr('userData', ud);
    }
}

function saveSelectedLabelState() {
    if (!selectedLabel) return;
    if (selectedLabel.name() === 'edgeLabel') saveEdgeLabelState(selectedLabel);
    else if (selectedLabel.name() === 'mainLabel') saveMainLabelState(selectedLabel);
}

function showLabelRotators(label) {
    if (!labelRotPanel) return;
    const labelPos = label.absolutePosition();
    const stagePan = stage.position();
    const scale = stage.scaleX();
    const containerRect = stage.container().getBoundingClientRect();
    const panelX = labelPos.x * scale + stagePan.x + containerRect.left;
    const panelY = labelPos.y * scale + stagePan.y + containerRect.top - 50;
    labelRotPanel.style.top = `${panelY}px`;
    labelRotPanel.style.left = `${panelX}px`;
    labelRotPanel.style.display = 'flex';
    const panelWidth = labelRotPanel.getBoundingClientRect().width;
    labelRotPanel.style.left = `${panelX - panelWidth / 2}px`;
}

function hideLabelRotators() { if (labelRotPanel) labelRotPanel.style.display = 'none'; }

export function deselectActiveLabel() {
    if (selectedLabel) {
        selectedLabel.fill(DEFAULT_FILL);
        selectedLabel = null;
        hideLabelRotators();
        layer.batchDraw();
    }
}

function getPolygonCenter(pts) {
    let x = 0, y = 0;
    const count = pts.length;
    if (count === 0) return { x: 0, y: 0 };
    for (const p of pts) { x += p.x; y += p.y; }
    return { x: x / count, y: y / count };
}

function pointInPolygon(pt, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
        const inter = (yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
        if (inter) inside = !inside;
    } return inside;
}

function createOuterEdgeLabel(p1, p2, text, poly, index, customPos) {
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    
    const SHORT_EDGE_THRESHOLD = 60, off = 14; 
    let dir_x, dir_y;
    
    if (len < SHORT_EDGE_THRESHOLD) {
        const center = getPolygonCenter(poly);
        const vx = center.x - mx, vy = center.y - my;
        const vlen = Math.max(1, Math.sqrt(vx * vx + vy * vy));
        dir_x = vx / vlen; dir_y = vy / vlen;
    } else {
        dir_x = -dy / len; dir_y = dx / len;
    }
    
    let ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    let tx = mx + dir_x * off, ty = my + dir_y * off;
    
    if (pointInPolygon({ x: tx, y: ty }, poly)) {
        dir_x *= -1; dir_y *= -1; 
        tx = mx + dir_x * off; 
        ty = my + dir_y * off;
    }
    
    let displayAng = ang;
    if (displayAng > 90 || displayAng < -90) displayAng += 180;
    
    const initialX = customPos ? customPos.x : tx;
    const initialY = customPos ? customPos.y : ty;
    const initialRot = customPos ? customPos.rot : displayAng;
    const scale = getActiveScale();
    const dynamicFontSize = BASE_FONT_SIZE_EDGE * (scale / 100);
    
    const label = new Konva.Text({
        x: initialX, y: initialY, text, fill: DEFAULT_FILL,
        fontSize: dynamicFontSize, rotation: initialRot,
        listening: true, draggable: true, name: "edgeLabel",
        visible: labelsVisible
    });

    label.offsetX(label.width() / 2);
    label.offsetY(label.height() / 2);
    
    label.setAttr('baseRotation', ang); label.setAttr('labelIndex', index);
    label.on('mousedown', (e) => { e.cancelBubble = true; });
    label.on('click', (e) => {
        e.cancelBubble = true;
        if (selectedLabel && selectedLabel !== label) selectedLabel.fill(DEFAULT_FILL);
        selectedLabel = label; selectedLabel.fill(SELECTED_FILL);
        label.moveToTop();
        showLabelRotators(label);
        layer.batchDraw();
    });
    label.on('dragend', (e) => { e.cancelBubble = true; saveEdgeLabelState(label); });
    label.on('dragmove', () => { if (selectedLabel === label) showLabelRotators(label); });
    
    return label;
}

function updateDataOnDragEnd(e) {
    const node = e.target;
    const ud = node.getAttr('userData');
    if (!ud) return;
    const pos = node.position(), offset = node.offset() || { x: 0, y: 0 };
    const scale = getActiveScale();
    if (ud.typ === 'rechteck' || ud.typ === 'pv_modul') {
        ud.x_meter = (pos.x - offset.x) / scale;
        ud.y_meter = (pos.y - offset.y) / scale;
    } else if (ud.typ === 'polygon' || ud.typ === 'kreis') {
        ud.x_meter = pos.x / scale;
        ud.y_meter = pos.y / scale;
    }
    node.setAttr('userData', ud);
    refreshAutoDimensions();
    refreshShadingSync();
}

export function addPVModule(moduleName = "PV", pvWidthM = 1.13, pvHeightM = 1.72, cascadeOffset = 0) {
    if (!onSelectNodeCallback) return;
    const scale = getActiveScale();
    const viewRect = stage.container().getBoundingClientRect();
    const viewCenter = {
        x: (viewRect.width / 2 - stage.x()) / stage.scaleX(),
        y: (viewRect.height / 2 - stage.y()) / stage.scaleY()
    };

    // Beim schnellen Hinzufügen mehrerer Module derselben Größe (z.B. über
    // "+ Weiteres Modul") werden sie leicht diagonal versetzt platziert,
    // damit sie nicht exakt übereinanderliegen und einzeln greifbar bleiben.
    const cascadeStepM = 0.4;
    const offsetM = cascadeOffset * cascadeStepM;
    
    const newPVData = {
        typ: "pv_modul", 
        name: moduleName,
        x_meter: (viewCenter.x / scale) - (pvWidthM / 2) + offsetM,
        y_meter: (viewCenter.y / scale) - (pvHeightM / 2) + offsetM,
        width_meter: pvWidthM, 
        height_meter: pvHeightM,
        fill: "#2C3E50", 
        stroke: "#7F8C8D", 
        locked: false
    };
    
    erstelleFigur(newPVData, onSelectNodeCallback);
    layer.batchDraw();
    refreshAutoDimensions();
    refreshShadingSync();
}

export function addWindow(windowName, windowWidthM, windowHeightM) {
    if (!onSelectNodeCallback) return;
    const scale = getActiveScale();
    
    const viewRect = stage.container().getBoundingClientRect();
    const viewCenter = {
        x: (viewRect.width / 2 - stage.x()) / stage.scaleX(),
        y: (viewRect.height / 2 - stage.y()) / stage.scaleY()
    };
    
    const newWindowData = {
        typ: "rechteck",
        name: windowName,
        x_meter: (viewCenter.x / scale) - (windowWidthM / 2),
        y_meter: (viewCenter.y / scale) - (windowHeightM / 2),
        width_meter: windowWidthM,
        height_meter: windowHeightM,
        fill: "#e0f7fa",
        stroke: "#006064",
        locked: false,
        // Markiert dieses Rechteck als Dachfenster (im Unterschied zu einem
        // generischen "Hindernis") - erstelleFigur() zeichnet dafür einen
        // rot-schraffierten Sperrbereich (siehe FENSTER_ABSTAND_M), und
        // snap.js lässt andere Objekte dort nicht bündig andocken.
        istFenster: true
    };
    
    erstelleFigur(newWindowData, onSelectNodeCallback);
    layer.batchDraw();
    refreshAutoDimensions();
    refreshShadingSync();
}

/**
 * Fügt ein generisches "Hindernis" ein (z.B. Kamin, Lüfter, Antenne oder
 * Sonstiges) - technisch ein einfaches Rechteck wie ein Fenster, aber mit
 * freiem Namen/Größe und einer eigenen Warnfarbe, damit es sich optisch von
 * PV-Modulen/Fenstern abhebt. Zählt für die Autobemaßung wie jedes andere
 * Objekt (Abstand zur Dachkante + zum nächsten Nachbarobjekt).
 */
export function addObstacle(name, widthM, heightM, schattenHoeheM = 0) {
    if (!onSelectNodeCallback) return;
    const scale = getActiveScale();

    const viewRect = stage.container().getBoundingClientRect();
    const viewCenter = {
        x: (viewRect.width / 2 - stage.x()) / stage.scaleX(),
        y: (viewRect.height / 2 - stage.y()) / stage.scaleY()
    };

    const newObstacleData = {
        typ: "rechteck",
        name: name || "Hindernis",
        x_meter: (viewCenter.x / scale) - (widthM / 2),
        y_meter: (viewCenter.y / scale) - (heightM / 2),
        width_meter: widthM,
        height_meter: heightM,
        // Vertikale Höhe über der Dachfläche (z.B. Kaminhöhe) - unabhängig
        // von width_meter/height_meter (die die Grundfläche in der
        // Dachebene beschreiben). Nur für die Verschattungsberechnung
        // (shading.js) genutzt; 0/nicht gesetzt = kein Schatten berechnet.
        schattenHoeheM: Number(schattenHoeheM) || 0,
        fill: "#f5cba7",
        stroke: "#d35400",
        locked: false
    };

    erstelleFigur(newObstacleData, onSelectNodeCallback);
    layer.batchDraw();
    refreshAutoDimensions();
    refreshShadingSync();
}

export function initFigureModule(onSelect) {
    onSelectNodeCallback = onSelect;
    labelRotPanel = document.getElementById('label-rotation-panel');
    labelRotM15 = document.getElementById('label-rot-m15');
    labelRotP15 = document.getElementById('label-rot-p15');
    if (labelRotM15) {
        labelRotM15.onclick = () => { if (selectedLabel) { selectedLabel.rotation(selectedLabel.rotation() - 15); saveSelectedLabelState(); layer.batchDraw(); } };
    }
    if (labelRotP15) {
        labelRotP15.onclick = () => { if (selectedLabel) { selectedLabel.rotation(selectedLabel.rotation() + 15); saveSelectedLabelState(); layer.batchDraw(); } };
    }
}

export function reDrawAllFigures() {
    const allFigures = layer.getChildren();
    const allUserData = allFigures.map(f => f.getAttr('userData'));
    layer.destroyChildren();
    allUserData.forEach(ud => { if (ud) erstelleFigur(ud, onSelectNodeCallback); });
    stage.batchDraw();
}

export function normalizeEdgeLabels(group) {
    const A = group.rotation() || 0;
    group.getChildren().forEach(ch => {
        if (ch.name() === "edgeLabel") {
            const groupData = group.getAttr('userData') || {};
            const index = ch.getAttr('labelIndex');
            const hasCustomPos = groupData.labelOffsets && groupData.labelOffsets[index];
            if (hasCustomPos) return;
            const baseRot = ch.getAttr('baseRotation');
            if (typeof baseRot !== 'number') return;
            let world = baseRot + A;
            world = (world + 180) % 360 - 180;
            if (world > 90 || world <= -90) ch.rotation(baseRot + 180);
            else ch.rotation(baseRot);
        }
    });
}

export function updateLockVisual(n) {
    const locked = n.getAttr("locked");
    n.getChildren().forEach(child => {
        const cls = child.getClassName();
        if (["Rect", "Circle", "Line"].includes(cls)) {
            child.opacity(locked ? 0.5 : 1);
            if (locked && child.stroke()) child.stroke("gray");
            else if (!locked && child.stroke()) child.stroke("black");
        }
        if (cls === "Text" && child !== selectedLabel) {
            child.opacity(1);
            child.fill(DEFAULT_FILL);
        }
    });
    layer.batchDraw();
}

export function erstelleFigur(el, onSelectNode) {
    let f = null;
    const scale = getActiveScale();
    if (el.pointsInMeters) el.points = el.pointsInMeters.map(p => ({ x: p.x * scale, y: p.y * scale }));
    if ((el.typ === "rechteck" || el.typ === "pv_modul") && el.width_meter) {
        el.width = el.width_meter * scale;
        el.height = el.height_meter * scale;
    }
    if (el.typ === "kreis" && el.radius_meter) el.radius = el.radius_meter * scale;
    const posX = el.x_meter ? (el.x_meter * scale) : el.x;
    const posY = el.y_meter ? (el.y_meter * scale) : el.y;
    
    // WICHTIG: e.cancelBubble = true verhindert, dass dieser Klick zum
    // "mousedown"-Handler des übergeordneten Moduls (weiter unten,
    // f.on("mousedown touchstart", ...)) durchgereicht wird. Ohne den
    // zusätzlichen onSelectNode(f)-Aufruf hier blieb das Modul selbst dadurch
    // UNAUSGEWÄHLT, wenn man auf sein (oft über die eigentliche Form
    // hinausragendes, z.B. bei langen Namen wie "1,13 x 1,76m") Namens-Label
    // klickte - die blaue gestrichelte Auswahl-Markierung erschien dann gar
    // nicht bzw. blieb an der zuvor ausgewählten Stelle stehen, statt zum
    // angeklickten Modul zu "rücken" (siehe Bug-Report: "das blaue drum
    // herum rückt nicht mit"). Jetzt wird das Modul beim Klick auf sein
    // Label zusätzlich mit ausgewählt, so wie es beim Klick auf die Form
    // selbst auch passiert.
    const onMainLabelMouseDown = (e) => {
        e.cancelBubble = true;
        if (!isMeasuring()) onSelectNode(f);
    };
    const onMainLabelClick = (e) => {
        e.cancelBubble = true;
        const label = e.target;
        if (selectedLabel && selectedLabel !== label) selectedLabel.fill(DEFAULT_FILL);
        selectedLabel = label; selectedLabel.fill(SELECTED_FILL);
        label.moveToTop();
        showLabelRotators(label);
        layer.batchDraw();
    };
    const onMainLabelDragEnd = (e) => { e.cancelBubble = true; saveMainLabelState(e.target); };
    const onMainLabelDragMove = (e) => { if (selectedLabel === e.target) showLabelRotators(e.target); };
    
    if (el.points) {
        f = new Konva.Group({ x: 0, y: 0, draggable: true, listening: true, hitStrokeWidth: 20 });
        const poly = new Konva.Line({ points: el.points.flatMap(p => [p.x, p.y]), fill: "#E0F0FF", stroke: "black", strokeWidth: 2, closed: true, listening: true, hitStrokeWidth: 20, name: "shape" });
        f.add(poly);
        const box = poly.getClientRect();
        const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        f.offset(center);
        const groupX = (typeof posX === 'number') ? posX : center.x;
        const groupY = (typeof posY === 'number') ? posY : center.y;
        f.position({ x: groupX, y: groupY });
        if (typeof el.x_meter !== 'number') el.x_meter = groupX / scale;
        if (typeof el.y_meter !== 'number') el.y_meter = groupY / scale;
        f.setAttr("userData", { typ: "polygon", ...el });
        if (el.name) {
            const customPos = el.mainLabelOffset;
            const dynamicFontSize = BASE_FONT_SIZE_MAIN * (scale / 100);
            const mainLabel = new Konva.Text({ x: customPos ? customPos.x : center.x, y: customPos ? customPos.y : center.y, rotation: customPos ? customPos.rot : 0, text: el.name, fontSize: dynamicFontSize, fill: DEFAULT_FILL, fontStyle: 'bold', listening: true, draggable: true, name: 'mainLabel', visible: labelsVisible });
            mainLabel.offsetX(mainLabel.width() / 2); mainLabel.offsetY(mainLabel.height() / 2);
            mainLabel.on('mousedown', onMainLabelMouseDown); mainLabel.on('click', onMainLabelClick); mainLabel.on('dragend', onMainLabelDragEnd); mainLabel.on('dragmove', onMainLabelDragMove);
            f.add(mainLabel);
        }
        if (el.labels) {
            const pts = el.points, lbl = el.labels;
            for (let i = 0; i < pts.length - 1; i++) {
                const t = lbl[i];
                if (t) {
                    const customPos = el.labelOffsets ? el.labelOffsets[i] : null;
                    f.add(createOuterEdgeLabel(pts[i], pts[i + 1], t, pts, i, customPos));
                }
            }
        }
    } else if (el.typ === "rechteck" || el.typ === "pv_modul") {
        const width = el.width || 100, height = el.height || 100;
        const offsetX = width / 2, offsetY = height / 2;
        const groupX = (typeof posX === 'number') ? (posX + offsetX) : (offsetX);
        const groupY = (typeof posY === 'number') ? (posY + offsetY) : (offsetY);
        f = new Konva.Group({ x: groupX, y: groupY, offset: { x: offsetX, y: offsetY }, draggable: true, listening: true, hitStrokeWidth: 20 });

        // Dachfenster: rot-schraffierten Sperrbereich UNTER dem eigentlichen
        // Fenster-Rechteck einfügen (zuerst hinzufügen = zeichnet zuerst =
        // liegt optisch dahinter), damit rundherum ein sichtbarer
        // Warn-Rahmen entsteht, statt das Fenster selbst zu verdecken. Da
        // dieses Rect ein Kind DERSELBEN Gruppe ist, bewegt/dreht es sich
        // automatisch mit dem Fenster mit - keine separate Sync-Logik nötig.
        // Gleiche lokale Mitte wie rectShape (siehe dortiger Offset-Kommentar):
        // symmetrisch um FENSTER_ABSTAND_M vergrößert, aber mit dem GLEICHEN
        // offset={offsetX,offsetY}, da sich die lokale Mitte (x+width/2)
        // durch die symmetrische Vergrößerung nicht verschiebt.
        if (el.istFenster) {
            const marginPx = FENSTER_ABSTAND_M * scale;
            const keepOutRect = new Konva.Rect({
                x: -marginPx, y: -marginPx,
                width: width + 2 * marginPx, height: height + 2 * marginPx,
                offset: { x: offsetX, y: offsetY },
                fillPatternImage: getFensterHatchPattern(),
                fillPatternRepeat: 'repeat',
                stroke: '#dc2626',
                strokeWidth: 1,
                dash: [4, 3],
                listening: false,
                name: 'fensterSperrzone'
            });
            f.add(keepOutRect);
        }

        const rectShape = new Konva.Rect({ x: 0, y: 0, width, height, offset: { x: offsetX, y: offsetY }, fill: (el.typ === "pv_modul") ? "#2C3E50" : (el.fill || "#9fd0a3"), stroke: (el.typ === "pv_modul") ? "#7F8C8D" : (el.stroke || "black"), strokeWidth: 2, name: "shape" });
        f.add(rectShape);
        if (typeof el.x_meter !== 'number') el.x_meter = groupX / scale;
        if (typeof el.y_meter !== 'number') el.y_meter = groupY / scale;
        f.setAttr("userData", { ...el, typ: el.typ });
        
        if (el.name) {
            const customPos = el.mainLabelOffset;
            let dynamicFontSize = BASE_FONT_SIZE_MAIN * (scale / 100);
            
            // ANGEPASST: Schriftgröße auf 85% der normalen Größe gesetzt
            if (el.typ === "pv_modul") {
                dynamicFontSize = (BASE_FONT_SIZE_MAIN * 0.85) * (scale / 100); 
            }

            const mainLabel = new Konva.Text({ x: customPos ? customPos.x : 0, y: customPos ? customPos.y : 0, rotation: customPos ? customPos.rot : 0, text: el.name, fontSize: dynamicFontSize, fill: DEFAULT_FILL, fontStyle: 'bold', listening: true, draggable: true, name: 'mainLabel', visible: labelsVisible });
            if (el.typ === "pv_modul") mainLabel.fill('white');
            mainLabel.offsetX(mainLabel.width() / 2); mainLabel.offsetY(mainLabel.height() / 2);
            mainLabel.on('mousedown', onMainLabelMouseDown); mainLabel.on('click', onMainLabelClick); mainLabel.on('dragend', onMainLabelDragEnd); mainLabel.on('dragmove', onMainLabelDragMove);
            f.add(mainLabel);
        }
    } else if (el.typ === "kreis") {
        const radius = el.radius || 40;
        const groupX = (typeof posX === 'number') ? posX : 0;
        const groupY = (typeof posY === 'number') ? posY : 0;
        f = new Konva.Group({ x: groupX, y: groupY, draggable: true, listening: true, hitStrokeWidth: 20 });
        const circleShape = new Konva.Circle({ x: 0, y: 0, radius, fill: el.fill || "#f5b26b", stroke: el.stroke || "black", strokeWidth: 2, name: "shape" });
        f.add(circleShape);
        if (typeof el.x_meter !== 'number') el.x_meter = groupX / scale;
        if (typeof el.y_meter !== 'number') el.y_meter = groupY / scale;
        f.setAttr("userData", { typ: "kreis", ...el });
        if (el.name) {
            const customPos = el.mainLabelOffset;
            const dynamicFontSize = BASE_FONT_SIZE_MAIN * (scale / 100);
            const mainLabel = new Konva.Text({ x: customPos ? customPos.x : 0, y: customPos ? customPos.y : 0, rotation: customPos ? customPos.rot : 0, text: el.name, fontSize: dynamicFontSize, fill: DEFAULT_FILL, fontStyle: 'bold', listening: true, draggable: true, name: 'mainLabel', visible: labelsVisible });
            mainLabel.offsetX(mainLabel.width() / 2); mainLabel.offsetY(mainLabel.height() / 2);
            mainLabel.on('mousedown', onMainLabelMouseDown); mainLabel.on('click', onMainLabelClick); mainLabel.on('dragend', onMainLabelDragEnd); mainLabel.on('dragmove', onMainLabelDragMove);
            f.add(mainLabel);
        }
    }
    if (!f) return;

    // WICHTIG: zusätzlich zu "mousedown" auch "touchstart" abonnieren, da
    // Konva Touch-Events auf iPad/Tablets NICHT als "mousedown" meldet.
    // Ohne dies lässt sich ein Objekt per Finger-Tipp nicht auswählen, und
    // damit auch das Rotations-Panel (das nur bei ausgewähltem Objekt aktiv
    // ist) nicht bedienen - das war die Ursache dafür, dass sich PV-Module
    // auf dem iPad nicht drehen ließen.
    f.on("mousedown touchstart", (e) => {
        if (isMeasuring()) {
            handleMeasurementClick(e);
            e.cancelBubble = true;
            return;
        }

        deselectActiveLabel();
        onSelectNode(f);
    });
    
    f.on("dragend", updateDataOnDragEnd);

    if (el.locked) { f.setAttr("locked", true); f.draggable(false); updateLockVisual(f); }
    layer.add(f);
    
    if (typeof el.rotation === "number") f.rotation(el.rotation);
    
    normalizeEdgeLabels(f);
}