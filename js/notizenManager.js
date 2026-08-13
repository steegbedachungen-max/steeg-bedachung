// js/notizenManager.js
import { showConfirm } from './dialogManager.js';

let stage, drawingLayer, objectLayer, container;
let isPaint = false;
let mode = 'draw';
let lastLine;
let tr;

// Manuelles Verschieben mit dem Finger auf leerer Fläche (siehe
// stage.on('pointerdown'/'pointermove', ...) weiter unten). touch-action
// bleibt bewusst dauerhaft 'none' (siehe initNotizen), damit der Apple
// Pencil beim Zeichnen NIE mit einem vom Browser selbst gestarteten nativen
// Scroll-Versuch kollidiert - das Scrollen per Finger übernehmen wir
// stattdessen hier komplett selbst.
//
// Handballen-Ablehnung ("Palm Rejection"): Beim Schreiben mit dem Apple
// Pencil liegt praktisch immer auch die Handkante/der Handballen auf dem
// Display auf. Da wir touch-action komplett selbst übernehmen (s.o.), würde
// dieser aufliegende Handballen sonst als "Finger" erkannt und das Blatt bei
// jeder kleinen Bewegung der Hand hin- und herschieben. Gegenmaßnahmen:
//  1. isPenActive/lastPenActivityAt: Solange der Pencil aktiv ist (oder es
//     erst vor kurzem war), wird JEDER Touch-Kontakt ignoriert - das deckt
//     den Hauptfall (Handballen liegt WÄHREND des Schreibens auf) zuverlässig ab.
//  2. PAN_START_THRESHOLD_PX: Ein Touch-Kontakt löst erst dann ein
//     tatsächliches Verschieben aus, wenn er sich um ein Mindestmaß bewegt
//     hat - ein ruhig aufliegender Handballen (der nur minimal wackelt)
//     verschiebt das Blatt dadurch nicht mehr allein durchs Aufsetzen.
//  3. pointerId-Tracking: Nur der Touch-Kontakt, der das Verschieben
//     tatsächlich ausgelöst hat, wird weiterverfolgt - ein zusätzlicher
//     zweiter Kontaktpunkt (z. B. weiterer Teil des Handballens) kann das
//     laufende Verschieben nicht mehr durcheinanderbringen.
const PALM_REJECTION_WINDOW_MS = 700;
const PAN_START_THRESHOLD_PX = 12;
let isPenActive = false;
let lastPenActivityAt = 0;
let isPanningTouch = false;
let lastPanClientY = 0;
let pendingPanPointerId = null;
let pendingPanStartX = 0;
let pendingPanStartY = 0;

