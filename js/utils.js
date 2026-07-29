// js/utils.js

/**
 * Wandelt Grad in Bogenmaß um.
 * @param {number} d Grad
 * @returns {number} Bogenmaß
 */
export function toRadians(d) { 
    return d * Math.PI / 180; 
}

/**
 * Wandelt Bogenmaß in Grad um.
 * @param {number} r Bogenmaß
 * @returns {number} Grad
 */
export function toDegrees(r) { 
    return r * 180 / Math.PI; 
}

/**
 * Prüft, ob zwei Zahlen "ungefähr" gleich sind.
 * @param {number} a Zahl 1
 * @param {number} b Zahl 2
 * @param {number} [eps=0.0001] Toleranz
 * @returns {boolean}
 */
export function approxEqual(a, b, eps = 0.0001) { 
    return Math.abs(a - b) < eps; 
}

/**
 * Berechnet die Pixelfläche eines Polygons.
 * @param {Array<Object>} pts Array von {x, y} Punkten
 * @returns {number} Fläche in Pixeln²
 */
export function polygonAreaPx(pts) {
  let sum = 0;
  const numPts = (pts.length > 2 && pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y) ? pts.length - 1 : pts.length;
  for (let i = 0; i < numPts; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % numPts];
      sum += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(sum / 2);
}

/**
 * Findet den Mittelpunkt (Schwerpunkt) eines Polygons.
 * @param {Array<Object>} pts Array von {x, y} Punkten
 * @returns {Object} {x, y} des Mittelpunkts
 */
export function polygonCentroid(pts) {
  let x = 0, y = 0, A = 0;
   const numPts = (pts.length > 2 && pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y) ? pts.length - 1 : pts.length;
   if (numPts < 3) {
        let sx = 0, sy = 0;
        for(let i = 0; i < numPts; i++){ sx += pts[i].x; sy += pts[i].y; }
        return { x: sx / numPts, y: sy / numPts };
   }

  for (let i = 0; i < numPts; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % numPts];
    const f = p1.x * p2.y - p2.x * p1.y;
    x += (p1.x + p2.x) * f;
    y += (p1.y + p2.y) * f;
    A += f;
  }
  A *= 0.5;
  if (Math.abs(A) < 1e-9) {
    let sx = 0, sy = 0;
    for (let i = 0; i < numPts; i++) { sx += pts[i].x; sy += pts[i].y; }
    return { x: sx / numPts, y: sy / numPts };
  }
  return { x: x / (6 * A), y: y / (6 * A) };
}

/**
 * Berechnet die kürzeste Distanz von einem Punkt (x,y) zu einem Liniensegment (p1, p2).
 * @returns {number} Distanz in Pixeln
 */
export function distanceToSegment(x, y, p1, p2) {
    const A = x - p1.x, B = y - p1.y, C = p2.x - p1.x, D = p2.y - p1.y;
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;
    let xx, yy;
    if (param < 0) { xx = p1.x; yy = p1.y; }
    else if (param > 1) { xx = p2.x; yy = p2.y; }
    else { xx = p1.x + param * C; yy = p1.y + param * D; }
    return Math.hypot(x - xx, y - yy);
}

/**
 * Erstellt ein Vorschaubild (Thumbnail) für eine gegebene Skizze.
 * @param {Array<Object>} points - Die Punkte der Skizze.
 * @param {Set<number>} deletedSegments - Ein Set mit den Indizes der gelöschten Segmente.
 * @returns {string} - Eine Data-URL des generierten Bildes im PNG-Format.
 */
export function generateThumbnail(points, deletedSegments) {
    const thumbnailWidth = 800;
    const thumbnailHeight = 600;
    const margin = 30;

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = thumbnailWidth;
    offscreenCanvas.height = thumbnailHeight;
    const ctx = offscreenCanvas.getContext('2d');

    // Hintergrund weiß füllen
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, thumbnailWidth, thumbnailHeight);

    if (!points || points.length === 0) {
        return offscreenCanvas.toDataURL('image/png');
    }

    // Bounding-Box berechnen, um die Skizze zu zentrieren
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });

    // Sicherheits-Check für den Fall, dass alle Punkte identisch sind
    if (maxX - minX < 1) { minX -= 50; maxX += 50; }
    if (maxY - minY < 1) { minY -= 50; maxY += 50; }

    const width = maxX - minX;
    const height = maxY - minY;
    
    // Skalierungsfaktor berechnen, damit alles ins Bild passt
    const scaleToFit = Math.min(
        (thumbnailWidth - 2 * margin) / width,
        (thumbnailHeight - 2 * margin) / height
    );

    ctx.save();
    ctx.translate(margin, margin);
    ctx.scale(scaleToFit, scaleToFit);
    ctx.translate(-minX, -minY);

    ctx.strokeStyle = "#0b66ff";
    ctx.lineWidth = 2 / scaleToFit;

    // Linien und Nummern zeichnen
    for (let i = 1; i < points.length; i++) {
        const segmentIndex = i - 1;
        if (deletedSegments && deletedSegments.has(segmentIndex)) continue;

        const p1 = points[i - 1];
        const p2 = points[i];
        
        // 1. Die blaue Linie zeichnen
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        
        // 2. Die Nummer der Linie berechnen und zeichnen
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);

        if (len > 0) {
            // Abstand der Zahl zur Linie (skaliert mit dem Bild)
            const offsetDist = 14 / scaleToFit; 
            
            ctx.save();
            ctx.fillStyle = "#e74c3c"; // Rote Schriftfarbe für gute Sichtbarkeit
            ctx.font = `bold ${22 / scaleToFit}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            // Position orthogonal (im 90° Winkel) zur Linie verschieben
            const textX = midX - (dy / len) * offsetDist;
            const textY = midY + (dx / len) * offsetDist;

            // Weiße Kontur um die rote Zahl für perfekten Kontrast
            ctx.lineWidth = 4 / scaleToFit;
            ctx.strokeStyle = "#ffffff";
            ctx.strokeText(String(i), textX, textY);
            
            // Die eigentliche Zahl zeichnen
            ctx.fillText(String(i), textX, textY);
            ctx.restore();
        }
    }

    ctx.restore();
    return offscreenCanvas.toDataURL('image/png');
}