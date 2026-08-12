// js/notizenManager.js
import { showConfirm } from './dialogManager.js';

let stage, drawingLayer, objectLayer, container;
let isPaint = false;
let mode = 'draw';
let lastLine;
let tr;

// --- "Endlosblatt": das Notizen-Blatt hat keine feste Höhe mehr, sondern
// wächst automatisch mit, sobald man beim Zeichnen/Verschieben/Einfügen in
// die Nähe des aktuellen unteren Randes kommt. GROW_STEP_PX bestimmt die
// Schrittgröße (in Canvas-Pixeln), GROW_THRESHOLD_PX den "Sicherheitsabstand"
// zum Rand, ab dem verlängert wird, bevor man tatsächlich am Ende ankommt.
const GROW_STEP_PX = 2000;
const GROW_THRESHOLD_PX = 400;

/**
 * Verlängert das Notizen-Blatt (stage-Höhe) bei Bedarf, damit es sich wie ein
 * Endlosblatt verhält statt bei einer festen Höhe abzuschneiden.
 * @param {number} [pointerY] Aktuelle Y-Position (in Canvas-Pixeln) des
 * Interessenpunkts (Zeichenstift, verschobenes Objekt). Wird kein Wert
 * übergeben, wird stattdessen anhand der aktuellen Scroll-Position des
 * Containers geprüft (z.B. beim Wischen/Schieben auf dem iPad).
 */
function ensureEndlessHeight(pointerY) {
    if (!stage) return;
    const currentHeight = stage.height();
    let neededBottom;
    if (typeof pointerY === 'number') {
        neededBottom = pointerY + GROW_THRESHOLD_PX;
    } else if (container) {
        neededBottom = container.scrollTop + container.clientHeight + GROW_THRESHOLD_PX;
    } else {
        return;
    }
    if (neededBottom > currentHeight) {
        // Auf ein Vielfaches von GROW_STEP_PX aufrunden, damit das Blatt in
        // gleichmäßigen Schritten wächst statt nur um den exakt benötigten Rest.
        stage.height(Math.ceil(neededBottom / GROW_STEP_PX) * GROW_STEP_PX);
    }
}

// Maße der nutzbaren Fläche einer PDF-Export-Seite (siehe exportManager.js:
// usableWmm ≈ 190mm Breite, nutzbare Höhe pro Seite ≈ 242mm).
const PDF_PAGE_USABLE_WIDTH_MM = 190;
const PDF_PAGE_USABLE_HEIGHT_MM = 242;

// Zielanzahl Notizen-Bilder pro Seite und Sicherheitsabstand zwischen ihnen.
// Wird genutzt, um neu eingefügte Bilder von vornherein so zu begrenzen, dass
// standardmäßig 2 Bilder auf eine Seite passen (statt nur eines).
const NOTE_IMAGES_PER_PAGE = 2;
const NOTE_IMAGE_GAP_MM = 10;

// Verhältnis (Höhe/Breite), das ein einzelnes eingefügtes Bild maximal haben darf.
const PDF_PAGE_CONTENT_ASPECT =
    ((PDF_PAGE_USABLE_HEIGHT_MM - NOTE_IMAGE_GAP_MM * (NOTE_IMAGES_PER_PAGE - 1)) / NOTE_IMAGES_PER_PAGE)
    / PDF_PAGE_USABLE_WIDTH_MM;

// Ermittelt die Y-Position für ein neu eingefügtes Bild, sodass es automatisch
// unterhalb des zuletzt eingefügten Bildes einsortiert wird, statt alle Bilder
// übereinander an derselben Stelle zu platzieren.
function getNextImageY(startY = 50, gap = 20) {
    const existingImages = objectLayer.getChildren().filter(n => n.className === 'Image');
    if (existingImages.length === 0) return startY;
    let maxBottom = 0;
    existingImages.forEach(img => {
        const rect = img.getClientRect({ skipTransform: false });
        maxBottom = Math.max(maxBottom, rect.y + rect.height);
    });
    return maxBottom + gap;
}

// Komprimiert ein hochgeladenes Foto auf die Auflösung, die für die
// tatsächliche Anzeige-/Exportgröße benötigt wird, statt die volle
// Kamera-Auflösung (z.B. 8-12 MP vom iPad) im Speicher und im Autosave zu
// behalten. IMAGE_COMPRESSION_PIXEL_RATIO liegt bewusst etwas über dem
// pixelRatio des PDF-Exports (1.5, siehe getNotizenImage()), damit Fotos
// auch im Export und bei Retina-Displays noch scharf wirken.
const IMAGE_COMPRESSION_PIXEL_RATIO = 2;
const IMAGE_COMPRESSION_QUALITY = 0.85;

