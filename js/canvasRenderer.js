// js/canvasRenderer.js
import { renderState, canvasState, dataState, getters, uiState } from './state.js';
import { toDegrees, polygonAreaPx, polygonCentroid, approxEqual } from './utils.js';

let mainCtx = null;

/**
 * Initialisiert den Renderer mit dem Canvas-Context.
 * @param {CanvasRenderingContext2D} context 
 */
export function initRenderer(context) {
    mainCtx = context;
}

/**
 * Fordert einen neuen Frame für die Haupt-Render-Schleife an.
 */
export function requestRedraw() {
    renderState.needsRedraw = true;
    if (!renderState.animationFrameRequested) {
        renderState.animationFrameRequested = true;
        requestAnimationFrame(renderLoop);
    }
}

/**
 * Die Haupt-Render-Schleife.
 */
function renderLoop() {
    renderState.animationFrameRequested = false;
    
    if (!mainCtx) {
        console.error("Renderer nicht initialisiert!");
        return;
    }

    if (renderState.needsRedraw) {
        draw(mainCtx); 
        renderState.needsRedraw = false;
    }
    
    if (canvasState.isPanning || canvasState.draggingPoint !== null) { 
        renderState.animationFrameRequested = true;
        requestAnimationFrame(renderLoop);
    }
}

/**
 * Die Haupt-Zeichenfunktion (jetzt vollständig).
 * @param {CanvasRenderingContext2D} ctx 
 */
