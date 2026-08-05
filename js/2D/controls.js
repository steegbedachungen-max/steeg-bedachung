/* global Konva */
import { stage, zoomIndicator, gridLayer } from './stage.js';
import { selectNode, deleteSelectedNode } from './selection.js';
import { deselectActiveLabel } from './figure.js';
import { isMeasuring, handleMeasurementClick } from './measurement.js';
import { selectedNode } from './state.js';
import { rescaleAutoDimensionsForZoom } from './autoDimension.js';

const scaleBy = 1.1, minScale = 0.5, maxScale = 4;

let isPanning = false, isSpacePressed = false;

export function initZoomPan() {
    stage.on("wheel", (e) => {
        if (isMeasuring()) {
            e.evt.preventDefault();
            return;
        }

        deselectActiveLabel(); 
        e.evt.preventDefault();
        const oldScale = stage.scaleX() || 1;
        const pointer = stage.getPointerPosition();
        const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
        const direction = e.evt.deltaY > 0 ? 1 : -1;
        let newScale = direction > 0 ? oldScale / scaleBy : oldScale * scaleBy;
        newScale = Math.max(minScale, Math.min(maxScale, newScale));
        stage.scale({ x: newScale, y: newScale });
        const newPos = { x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale };
        stage.position(newPos);

        const newStrokeWidth = 1 / newScale;
        gridLayer.find('.gridLine').forEach(line => {
            line.strokeWidth(newStrokeWidth);
        });
        rescaleAutoDimensionsForZoom(newScale);

        stage.batchDraw();
        zoomIndicator.textContent = `Zoom: ${Math.round(newScale * 100)} %`;
    });

    window.addEventListener("keydown", (e) => {
        if (e.code === "Space") {
            isSpacePressed = true;
            stage.container().style.cursor = "grab";
        }

        // Ausgewähltes Objekt (z.B. Fenster oder PV-Modul) mit der
        // Entfernen-Taste löschen. "Backspace" wird zusätzlich abgefangen,
        // da die "Löschen"-Taste auf Mac-Tastaturen dieses Signal sendet.
        if (e.key === "Delete" || e.key === "Backspace") {
            // Nicht eingreifen, wenn gerade in einem Eingabefeld getippt wird
            // (z.B. Position/Rotation im Seitenpanel, Notizen-Textfelder, ...).
            const active = document.activeElement;
            const isEditingField = active && (
                active.tagName === 'INPUT' ||
                active.tagName === 'TEXTAREA' ||
                active.tagName === 'SELECT' ||
                active.isContentEditable
            );
            if (isEditingField) return;

            if (selectedNode) {
                e.preventDefault();
                if (confirm("Soll das ausgewählte Objekt wirklich gelöscht werden?")) {
                    deleteSelectedNode();
                }
            }
        }
    });
    window.addEventListener("keyup", (e) => {
        if (e.code === "Space") {
            isSpacePressed = false;
            if (!isPanning) stage.container().style.cursor = isMeasuring() ? "crosshair" : "default";
        }
    });

    stage.on("mousedown", (e) => {
        // Wenn der Mess-Modus aktiv ist, wird die Mess-Funktion aufgerufen und die
        // weitere Ausführung dieser Funktion sofort gestoppt.
        if (isMeasuring()) {
            handleMeasurementClick(e);
            return;
        }

        // Der folgende Code wird NUR ausgeführt, wenn NICHT gemessen wird.
        if (e.evt.button === 2 || isSpacePressed) {
            isPanning = true;
            stage.container().style.cursor = "grabbing";
            return;
        }
        
        if (e.evt.button === 0 && e.target === stage) {
            isPanning = true;
            stage.container().style.cursor = "grabbing";
            selectNode(null);
            deselectActiveLabel(); 
            return;
        }
    });

    stage.on("mousemove", (e) => {
        if (isPanning) {
            const p = stage.position();
            stage.position({ x: p.x + e.evt.movementX, y: p.y + e.evt.movementY });
            stage.batchDraw();
        }
    });

    stage.on("mouseup", () => {
        if (isPanning) {
            isPanning = false;
            stage.container().style.cursor = isSpacePressed ? "grab" : (isMeasuring() ? "crosshair" : "default");
        }
    });
}