/**
 * Rendert imgObj auf ein Offscreen-Canvas in der Zielauflösung (Anzeigegröße
 * × IMAGE_COMPRESSION_PIXEL_RATIO) und gibt eine komprimierte JPEG-Data-URL
 * zurück. Gibt null zurück, wenn das Original ohnehin schon kleiner/gleich
 * der Zielauflösung ist (kein sinnvolles Hochskalieren) oder das Canvas aus
 * irgendeinem Grund fehlschlägt - in beiden Fällen soll die Original-Data-URL
 * weiterverwendet werden.
 */
function compressImageDataUrl(imgObj, targetDisplayWidth, targetDisplayHeight) {
    const targetW = Math.max(1, Math.round(targetDisplayWidth * IMAGE_COMPRESSION_PIXEL_RATIO));
    const targetH = Math.max(1, Math.round(targetDisplayHeight * IMAGE_COMPRESSION_PIXEL_RATIO));

    if (!imgObj.naturalWidth || !imgObj.naturalHeight) return null;
    if (imgObj.naturalWidth <= targetW && imgObj.naturalHeight <= targetH) return null;

    try {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        // Weißer Hintergrund, falls das Original Transparenz enthält (z.B.
        // ein PNG-Screenshot) - JPEG kennt keine Transparenz und würde sie
        // sonst als Schwarz rendern.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(imgObj, 0, 0, targetW, targetH);
        return canvas.toDataURL('image/jpeg', IMAGE_COMPRESSION_QUALITY);
    } catch (e) {
        console.error('Bildkomprimierung fehlgeschlagen, verwende Original:', e);
        return null;
    }
}

