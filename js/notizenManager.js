// js/notizenManager.js
import { showConfirm } from './dialogManager.js';

let stage, drawingLayer, objectLayer;
let isPaint = false;
let mode = 'draw'; 
let lastLine;
let tr; 

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

export function initNotizen() {
    const container = document.getElementById('notizen-container');
    if (!container) return;

    container.style.overflowY = 'auto';
    container.style.overflowX = 'hidden';

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
                objectLayer.add(konvaImg);
                tr.nodes([konvaImg]);
                tr.moveToTop();
                konvaImg.on('mousedown touchstart', () => { tr.nodes([konvaImg]); tr.moveToTop(); });
                konvaImg.on('dblclick dbltap', async () => {
                     if(await showConfirm("Bild löschen?", "Soll dieses Bild entfernt werden?")) {
                         tr.nodes([]); 
                         konvaImg.destroy();
                     }
                });
            };
            imgObj.src = event.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = ''; 
    });

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
}

function setMode(newMode) {
    mode = newMode;
    const activeBg = '#0b66ff', inactiveBg = '#f8f9fa';
    if (tr) tr.nodes([]);
    document.getElementById('btn-note-draw').style.backgroundColor = mode === 'draw' ? activeBg : inactiveBg;
    document.getElementById('btn-note-draw').style.color = mode === 'draw' ? 'white' : '#212529';
    document.getElementById('btn-note-erase').style.backgroundColor = mode === 'erase' ? activeBg : inactiveBg;
    document.getElementById('btn-note-erase').style.color = mode === 'erase' ? 'white' : '#212529';
    document.getElementById('btn-note-text').style.backgroundColor = mode === 'text' ? activeBg : inactiveBg;
    document.getElementById('btn-note-text').style.color = mode === 'text' ? 'white' : '#212529';
    const container = document.getElementById('notizen-container');
    if (mode === 'text') container.style.cursor = 'text';
    else if (mode === 'erase') container.style.cursor = 'cell';
    else container.style.cursor = 'crosshair';
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