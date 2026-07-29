/* global Konva */ // Sagt dem Editor, dass Konva global existiert (vom CDN)

export const stage = new Konva.Stage({
  container: "container",
  width: window.innerWidth - 20,
  height: window.innerHeight - 80
});

// --- Grid Layer ---
export const gridLayer = new Konva.Layer();

const GRID_SIZE = 10000; // 10000x10000 pixel grid
const GRID_STROKE = '#ddd';

// ##### HIER IST DIE 1. ÄNDERUNG #####
// Die Funktion wird exportiert und akzeptiert den Maßstab als 'newStep'
/**
 * Löscht das alte Gitter und zeichnet ein neues basierend auf dem Maßstab (px/m).
 * @param {number} newStep - Der neue Gitter-Abstand (z.B. 50 für 50px/m)
 */
export function updateGrid(newStep) {
    // 1. Lösche das alte Gitter
    gridLayer.destroyChildren();

    // 2. Setze den neuen Gitter-Abstand
    const GRID_STEP = newStep; 
    
    // 3. Hole den aktuellen Kamera-Zoom, damit die Linien dünn bleiben
    const zoom = stage.scaleX() || 1;
    const GRID_STROKE_WIDTH = 1 / zoom;

    // 4. Zeichne die Linien (derselbe Code wie vorher, aber jetzt mit variablem GRID_STEP)
    // Vertikale Linien
    for (let i = -GRID_SIZE / 2; i <= GRID_SIZE / 2; i += GRID_STEP) {
        gridLayer.add(new Konva.Line({
            points: [i, -GRID_SIZE / 2, i, GRID_SIZE / 2],
            stroke: GRID_STROKE,
            strokeWidth: GRID_STROKE_WIDTH,
            listening: false, 
            name: 'gridLine'
        }));
    }
    // Horizontale Linien
    for (let j = -GRID_SIZE / 2; j <= GRID_SIZE / 2; j += GRID_STEP) {
        gridLayer.add(new Konva.Line({
            points: [-GRID_SIZE / 2, j, GRID_SIZE / 2, j],
            stroke: GRID_STROKE,
            strokeWidth: GRID_STROKE_WIDTH,
            listening: false, 
            name: 'gridLine'
        }));
    }
    
    // Stärkere Achsenlinien (X und Y)
    gridLayer.add(new Konva.Line({
        points: [0, -GRID_SIZE / 2, 0, GRID_SIZE / 2],
        stroke: '#bbb', 
        strokeWidth: GRID_STROKE_WIDTH, 
        listening: false,
        name: 'gridLine'
    }));
    gridLayer.add(new Konva.Line({
        points: [-GRID_SIZE / 2, 0, GRID_SIZE / 2, 0],
        stroke: '#bbb', 
        strokeWidth: GRID_STROKE_WIDTH, 
        listening: false,
        name: 'gridLine'
    }));
    
    // 5. Zeige das neue Gitter an
    gridLayer.batchDraw();
}
// ##### ENDE DER 1. ÄNDERUNG #####


export const layer = new Konva.Layer();
export const guideLayer = new Konva.Layer();

// --- MODIFIZIERT: Layer-Reihenfolge ---
stage.add(gridLayer); // Zuerst das Grid (hinten)
stage.add(layer);     // Dann der Inhalt
stage.add(guideLayer); // Zuletzt die Hilfslinien (vorn)

export const zoomIndicator = document.getElementById("zoom-indicator");