export function initNotizen() {
    container = document.getElementById('notizen-container');
    if (!container) return;

    container.style.overflowY = 'auto';
    container.style.overflowX = 'hidden';

    // Wächst das Blatt automatisch mit, sobald man beim Wischen/Schieben
    // (z.B. mit dem Finger auf dem iPad, siehe "Verschieben"-Modus) in die
    // Nähe des aktuellen unteren Randes kommt.
    container.addEventListener('scroll', () => ensureEndlessHeight());

    let initialWidth = container.clientWidth > 0 ? container.clientWidth : 1000;
    let initialHeight = 4000; 

    stage = new Konva.Stage({
        container: 'notizen-container',
        width: initialWidth,
        height: initialHeight,
    });

    drawingLayer = new Konva.Layer(); 
    objectLayer = new Konva.Layer();  
    stage.add(drawingLayer);
    stage.add(objectLayer);

    tr = new Konva.Transformer({ 
        keepRatio: true,
        padding: 5,
        borderStroke: '#0b66ff'
    });
    objectLayer.add(tr);

    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            if (entry.contentRect.width > 0) {
                stage.width(entry.contentRect.width);
            }
        }
    });
    resizeObserver.observe(container);

    stage.on('mousedown touchstart', function (e) {
        if (e.target === stage) {
            tr.nodes([]);
        }
        if (mode !== 'draw' && mode !== 'erase') return;
        if (e.target !== stage) return; 

        isPaint = true;
        let pos = stage.getPointerPosition();
        if (!pos) return;
        
        lastLine = new Konva.Line({
            stroke: mode === 'erase' ? '#fafbff' : '#0b66ff',
            strokeWidth: mode === 'erase' ? 40 : 3,
            globalCompositeOperation: mode === 'erase' ? 'destination-out' : 'source-over',
            lineCap: 'round',
            lineJoin: 'round',
            points: [pos.x, pos.y, pos.x, pos.y],
        });
        drawingLayer.add(lastLine);
    });

    stage.on('mouseup touchend', function () {
        isPaint = false;
    });

    stage.on('mousemove touchmove', function (e) {
        if (!isPaint) return;
        e.evt.preventDefault();
        const pos = stage.getPointerPosition();
        if (!pos) return;
        let newPoints = lastLine.points().concat([pos.x, pos.y]);
        lastLine.points(newPoints);
        ensureEndlessHeight(pos.y);
    });

    // Auch beim Verschieben eines Bildes/Textfelds per Drag soll das Blatt
    // automatisch weiter wachsen, wenn man nahe an den unteren Rand zieht.
    objectLayer.on('dragmove', (e) => {
        if (e.target === tr) return;
        const rect = e.target.getClientRect({ skipTransform: false });
        ensureEndlessHeight(rect.y + rect.height);
    });

    stage.on('click tap', function (e) {
        if (mode === 'text' && e.target === stage) {
            const pos = stage.getPointerPosition();
            if (pos) {
                addTextNode(pos.x, pos.y);
                setMode('draw'); 
            }
        }
    });

    document.getElementById('note-image-upload').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (event) {
            const imgObj = new Image();
            imgObj.onload = function () {
                const konvaImg = new Konva.Image({
                    x: 50, y: getNextImageY(),
                    image: imgObj,
                    draggable: true,
                });
                const maxWidth = stage.width() - 100;
                if (konvaImg.width() > maxWidth && maxWidth > 0) {
                    const ratio = maxWidth / konvaImg.width();
                    konvaImg.width(maxWidth);
                    konvaImg.height(konvaImg.height() * ratio);
                }
                // NEU: Höhe zusätzlich begrenzen, damit ein einzelnes Bild beim
                // PDF-Export in der Regel komplett auf eine Seite passt und nicht
                // mittendrin abgeschnitten wird. Das Verhältnis entspricht ungefähr
                // der nutzbaren Höhe/Breite einer PDF-Seite (siehe exportManager.js).
                const maxHeight = maxWidth > 0 ? maxWidth * PDF_PAGE_CONTENT_ASPECT : Infinity;
                if (konvaImg.height() > maxHeight) {
                    const ratio2 = maxHeight / konvaImg.height();
                    konvaImg.height(maxHeight);
                    konvaImg.width(konvaImg.width() * ratio2);
                }
                // Bild auf die tatsächlich benötigte Auflösung komprimieren
                // (siehe compressImageDataUrl oben), damit z.B. hochauflösende
                // iPad-Kamerafotos nicht in voller Größe im Speicher und im
                // Autosave landen. Bei kleinen Bildern (schon <= Zielgröße)
                // liefert die Funktion null zurück - dann bleibt das Original.
                const compressedDataUrl = compressImageDataUrl(imgObj, konvaImg.width(), konvaImg.height());

                // Data-URL (komprimiert, falls möglich, sonst Original) am
                // Node hinterlegen, damit serializeNotizen() (siehe unten,
                // für den Autosave) das Bild später wiederherstellen kann -
                // Konva selbst speichert nur eine Referenz auf das
                // <img>-Element, keine wiederverwendbaren Bilddaten.
                konvaImg.setAttr('sourceDataUrl', compressedDataUrl || event.target.result);

                objectLayer.add(konvaImg);
                tr.nodes([konvaImg]);
                tr.moveToTop();
                wireImageInteractions(konvaImg);
                // Endlosblatt: falls das neu eingefügte Bild unten aus dem
                // bisherigen Blatt herausragen würde, das Blatt verlängern.
                ensureEndlessHeight(konvaImg.y() + konvaImg.height());

                if (compressedDataUrl) {
                    // Auch die im Speicher gehaltene Bildquelle selbst auf
                    // die komprimierte Version umstellen, statt intern
                    // weiter das volle Originalbild im RAM zu halten.
                    const compressedImgObj = new Image();
                    compressedImgObj.onload = function () {
                        konvaImg.image(compressedImgObj);
                        objectLayer.batchDraw();
                    };
                    compressedImgObj.src = compressedDataUrl;
                }
            };
            imgObj.src = event.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = ''; 
    });

    document.getElementById('btn-note-draw').addEventListener('click', () => setMode('draw'));
    document.getElementById('btn-note-erase').addEventListener('click', () => setMode('erase'));
    document.getElementById('btn-note-text').addEventListener('click', () => setMode('text'));
    document.getElementById('btn-note-pan').addEventListener('click', () => setMode('pan'));
    document.getElementById('btn-note-clear').addEventListener('click', async () => {
        if (await showConfirm("Alles löschen?", "Möchten Sie wirklich alle Notizen löschen?")) {
            drawingLayer.destroyChildren();
            objectLayer.destroyChildren();
            tr = new Konva.Transformer({ keepRatio: true, padding: 5, borderStroke: '#0b66ff' });
            objectLayer.add(tr);
        }
    });

    // Anfangszustand (Button-Hervorhebung, Cursor, touch-action) synchron
    // zum Default-Modus 'draw' setzen.
    setMode('draw');
}