export function draw(ctx) {
  const canvas = ctx.canvas;
  const container = canvas.parentElement;

  // Auto-Resize für die Zeichenfläche, damit das Raster bis zum Rand geht
  if (container && container.clientWidth > 0) {
      if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;
      }
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx.translate(canvasState.viewOffset.x, canvasState.viewOffset.y);
  ctx.scale(canvasState.zoom, canvasState.zoom);

  const scalePxPerM = getters.getScale();
  const zoom = canvasState.zoom;

  // Hintergrundgitter
  ctx.lineWidth = 1 / zoom; 
  ctx.strokeStyle = "#eee";
  const gridMeters = getters.getGridSize();
  const gridStep = gridMeters * scalePxPerM;
  
  const viewLeft = -canvasState.viewOffset.x / zoom;
  const viewTop = -canvasState.viewOffset.y / zoom;
  const viewRight = viewLeft + (canvas.width / zoom);
  const viewBottom = viewTop + (canvas.height / zoom);
  
  if (gridStep > 0.1) {
    const buffer = Math.max(canvas.width, canvas.height) * 2 / zoom; 
    
    const startX = Math.floor((viewLeft - buffer) / gridStep) * gridStep;
    const endX = viewRight + buffer;
    
    const startY = Math.floor((viewTop - buffer) / gridStep) * gridStep;
    const endY = viewBottom + buffer;
    
    for (let x = startX; x <= endX; x += gridStep) { 
        ctx.beginPath(); 
        ctx.moveTo(x, startY); 
        ctx.lineTo(x, endY); 
        ctx.stroke(); 
    }
    for (let y = startY; y <= endY; y += gridStep) { 
        ctx.beginPath(); 
        ctx.moveTo(startX, y); 
        ctx.lineTo(endX, y); 
        ctx.stroke(); 
    }
  }

  // Linien & Labels
  ctx.lineWidth = 2 / zoom;
  const points = canvasState.points; 
  
  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];
    const segmentIndex = i - 1;

    if (dataState.deletedSegments.has(segmentIndex)) continue; 
    if (dataState.pendingDeletedSegments.has(segmentIndex)) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p1.x * scalePxPerM, p1.y * scalePxPerM);
      ctx.lineTo(p2.x * scalePxPerM, p2.y * scalePxPerM);
      ctx.strokeStyle = "rgba(200,0,0,0.6)";
      ctx.setLineDash([8 / zoom]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(p1.x * scalePxPerM, p1.y * scalePxPerM);
    ctx.lineTo(p2.x * scalePxPerM, p2.y * scalePxPerM);
    ctx.strokeStyle = (canvasState.selectedSegment === segmentIndex ? "#f1c40f" : "#0b66ff");
    ctx.stroke();

    const dx = p2.x - p1.x; 
    const dy = p2.y - p1.y; 
    const distM = Math.hypot(dx, dy);

    if (distM * scalePxPerM > 1) { 
        const midX_px = (p1.x + p2.x) / 2 * scalePxPerM;
        const midY_px = (p1.y + p2.y) / 2 * scalePxPerM;

        ctx.fillStyle = "#222";
        ctx.font = `${12 / zoom}px sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(distM.toFixed(2) + " m", midX_px + 6 / zoom, midY_px - 4 / zoom);

        const label = dataState.segmentLabels[segmentIndex];
        if (label) {
            ctx.fillStyle = "#006400";
            ctx.font = `italic ${12 / zoom}px sans-serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(label, midX_px + 6 / zoom, midY_px + 4 / zoom);
        }
    }
  }

  // Punkte
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    ctx.beginPath(); 
    ctx.arc(p.x * scalePxPerM, p.y * scalePxPerM, 8 / zoom, 0, Math.PI * 2);
    ctx.fillStyle = (i === canvasState.draggingPoint ? "#e74c3c" : "#d33"); 
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.font = `${14 / zoom}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(String(i + 1), p.x * scalePxPerM + 6 / zoom, p.y * scalePxPerM - 6 / zoom);
  }

  // Aktiver Startpunkt-Marker
  const activeStartPoint = canvasState.activeStartPoint;
  if (activeStartPoint !== null && activeStartPoint >= 0 && activeStartPoint < points.length) {
    const p = points[activeStartPoint];
    ctx.beginPath();
    ctx.arc(p.x * scalePxPerM, p.y * scalePxPerM, 12 / zoom, 0, Math.PI * 2);
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2 / zoom;
    ctx.stroke();
  }

  let effectivelyClosed = false;
  if (points.length > 2) {
      const first = points[0];
      const last = points[points.length - 1];
      const closingSegmentIndex = points.length - 2;
      effectivelyClosed = approxEqual(first.x, last.x) &&
                          approxEqual(first.y, last.y) &&
                          !dataState.deletedSegments.has(closingSegmentIndex) &&
                          !dataState.pendingDeletedSegments.has(closingSegmentIndex);
  }

  // Vorschau (Klick-Modus)
  const hoverPos = canvasState.hoverPos; 
  if (hoverPos && document.getElementById('mode').value === 'click' && points.length > 0 && !effectivelyClosed) {
      const startIdxPreview = (activeStartPoint !== null && activeStartPoint < points.length)
                              ? activeStartPoint
                              : points.length - 1;
      const startPointPreview = points[startIdxPreview];

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(startPointPreview.x * scalePxPerM, startPointPreview.y * scalePxPerM);
      ctx.lineTo(hoverPos.x * scalePxPerM, hoverPos.y * scalePxPerM);
      ctx.strokeStyle = "rgba(0,0,200,0.45)";
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([6 / zoom]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      const dx = hoverPos.x - startPointPreview.x; 
      const dy = hoverPos.y - startPointPreview.y; 
      const distM = Math.hypot(dx, dy);

      let mathAbsA = toDegrees(Math.atan2(dy, dx));
      let absA = (mathAbsA + 90 + 360) % 360;

      let relA = 0;
      if (startIdxPreview > 0) {
          const prevPoint = points[startIdxPreview - 1];
          let mathPrevA = toDegrees(Math.atan2(startPointPreview.y - prevPoint.y, startPointPreview.x - prevPoint.x));
          let prevA = (mathPrevA + 90 + 360) % 360;
          
          relA = absA - prevA;
          if (relA > 180) relA -= 360;
          if (relA <= -180) relA += 360;
      }

      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.font = `${12 / zoom}px sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      const previewText = (startIdxPreview > 0)
                        ? `${distM.toFixed(2)} m @ ${absA.toFixed(1)}° (Δ${relA.toFixed(1)}°)`
                        : `${distM.toFixed(2)} m @ ${absA.toFixed(1)}°`;
      ctx.fillText(previewText, (startPointPreview.x + hoverPos.x) / 2 * scalePxPerM + 8 / zoom, (startPointPreview.y + hoverPos.y) / 2 * scalePxPerM - 8 / zoom);
  }

  // Fläche
  if (effectivelyClosed) {
    const pointsInPx = points.map(p => ({ x: p.x * scalePxPerM, y: p.y * scalePxPerM }));
    const areaM2 = polygonAreaPx(pointsInPx) / (scalePxPerM * scalePxPerM);
    
    ctx.save(); 
    ctx.fillStyle = "green"; 
    ctx.font = `${13 / zoom}px sans-serif`;
    
    const centroidPx = polygonCentroid(pointsInPx);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Fläche: " + areaM2.toFixed(2) + " m²", centroidPx.x + 12 / zoom, centroidPx.y - 12 / zoom);
    ctx.restore();
  }

  ctx.restore();
}