// Sammelt die Punkte des GERADE gezeichneten Strichs als eigenes, einfaches
// JS-Array (statt bei jedem pointermove über lastLine.points().concat(...)
// eine komplette Kopie des bisherigen Arrays anzulegen - das wird bei langen
// Strichen zunehmend langsamer/ruckeliger, da jede Kopie O(n) kostet). Wird
// per push() erweitert und dasselbe Array-Objekt an lastLine.points()
// übergeben.
let currentStrokePoints = null;

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
    // Dauerhaft 'none': der Browser soll bei KEINEM Touch auf der
    // Zeichenfläche selbst irgendeine native Aktion (Scrollen/Zoomen)
    // versuchen - weder mit dem Finger noch mit dem Apple Pencil. Das
    // Verschieben mit dem Finger übernehmen wir komplett selbst (siehe
    // isPanningTouch weiter unten); so kann der Pencil beim Zeichnen nie mit
    // einem vom Browser gestarteten Scroll-Versuch kollidieren, was zuvor zu
    // ruckeligen/abgehackten Strichen geführt hat.
    container.style.touchAction = 'none';

    // Wächst das Blatt automatisch mit, sobald man beim Wischen/Schieben mit
    // dem Finger in die Nähe des aktuellen unteren Randes kommt.
    container.addEventListener('scroll', () => ensureEndlessHeight());

    let initialWidth = container.clientWidth > 0 ? container.clientWidth : 1000;
    let initialHeight = 4000; 

    stage = new Konva.Stage({
        container: 'notizen-container',
        width: initialWidth,
        height: initialHeight,
        // Konva ruft standardmäßig (preventDefault:true) intern selbst
        // event.preventDefault() für jedes native "touchstart" auf der Stage
        // auf. Da wir das komplette Touch-Verhalten (Zeichnen mit dem
        // Pencil vs. manuelles Verschieben mit dem Finger, siehe unten)
        // ohnehin selbst steuern, ist das nicht nötig - und würde sich mit
        // unserer eigenen preventDefault-Logik im Weg stehen.
        preventDefault: false,
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

    // WICHTIG: Wir verwenden bewusst die "pointerdown"/"pointermove"/
    // "pointerup"-Events (Konvas Pointer-Events-Unterstützung ist per
    // Default aktiv), NICHT "mousedown touchstart" etc. Zwei Gründe:
    //  1. e.evt.pointerType liefert direkt und zuverlässig "mouse"/"pen"/
    //     "touch" - kein separates Tracking über einen zusätzlichen
    //     "pointerdown"-Listener mehr nötig.
    //  2. Nur ein natives PointerEvent bietet getCoalescedEvents(): Bei
    //     hoher Eingabefrequenz (Apple Pencil, ProMotion-Displays mit bis zu
    //     120Hz) fasst der Browser mehrere echte Abtastpunkte zu einem
    //     einzigen ausgelieferten "pointermove" zusammen, wenn der
    //     Haupt-Thread kurz beschäftigt ist - ohne getCoalescedEvents()
    //     gehen diese Zwischenpunkte verloren und der Strich wirkt eckig/
    //     ungenau statt dem tatsächlichen Stiftweg zu folgen.
    let drawCanvasEl = null; // wird beim ersten Zeichnen-Versuch einmalig ermittelt (siehe unten)

    stage.on('pointerdown', function (e) {
        if (e.target === stage) {
            tr.nodes([]);
        }

        if (e.evt.pointerType === 'pen') {
            isPenActive = true;
            lastPenActivityAt = Date.now();
        }

        // Ein Finger zeichnet/radiert nie, sondern verschiebt stattdessen
        // das Blatt - aber NUR, wenn er auf leerer Fläche aufsetzt
        // (e.target === stage). Landet der Finger dagegen auf einem Bild/
        // Textfeld, wird hier NICHTS weiter gemacht, damit dessen eigenes
        // draggable-Verhalten (siehe wireImageInteractions) wie gewohnt
        // greift - Bilder/Textfelder bleiben mit dem Finger verschiebbar.
        if (e.evt.pointerType === 'touch') {
            // Handballen-Ablehnung, Teil 1: Solange der Pencil gerade aktiv
            // ist (oder es innerhalb des Gnadenfensters kürzlich war), diesen
            // Touch-Kontakt komplett ignorieren - mit hoher Wahrscheinlichkeit
            // der aufliegende Handballen, kein bewusstes Wischen (siehe
            // Erklärung bei den Modul-Variablen oben).
            if (isPenActive || (Date.now() - lastPenActivityAt) < PALM_REJECTION_WINDOW_MS) {
                return;
            }
            if (e.target === stage) {
                // Handballen-Ablehnung, Teil 2: Noch nicht sofort verschieben,
                // sondern erst "vormerken" - erst eine spürbare Bewegung
                // (siehe pointermove unten, PAN_START_THRESHOLD_PX) bestätigt,
                // dass es sich um ein bewusstes Wischen handelt und kein nur
                // ruhig aufliegender Handballen ist.
                pendingPanPointerId = e.evt.pointerId;
                pendingPanStartX = e.evt.clientX;
                pendingPanStartY = e.evt.clientY;
                lastPanClientY = e.evt.clientY;
                isPanningTouch = false;
            }
            return;
        }

        if (mode !== 'draw' && mode !== 'erase') return;
        if (e.target !== stage) return;

        isPaint = true;
        const pos = stage.getPointerPosition();
        if (!pos) return;

        currentStrokePoints = [pos.x, pos.y, pos.x, pos.y];
        lastLine = new Konva.Line({
            stroke: mode === 'erase' ? '#fafbff' : '#0b66ff',
            strokeWidth: mode === 'erase' ? 40 : 3,
            globalCompositeOperation: mode === 'erase' ? 'destination-out' : 'source-over',
            lineCap: 'round',
            lineJoin: 'round',
            points: currentStrokePoints,
        });
        drawingLayer.add(lastLine);

        if (!drawCanvasEl) drawCanvasEl = container.querySelector('canvas');
    });

    stage.on('pointerup pointercancel', function (e) {
        if (e.evt && e.evt.pointerType === 'pen') {
            isPenActive = false;
            // Gnadenfenster (PALM_REJECTION_WINDOW_MS) läuft erst AB JETZT
            // weiter - deckt kurze Pausen zwischen zwei Strichen ab, in denen
            // der Handballen weiterhin aufliegt, der Pencil aber kurz abgehoben ist.
            lastPenActivityAt = Date.now();
        }
        if (e.evt && e.evt.pointerId === pendingPanPointerId) {
            pendingPanPointerId = null;
        }
        isPaint = false;
        isPanningTouch = false;
        currentStrokePoints = null;
    });

    stage.on('pointermove', function (e) {
        if (e.evt.pointerType === 'pen') {
            // Auch reine Annäherung/Bewegung des Pencils (nicht nur ein
            // vollständiger Strich) zählt als "Pencil aktiv" - manche iPads
            // melden den Pencil bereits kurz vor dem Aufsetzen.
            lastPenActivityAt = Date.now();
        }

        if (pendingPanPointerId !== null && e.evt.pointerId === pendingPanPointerId && !isPanningTouch) {
            if (isPenActive) {
                // Der Pencil ist inzwischen aktiv geworden (setzt gerade auf),
                // während dieser Touch-Kontakt noch unbestätigt war - endgültig
                // als Handballen behandeln, nicht mehr zum Verschieben zulassen.
                pendingPanPointerId = null;
                return;
            }
            const dx = e.evt.clientX - pendingPanStartX;
            const dy = e.evt.clientY - pendingPanStartY;
            if (Math.abs(dx) < PAN_START_THRESHOLD_PX && Math.abs(dy) < PAN_START_THRESHOLD_PX) {
                // Noch keine spürbare Bewegung - könnte weiterhin nur ein
                // ruhig aufliegender Handballen sein, also noch nichts verschieben.
                return;
            }
            isPanningTouch = true;
        }

        if (isPanningTouch) {
            e.evt.preventDefault();
            // Finger nach oben ziehen = Blatt nach unten schieben (wie
            // natives Scrollen), daher lastPanClientY - clientY.
            const deltaY = lastPanClientY - e.evt.clientY;
            container.scrollTop += deltaY;
            lastPanClientY = e.evt.clientY;
            ensureEndlessHeight();
            return;
        }
        if (!isPaint || !currentStrokePoints) return;
        e.evt.preventDefault();

        if (!drawCanvasEl) drawCanvasEl = container.querySelector('canvas');
        if (!drawCanvasEl) return;
        const rect = drawCanvasEl.getBoundingClientRect();

        // Alle tatsächlichen Zwischenpunkte seit dem letzten ausgelieferten
        // Event mitnehmen (siehe Erklärung oben), nicht nur den letzten.
        const rawEvents = (typeof e.evt.getCoalescedEvents === 'function') ? e.evt.getCoalescedEvents() : null;
        const events = (rawEvents && rawEvents.length > 0) ? rawEvents : [e.evt];

        events.forEach((evt) => {
            currentStrokePoints.push(evt.clientX - rect.left, evt.clientY - rect.top);
        });
        lastLine.points(currentStrokePoints);
        ensureEndlessHeight(currentStrokePoints[currentStrokePoints.length - 1]);
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

    // Stift-Button: ein einfacher Tap/Klick wechselt in den Zeichnen-Modus.
    // (Es gab hier zwischenzeitlich einen Versuch, per Doppeltipp bzw.
    // Long-Press zusätzlich direkt den Radiergummi umzuschalten - das ließ
    // sich auf einem echten iPad aber nicht zuverlässig genug hinbekommen
    // und wurde auf Wunsch wieder entfernt. Zum Radieren einfach den
    // "Radiergummi"-Button daneben verwenden.)
    document.getElementById('btn-note-draw').addEventListener('click', () => setMode('draw'));
    document.getElementById('btn-note-erase').addEventListener('click', () => setMode('erase'));
    document.getElementById('btn-note-text').addEventListener('click', () => setMode('text'));
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
    [['btn-note-draw', 'draw'], ['btn-note-erase', 'erase'], ['btn-note-text', 'text']].forEach(([id, m]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.style.backgroundColor = mode === m ? activeBg : inactiveBg;
        btn.style.color = mode === m ? 'white' : '#212529';
    });
    if (!container) return;
    if (mode === 'text') container.style.cursor = 'text';
    else if (mode === 'erase') container.style.cursor = 'cell';
    else container.style.cursor = 'crosshair';
    // touch-action bleibt unabhängig vom Modus dauerhaft 'none' (siehe
    // initNotizen) - das Verschieben mit dem Finger übernehmen wir in JEDEM
    // Modus selbst (isPanningTouch), nicht über natives Browser-Scrollen.
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