// Verdrahtet die Interaktionen (auswählen, per Doppelklick löschen) für ein
// eingefügtes Bild. Ausgelagert, damit sowohl neu hochgeladene Bilder als
// auch beim Wiederherstellen eines Autosaves neu erzeugte Bilder dieselbe
// Logik nutzen (siehe restoreNotizen() weiter unten).
function wireImageInteractions(konvaImg) {
    konvaImg.on('mousedown touchstart', () => { tr.nodes([konvaImg]); tr.moveToTop(); });
    konvaImg.on('dblclick dbltap', async () => {
         if (await showConfirm("Bild löschen?", "Soll dieses Bild entfernt werden?")) {
             tr.nodes([]);
             konvaImg.destroy();
         }
    });
}

function setMode(newMode) {
    mode = newMode;
    const activeBg = '#0b66ff', inactiveBg = '#f8f9fa';
    if (tr) tr.nodes([]);
    [['btn-note-draw', 'draw'], ['btn-note-erase', 'erase'], ['btn-note-text', 'text'], ['btn-note-pan', 'pan']].forEach(([id, m]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.style.backgroundColor = mode === m ? activeBg : inactiveBg;
        btn.style.color = mode === m ? 'white' : '#212529';
    });
    if (!container) return;
    if (mode === 'text') container.style.cursor = 'text';
    else if (mode === 'erase') container.style.cursor = 'cell';
    else if (mode === 'pan') container.style.cursor = 'grab';
    else container.style.cursor = 'crosshair';
    // Beim Zeichnen/Radieren übernimmt unser eigener Handler das komplette
    // Touch-Handling (siehe touchmove-Listener, preventDefault), daher blockt
    // 'none' zusätzlich natives Scrollen, damit der erste Touch nicht kurz
    // "zuckt". In "Verschieben" (und "Text") soll der Browser dagegen
    // natives, vertikales Wischen zulassen - dadurch lässt sich das
    // Endlosblatt wie erwartet mit dem Finger nach unten schieben.
    container.style.touchAction = (mode === 'draw' || mode === 'erase') ? 'none' : 'pan-y';
}

function addTextNode(x, y) {
    const textNode = new Konva.Text({
        text: 'Doppelklick zum Tippen...',
        x: x,
        y: y,
        fontSize: 14, // <--- WIEDER AUF DEN GOLDENEN MITTELWEG 14 GESETZT
        draggable: true,
        fill: '#000',
        width: 400,
    });

    objectLayer.add(textNode);
    wireTextEditing(textNode);
}

// Verdrahtet die "Doppelklick zum Bearbeiten"-Logik für ein Textfeld.
// Ausgelagert (statt inline in addTextNode), damit auch beim Wiederherstellen
// eines Autosaves erzeugte Textfelder (siehe restoreNotizen() weiter unten)
// bearbeitbar sind.
function wireTextEditing(textNode) {
    textNode.on('dblclick dbltap', () => {
        textNode.hide();
        const textPosition = textNode.absolutePosition();
        const stageBox = stage.container().getBoundingClientRect();

        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);

        textarea.value = textNode.text() === 'Doppelklick zum Tippen...' ? '' : textNode.text();
        textarea.style.position = 'absolute';
        textarea.style.top = (stageBox.top + textPosition.y) + 'px';
        textarea.style.left = (stageBox.left + textPosition.x) + 'px';
        textarea.style.width = textNode.width() + 'px';
        textarea.style.fontSize = textNode.fontSize() + 'px'; 
        textarea.style.border = '2px dashed #0b66ff';
        textarea.style.padding = '5px';
        textarea.style.margin = '0px';
        textarea.style.overflow = 'hidden'; 
        textarea.style.background = 'white';
        textarea.style.outline = 'none';
        textarea.style.resize = 'none'; 
        textarea.style.boxSizing = 'border-box';
        textarea.style.zIndex = 1000;
        
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight > 30 ? textarea.scrollHeight : 30) + 'px';

        textarea.focus();

        textarea.addEventListener('input', function () {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        });

        function removeTextarea() {
            if (!textarea.parentNode) return;
            textNode.show();
            if (textarea.value.trim() === '') {
                textNode.destroy();
            } else {
                textNode.text(textarea.value);
            }
            document.body.removeChild(textarea);
        }

        textarea.addEventListener('keydown', function (e) {
            e.stopPropagation(); 
            if (e.key === 'Escape') removeTextarea(); 
        });
        
        textarea.addEventListener('keyup', function (e) {
            e.stopPropagation(); 
        });

        textarea.addEventListener('blur', removeTextarea); 
    });
}

export function hasNotizen() {
    if (!drawingLayer || !objectLayer) return false;
    const drawingCount = drawingLayer.getChildren().length;
    const objectCount = objectLayer.getChildren().filter(node => node.className !== 'Transformer').length;
    return drawingCount > 0 || objectCount > 0;
}

export function getNotizenImage() {
    if (!stage) return null;
    if (tr) tr.nodes([]); 
    const pixelRatio = 1.5;
    let hasD = drawingLayer.getChildren().length > 0;
    let oChildren = objectLayer.getChildren().filter(n => n.className !== 'Transformer');
    let hasO = oChildren.length > 0;
    if (!hasD && !hasO) return { dataUrl: stage.toDataURL({ pixelRatio }), imageBoxes: [] };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    if (hasD) {
        const dBox = drawingLayer.getClientRect();
        if(dBox.width > 0 && dBox.height > 0) {
            minX = Math.min(minX, dBox.x); minY = Math.min(minY, dBox.y);
            maxX = Math.max(maxX, dBox.x + dBox.width); maxY = Math.max(maxY, dBox.y + dBox.height);
        }
    }
    if (hasO) {
        const oBox = objectLayer.getClientRect({ skipTransform: false });
        if(oBox.width > 0 && oBox.height > 0) {
            minX = Math.min(minX, oBox.x); minY = Math.min(minY, oBox.y);
            maxX = Math.max(maxX, oBox.x + oBox.width); maxY = Math.max(maxY, oBox.y + oBox.height);
        }
    }
    if (minX === Infinity) return { dataUrl: stage.toDataURL({ pixelRatio }), imageBoxes: [] };
    const margin = 40;
    const cropX = minX - margin;
    const cropY = minY - margin;
    const cropWidth = (maxX - minX) + margin * 2;
    const cropHeight = (maxY - minY) + margin * 2;

    const dataUrl = stage.toDataURL({
        pixelRatio,
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight
    });

    // Bounding-Boxen der eingefügten Bilder (Konva.Image), umgerechnet in den
    // finalen Bitmap-Pixelraum des exportierten Bildes. Der PDF-Export nutzt
    // diese, um Seitenumbrüche nicht mitten durch ein Bild zu legen.
    const imageBoxes = [];
    oChildren.forEach(node => {
        if (node.className !== 'Image') return;
        const rect = node.getClientRect({ skipTransform: false });
        if (rect.width <= 0 || rect.height <= 0) return;
        imageBoxes.push({
            x: (rect.x - cropX) * pixelRatio,
            y: (rect.y - cropY) * pixelRatio,
            width: rect.width * pixelRatio,
            height: rect.height * pixelRatio
        });
    });

    return { dataUrl, imageBoxes };
}

/**
 * Serialisiert das komplette Notizen-Whiteboard (Freihand-Linien, Textfelder,
 * Bilder inkl. Bilddaten als Data-URL, i.d.R. komprimiert - siehe
 * compressImageDataUrl) in ein reines, JSON-taugliches Objekt.
 * Wird vom Autosave (autosaveManager.js) genutzt, um die Notizen regelmäßig
 * in den localStorage zu sichern.
 * @returns {{lines: object[], objects: object[]} | null} null, wenn das
 * Whiteboard noch nicht initialisiert wurde oder komplett leer ist.
 */
export function serializeNotizen() {
    if (!drawingLayer || !objectLayer) return null;

    const lines = drawingLayer.getChildren().map(n => ({
        points: n.points(),
        stroke: n.stroke(),
        strokeWidth: n.strokeWidth(),
        globalCompositeOperation: n.globalCompositeOperation(),
    }));

    const objects = [];
    objectLayer.getChildren().forEach(n => {
        if (n.className === 'Transformer') return;
        if (n.className === 'Text') {
            objects.push({
                type: 'text',
                text: n.text(),
                x: n.x(),
                y: n.y(),
                fontSize: n.fontSize(),
                width: n.width(),
                rotation: n.rotation(),
            });
        } else if (n.className === 'Image') {
            const dataUrl = n.getAttr('sourceDataUrl');
            if (!dataUrl) return; // ohne Originaldaten kann das Bild nicht wiederhergestellt werden
            objects.push({
                type: 'image',
                dataUrl,
                x: n.x(),
                y: n.y(),
                width: n.width(),
                height: n.height(),
                rotation: n.rotation(),
            });
        }
    });

    if (lines.length === 0 && objects.length === 0) return null;
    // canvasHeight: die aktuelle (ggf. durch das Endlosblatt-Wachstum
    // vergrößerte) Blatthöhe wird mitgesichert, damit sie beim Wiederherstellen
    // nicht wieder auf die Start-Höhe zurückfällt und dadurch weiter unten
    // liegende Inhalte abgeschnitten werden (siehe restoreNotizen()).
    return { lines, objects, canvasHeight: stage ? stage.height() : undefined };
}

/**
 * Stellt ein zuvor mit serializeNotizen() gesichertes Notizen-Whiteboard
 * wieder her. Ersetzt den kompletten aktuellen Inhalt. initNotizen() muss
 * vorher gelaufen sein (stage/drawingLayer/objectLayer müssen existieren).
 */
export function restoreNotizen(data) {
    if (!stage || !drawingLayer || !objectLayer || !data) return;

    drawingLayer.destroyChildren();
    objectLayer.destroyChildren();
    tr = new Konva.Transformer({ keepRatio: true, padding: 5, borderStroke: '#0b66ff' });
    objectLayer.add(tr);

    // Endlosblatt: gesicherte Höhe wiederherstellen, damit ein zuvor
    // gewachsenes Blatt nicht wieder auf die Start-Höhe schrumpft und
    // dadurch weiter unten liegende Inhalte abschneidet.
    if (typeof data.canvasHeight === 'number' && data.canvasHeight > stage.height()) {
        stage.height(data.canvasHeight);
    }

    (data.lines || []).forEach(l => {
        if (!Array.isArray(l.points)) return;
        const line = new Konva.Line({
            stroke: l.stroke,
            strokeWidth: l.strokeWidth,
            globalCompositeOperation: l.globalCompositeOperation || 'source-over',
            lineCap: 'round',
            lineJoin: 'round',
            points: l.points,
        });
        drawingLayer.add(line);
    });

    (data.objects || []).forEach(o => {
        if (o.type === 'text') {
            const textNode = new Konva.Text({
                text: o.text || '',
                x: o.x || 0,
                y: o.y || 0,
                fontSize: o.fontSize || 14,
                draggable: true,
                fill: '#000',
                width: o.width || 400,
                rotation: o.rotation || 0,
            });
            objectLayer.add(textNode);
            wireTextEditing(textNode);
        } else if (o.type === 'image' && o.dataUrl) {
            const imgObj = new Image();
            imgObj.onload = function () {
                const konvaImg = new Konva.Image({
                    x: o.x || 0,
                    y: o.y || 0,
                    image: imgObj,
                    draggable: true,
                    width: o.width || imgObj.naturalWidth,
                    height: o.height || imgObj.naturalHeight,
                    rotation: o.rotation || 0,
                });
                konvaImg.setAttr('sourceDataUrl', o.dataUrl);
                objectLayer.add(konvaImg);
                wireImageInteractions(konvaImg);
                objectLayer.batchDraw();
            };
            imgObj.src = o.dataUrl;
        }
    });

    // Sicherheitsnetz: falls canvasHeight fehlt (ältere Speicherstände) oder
    // kleiner als der tatsächliche Inhalt ist, anhand der wiederhergestellten
    // Linien/Objekte selbst nachrechnen, statt sich allein auf data.canvasHeight
    // zu verlassen.
    let restoredMaxBottom = 0;
    (data.lines || []).forEach(l => {
        if (!Array.isArray(l.points)) return;
        for (let i = 1; i < l.points.length; i += 2) restoredMaxBottom = Math.max(restoredMaxBottom, l.points[i]);
    });
    (data.objects || []).forEach(o => {
        restoredMaxBottom = Math.max(restoredMaxBottom, (o.y || 0) + (o.height || 0));
    });
    ensureEndlessHeight(restoredMaxBottom);

    drawingLayer.batchDraw();
    objectLayer.batchDraw();
}