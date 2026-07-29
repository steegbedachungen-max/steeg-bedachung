// js/exportManager.js

import { canvasState, dataState, getters } from './state.js';
import { polygonAreaPx, approxEqual } from './utils.js';
import { renderSkizzenList, renderMaterialPage } from './aufmassManager.js';
import { requestRedraw } from './canvasRenderer.js';
import { hasNotizen, getNotizenImage } from './notizenManager.js'; 
import { stage as stage2D, gridLayer } from './2D/stage.js'; 
import { pagesState, getPagesForUI, captureCurrentPage, renderActivePage } from './2D/pages.js';
import { exportProjectDataToGoogleDriveSilent } from './importExportManager.js';
import { uploadToGoogleDrive, isGoogleDriveConnected, connectGoogleDrive } from './googleDriveManager.js';

/**
 * Prüft, ob irgendeine der 2D-Seiten (nicht nur die aktuell sichtbare) Inhalte hat.
 * Sichert vorher den aktuell angezeigten Bearbeitungsstand, damit auch ganz frische
 * Änderungen auf der aktiven Seite berücksichtigt werden.
 */
function has2DContent() {
    try { captureCurrentPage(); } catch (_) { /* ignorieren, falls 2D-Editor noch nicht bereit ist */ }
    return pagesState.pages.some(p => Array.isArray(p.objects) && p.objects.length > 0);
}

/**
 * Füllt die Checkbox-Liste im Export-Dialog mit allen vorhandenen 2D-Seiten
 * (standardmäßig alle angehakt), damit man einzelne Seiten vom Export
 * ausschließen kann.
 */
function populate2DPagesList() {
    const container = document.getElementById('export-2d-pages-list');
    if (!container) return;

    try { captureCurrentPage(); } catch (_) { /* ignorieren, falls 2D-Editor noch nicht bereit ist */ }

    container.innerHTML = '';
    getPagesForUI().forEach(p => {
        const pageData = pagesState.pages.find(pp => pp.id === p.id);
        const hasContent = !!(pageData && Array.isArray(pageData.objects) && pageData.objects.length > 0);

        const label = document.createElement('label');
        label.style.cssText = 'display:flex; align-items:center; gap:6px; font-size:0.85em; color:#555; cursor:pointer;';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = true;
        cb.className = 'export-2d-page-checkbox';
        cb.dataset.pageId = p.id;
        cb.style.cssText = 'width:15px; height:15px;';

        const span = document.createElement('span');
        span.textContent = p.name + (hasContent ? '' : ' (leer)');

        label.appendChild(cb);
        label.appendChild(span);
        container.appendChild(label);
    });
}

/**
 * Wandelt einen Canvas in ein komprimiertes JPEG (Data-URL) um.
 * JPEG ist für diese "Screenshot"-artigen Bilder (Skizzen, 2D-Plan, Notizen)
 * deutlich kleiner als verlustfreies PNG, ohne im Ausdruck sichtbar an
 * Qualität zu verlieren. Da JPEG keine Transparenz kennt, wird zuerst ein
 * weißer Hintergrund gezeichnet.
 * @param {HTMLCanvasElement} canvas
 * @param {number} [quality=0.85] Wert zwischen 0 (klein/schlecht) und 1 (groß/verlustfrei-nah)
 * @returns {string} Data-URL im Format "image/jpeg"
 */
function canvasToCompressedJPEG(canvas, quality = 0.85) {
    const flat = document.createElement('canvas');
    flat.width = canvas.width;
    flat.height = canvas.height;
    const ctx = flat.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, flat.width, flat.height);
    ctx.drawImage(canvas, 0, 0);
    return flat.toDataURL('image/jpeg', quality);
}

/**
 * Exportiert die aktuelle technische Skizze im Editor als PDF (Querformat).
 */
export async function exportSketchPDF() {
  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "landscape", unit: 'mm', format: 'a4', compress: true });
    const pageWmm_L = 297, pageHmm_L = 210, marginMM_L = 10;
    const logoImg = document.getElementById('logo-for-pdf');
    let logoWidthMM = 60, logoHeightMM = 10, logoLoaded = false;
    
    if (logoImg && logoImg.complete && logoImg.naturalHeight !== 0) {
        logoHeightMM = logoWidthMM / (logoImg.naturalWidth / logoImg.naturalHeight); 
        logoLoaded = true;
    }
    
    const addLogoToPage = (pdfInstance) => { 
        if (logoLoaded) pdfInstance.addImage(logoImg, 'PNG', pageWmm_L - (marginMM_L - 4) - logoWidthMM, marginMM_L + 2, logoWidthMM, logoHeightMM); 
    };
    addLogoToPage(pdf);

    const imgCanvas = document.createElement('canvas'); 
    imgCanvas.width = 3000; 
    imgCanvas.height = 2100; 
    
    const oc = imgCanvas.getContext('2d'); 
    oc.fillStyle = "#fff"; 
    oc.fillRect(0, 0, 3000, 2100);
    
    const points = canvasState.points; 
    const deletedSegments = dataState.deletedSegments; 
    
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    points.forEach(p => { 
        minx = Math.min(minx, p.x); 
        miny = Math.min(miny, p.y); 
        maxx = Math.max(maxx, p.x); 
        maxy = Math.max(maxy, p.y); 
    });
    
    if (maxx - minx < 1) { minx -= 50; maxx += 50; } 
    if (maxy - miny < 1) { miny -= 50; maxy += 50; }
    
    const margin = 90; 
    const scaleToFit = Math.min((3000 - 2 * margin) / (maxx - minx), (2100 - 2 * margin) / (maxy - miny)); 
    
    oc.save(); 
    oc.translate(margin, margin); 
    oc.scale(scaleToFit, scaleToFit); 
    oc.translate(-minx, -miny);
    oc.strokeStyle = "#0b66ff"; 
    oc.lineWidth = 2 / scaleToFit; 
    oc.textAlign = "center"; 
    oc.textBaseline = "middle";
    
    for (let i = 1; i < points.length; i++) {
      if (deletedSegments.has(i - 1)) continue;
      const p1 = points[i - 1], p2 = points[i]; 
      oc.beginPath(); 
      oc.moveTo(p1.x, p1.y); 
      oc.lineTo(p2.x, p2.y); 
      oc.stroke();
      
      const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.hypot(dx, dy);
      
      if (len > 0) {
        const offsetDist = 12 / scaleToFit; 
        oc.save(); 
        oc.fillStyle = "#e74c3c"; 
        oc.font = `bold ${24 / scaleToFit}px sans-serif`;
        oc.fillText(String(i), midX - (dy / len) * offsetDist, midY + (dx / len) * offsetDist); 
        oc.restore();
      }
    }
    oc.restore();
    
    const img = imgCanvas.toDataURL('image/jpeg', 0.85);
    let sketchTitle = "Skizze (aktuell)";
    const editIndex = dataState.currentlyEditingSketchIndex; 
    
    if (editIndex !== null && dataState.savedSketches[editIndex]) {
        sketchTitle = dataState.savedSketches[editIndex].name; 
    }
    
    pdf.setFontSize(14); 
    pdf.text(sketchTitle, 10, 12);
    pdf.addImage(img, "JPEG", marginMM_L, 30, pageWmm_L - 2 * marginMM_L - 10, 150);
    
    const scale = getters.getScale(); 
    const segmentLabels = dataState.segmentLabels; 
    
    pdf.setFontSize(10); 
    let y = 187;
    for (let i = 1; i < points.length; i++) {
      if (deletedSegments.has(i - 1)) continue;
      const p1 = points[i - 1], p2 = points[i]; 
      const dx = p2.x - p1.x, dy = p2.y - p1.y; 
      const len = Math.hypot(dx, dy) / scale;
      const labelText = segmentLabels[i - 1] ? ` [${segmentLabels[i - 1]}]` : "";
      pdf.text(`${i}: (${(p1.x / scale).toFixed(2)}, ${(p1.y / scale).toFixed(2)}) → (${(p2.x / scale).toFixed(2)}, ${(p2.y / scale).toFixed(2)}) = ${len.toFixed(2)} m${labelText}`, 10, y); 
      y += 6;
      if (y > pageHmm_L - marginMM_L) { 
          pdf.addPage(); 
          addLogoToPage(pdf); 
          y = 20; 
      }
    }
    
    if (points.length > 2 && approxEqual(points[0].x, points.at(-1).x) && approxEqual(points[0].y, points.at(-1).y)) { 
      if (!deletedSegments.has(points.length - 2)) {
        const area = polygonAreaPx(points) / (scale * scale); 
        if (y + 6 > pageHmm_L - marginMM_L) { pdf.addPage(); addLogoToPage(pdf); y = 20; }
        pdf.text(`Fläche: ${area.toFixed(2)} m²`, 10, y);
      }
    }
    
    pdf.setProperties({ title: '', subject: '', author: '', keywords: '', creator: '' });
    pdf.save("skizze.pdf");
  } catch (error) { 
      console.error("Fehler beim 'Skizze PDF' Export:", error); 
      alert("Fehler beim PDF-Export: " + error.message); 
  }
  
  canvasState.isPanning = false; 
  canvasState.draggingPoint = null; 
  canvasState.hoverPos = null; 
  document.getElementById('canvas').style.cursor = 'grab';
  requestRedraw(); 
}

/**
 * Öffnet das "Angebot/Rechnung"-Modal.
 */
export async function exportAufmassblattPDF() {
    if (dataState.savedSketches.length === 0 && !hasNotizen() && !has2DContent()) { 
        await window.showAlert("Keine Daten", "Es sind weder Skizzen, Notizen noch 2D-Planungen für den Export vorhanden."); 
        return; 
    } 
    
    const modal = document.getElementById('export-choice-modal');
    const angebotBtn = document.getElementById('export-angebot-btn');
    const rechnungBtn = document.getElementById('export-rechnung-btn');
    const cancelBtn = document.getElementById('export-cancel-btn');
    const do2DCheck = document.getElementById('export-opt-2d');
    const pagesListContainer = document.getElementById('export-2d-pages-list');
    const pagesListToggleBtn = document.getElementById('export-2d-pages-toggle');
    
    const handleAngebotClick = () => { cleanupListeners(); triggerExportWithSettings("_Angebot"); };
    const handleRechnungClick = () => { cleanupListeners(); triggerExportWithSettings("_Rechnung"); };
    const handleCancelClick = () => { cleanupListeners(); modal.style.display = 'none'; };

    const updatePagesListVisibility = () => {
        if (!pagesListContainer) return;
        const includeChecked = do2DCheck ? do2DCheck.checked : true;
        const isExpanded = pagesListToggleBtn ? pagesListToggleBtn.getAttribute('aria-expanded') !== 'false' : true;
        pagesListContainer.style.display = (includeChecked && isExpanded) ? 'flex' : 'none';
        if (pagesListToggleBtn) {
            pagesListToggleBtn.style.visibility = includeChecked ? 'visible' : 'hidden';
            pagesListToggleBtn.textContent = isExpanded ? '🔼' : '🔽';
        }
    };
    const handle2DToggle = () => updatePagesListVisibility();
    const handlePagesListToggleClick = () => {
        if (!pagesListToggleBtn) return;
        const isExpanded = pagesListToggleBtn.getAttribute('aria-expanded') !== 'false';
        pagesListToggleBtn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
        updatePagesListVisibility();
    };
    
    const cleanupListeners = () => {
        angebotBtn.removeEventListener('click', handleAngebotClick);
        rechnungBtn.removeEventListener('click', handleRechnungClick);
        cancelBtn.removeEventListener('click', handleCancelClick);
        do2DCheck?.removeEventListener('change', handle2DToggle);
        pagesListToggleBtn?.removeEventListener('click', handlePagesListToggleClick);
    };
    
    angebotBtn.addEventListener('click', handleAngebotClick);
    rechnungBtn.addEventListener('click', handleRechnungClick);
    cancelBtn.addEventListener('click', handleCancelClick);
    do2DCheck?.addEventListener('change', handle2DToggle);
    pagesListToggleBtn?.addEventListener('click', handlePagesListToggleClick);

    populate2DPagesList();
    // Liste bei jedem Öffnen des Dialogs eingeklappt starten
    pagesListToggleBtn?.setAttribute('aria-expanded', 'false');
    updatePagesListVisibility();

    modal.style.display = 'block';
}

/**
 * Liest die Checkboxen aus und startet den Export.
 */
function triggerExportWithSettings(fileSuffix) {
    const skizzenCheck = document.getElementById('export-opt-skizzen');
    const materialCheck = document.getElementById('export-opt-material');
    const do2DCheck = document.getElementById('export-opt-2d');
    const notizenCheck = document.getElementById('export-opt-notizen');

    const selected2DPageIds = Array.from(document.querySelectorAll('.export-2d-page-checkbox'))
        .filter(cb => cb.checked)
        .map(cb => cb.dataset.pageId);

    const options = {
        includeSkizzen: skizzenCheck ? skizzenCheck.checked : true,
        includeMaterial: materialCheck ? materialCheck.checked : true,
        include2D: do2DCheck ? do2DCheck.checked : true,
        includeNotizen: notizenCheck ? notizenCheck.checked : true,
        selected2DPageIds
    };

    if (!options.includeSkizzen && !options.includeMaterial && !options.include2D && !options.includeNotizen) {
        window.showAlert("Fehler", "Bitte wähle mindestens einen Bereich für den Export aus.");
        return;
    }

    proceedWithExport(fileSuffix, options);
}

/**
 * Führt den Export durch.
 */
async function proceedWithExport(fileSuffix, options) {
    document.getElementById('export-choice-modal').style.display = 'none';
    const originalNoPrintDisplays = new Map();

    try {
        const bauvorhaben = document.getElementById('projekt-bauvorhaben').value;
        const name = document.getElementById('projekt-name').value;
        const adresse = document.getElementById('projekt-anschrift').value;
        const telefon = document.getElementById('projekt-telefon').value || "";
        const email = document.getElementById('projekt-email').value || "";
        
        let nummer = "";
        if (fileSuffix === '_Rechnung') {
            const nummerInput = await window.showPrompt("Rechnungsnummer", "Bitte geben Sie die Rechnungsnummer ein:");
            if (nummerInput === null) return;
            nummer = nummerInput.trim();
        }

        renderSkizzenList(); 

        const sketchBlocks = Array.from(document.querySelectorAll('#skizzen-list > .skizze-block'));
        const noPrintElements = document.querySelectorAll('#aufmassblatt .no-print');
        noPrintElements.forEach(el => {
            originalNoPrintDisplays.set(el, el.style.display);
            el.style.display = 'none';
        });

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
        const pageWmm = 210, pageHmm = 297, marginMM = 10, footerHmm = 15, usableWmm = pageWmm - 2 * marginMM;

        const now = new Date();
        const formattedDate = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const drawHeader = (titleText) => {
            pdf.setFontSize(20); 
            pdf.setFont("helvetica", "bold");
            pdf.text(titleText, pageWmm / 2, 22, { align: 'center' });

            pdf.setFontSize(10); 
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(100);
            pdf.text(`Datum: ${formattedDate}`, pageWmm - marginMM - 5, 35, { align: 'right' });

            pdf.setTextColor(0); 
            pdf.setFontSize(11);
            let y = 35;
            pdf.text(`Bauvorhaben: ${bauvorhaben || "---"}`, marginMM, y); y += 6;
            pdf.text(`Kunde: ${name || "---"}`, marginMM, y); y += 6;
            pdf.text(`Adresse: ${adresse || "---"}`, marginMM, y); y += 6;
            
            if (telefon) { pdf.text(`Telefon: ${telefon}`, marginMM, y); y += 6; }
            if (email) { pdf.text(`E-Mail: ${email}`, marginMM, y); y += 6; }
            if (nummer) { pdf.text(`Rechnungsnr.: ${nummer}`, marginMM, y); y += 6; }
            
            pdf.setDrawColor(200); 
            pdf.line(marginMM, y + 2, pageWmm - marginMM, y + 2);
            return y + 10; 
        };

        const regularSketchBlocks = [];
        const globalTotalsBlock = [];
        const keywordBlocks = [];

        sketchBlocks.forEach(block => {
            if (block.id === 'global-totals-block') globalTotalsBlock.push(block);
            else if (block.classList.contains('keyword-totals-block')) keywordBlocks.push(block);
            else if (block.querySelector('img') && block.querySelector('table')) regularSketchBlocks.push(block);
        });

        const sortedBlocks = [...regularSketchBlocks, ...globalTotalsBlock, ...keywordBlocks];
        const hasSketches = sortedBlocks.length > 0;

        // ==========================================
        // DYNAMISCHER TITEL & ERSTE SEITE
        // ==========================================
        let mainTitle = "Aufmaßblatt";
        if (options.includeSkizzen && hasSketches) {
            mainTitle = "Aufmaßblatt";
        } else if (options.include2D && has2DContent()) {
            mainTitle = "2D-Planung / PV-Belegung";
        } else if (options.includeNotizen && hasNotizen()) {
            mainTitle = "Baustellen-Notizen";
        }
        
        let currentY = drawHeader(mainTitle);
        const contentStartSubPage = 40; 
        let hasRenderedSomething = false; // Verfolgt, ob wir bereits Inhalte auf Seiten haben

        // ==========================================
        // AUFMASS & SKIZZEN EXPORT
        // ==========================================
        if (options.includeSkizzen && hasSketches) {
            for (let i = 0; i < sortedBlocks.length; i++) {
                const block = sortedBlocks[i];
                let clonedBlock = block.cloneNode(true);
                clonedBlock.style.position = 'absolute'; clonedBlock.style.left = '-9999px';
                clonedBlock.style.width = (usableWmm * 3.7795) + 'px';
                clonedBlock.style.background = '#ffffff';
                
                const modeSelectOriginal = block.querySelector(`select[id^="include-sketch-"]`);
                if (modeSelectOriginal) {
                    const modeVal = modeSelectOriginal.value;
                    let inclusionText = modeVal === "0" ? " (Ignoriert)" : (modeVal === "-1" ? " (Subtrahiert)" : "");
                    if (inclusionText) {
                        const label = clonedBlock.querySelector('label');
                        if (label) label.innerHTML += `<span style="color:#888; font-style:italic; margin-left:8px;">${inclusionText}</span>`;
                    }
                }

                clonedBlock.querySelectorAll('.no-print').forEach(el => el.remove());
                document.body.appendChild(clonedBlock);
                
                const canvasExport = await window.html2canvas(clonedBlock, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                document.body.removeChild(clonedBlock);
                
                const imgRatio = canvasExport.height / canvasExport.width;
                const sketchHeightMM = usableWmm * imgRatio;
                const pxPerMM = canvasExport.width / usableWmm; 

                if (currentY + sketchHeightMM > pageHmm - footerHmm) {
                    pdf.addPage();
                    currentY = contentStartSubPage;
                }

                let remainingH = sketchHeightMM;
                let srcY = 0;
                while (remainingH > 0) {
                    let space = pageHmm - currentY - footerHmm;
                    let sliceH = Math.min(remainingH, space);
                    
                    const sliceCanvas = document.createElement('canvas');
                    sliceCanvas.width = canvasExport.width;
                    sliceCanvas.height = sliceH * pxPerMM;
                    sliceCanvas.getContext('2d').drawImage(canvasExport, 0, srcY * pxPerMM, canvasExport.width, sliceH * pxPerMM, 0, 0, sliceCanvas.width, sliceCanvas.height);
                    
                    pdf.addImage(canvasToCompressedJPEG(sliceCanvas), 'JPEG', marginMM, currentY, usableWmm, sliceH);
                    
                    remainingH -= sliceH;
                    srcY += sliceH;
                    if (remainingH > 0.1) { pdf.addPage(); currentY = contentStartSubPage; }
                    else { currentY += sliceH + 8; }
                }
            }
            hasRenderedSomething = true;
        }

        // ==========================================
        // MATERIALBEDARF EXPORT (ein Block je zugewiesenem Material)
        // ==========================================
        if (options.includeMaterial && dataState.savedSketches.length > 0) {
            renderMaterialPage(); // Sicherstellen, dass die Berechnung aktuell ist
            const materialBlocks = Array.from(document.querySelectorAll('#material-list-container > .material-block'));

            if (materialBlocks.length > 0) {
                if (hasRenderedSomething) {
                    pdf.addPage();
                    currentY = drawHeader("Materialbedarf");
                } else if (currentY > 50) {
                    currentY += 5;
                }

                for (let i = 0; i < materialBlocks.length; i++) {
                    const block = materialBlocks[i];
                    let clonedBlock = block.cloneNode(true);
                    clonedBlock.style.position = 'absolute'; clonedBlock.style.left = '-9999px';
                    clonedBlock.style.width = (usableWmm * 3.7795) + 'px';
                    clonedBlock.style.maxWidth = 'none';
                    clonedBlock.style.background = '#ffffff';
                    clonedBlock.classList.add('pdf-export-mode'); // blendet technische Formeln aus (siehe style.css)
                    clonedBlock.querySelectorAll('.no-print').forEach(el => el.remove());
                    document.body.appendChild(clonedBlock);

                    const canvasExport = await window.html2canvas(clonedBlock, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                    document.body.removeChild(clonedBlock);

                    const imgRatio = canvasExport.height / canvasExport.width;
                    const blockHeightMM = usableWmm * imgRatio;
                    const pxPerMM = canvasExport.width / usableWmm;

                    if (currentY + blockHeightMM > pageHmm - footerHmm) {
                        pdf.addPage();
                        currentY = contentStartSubPage;
                    }

                    let remainingH = blockHeightMM;
                    let srcY = 0;
                    while (remainingH > 0) {
                        let space = pageHmm - currentY - footerHmm;
                        let sliceH = Math.min(remainingH, space);

                        const sliceCanvas = document.createElement('canvas');
                        sliceCanvas.width = canvasExport.width;
                        sliceCanvas.height = sliceH * pxPerMM;
                        sliceCanvas.getContext('2d').drawImage(canvasExport, 0, srcY * pxPerMM, canvasExport.width, sliceH * pxPerMM, 0, 0, sliceCanvas.width, sliceCanvas.height);

                        pdf.addImage(canvasToCompressedJPEG(sliceCanvas), 'JPEG', marginMM, currentY, usableWmm, sliceH);

                        remainingH -= sliceH;
                        srcY += sliceH;
                        if (remainingH > 0.1) { pdf.addPage(); currentY = contentStartSubPage; }
                        else { currentY += sliceH + 8; }
                    }
                }
                hasRenderedSomething = true;
            }
        }

        // ==========================================
        // 2D-PLANUNG EXPORT (Mit verstecktem Gitter) - je ausgewählter Seite
        // ==========================================
        if (options.include2D) {
            captureCurrentPage(); // aktuellen Bearbeitungsstand der sichtbaren Seite sichern
            const originalActivePageId = pagesState.activePageId;

            const pagesToExport = pagesState.pages.filter(p =>
                options.selected2DPageIds.includes(p.id) &&
                Array.isArray(p.objects) && p.objects.length > 0
            );

            for (let pageIdx = 0; pageIdx < pagesToExport.length; pageIdx++) {
                const page = pagesToExport[pageIdx];
                const pageTitle = pagesToExport.length > 1
                    ? `2D-Planung / PV-Belegung – ${page.name}`
                    : "2D-Planung / PV-Belegung";

                if (hasRenderedSomething) {
                    pdf.addPage();
                    currentY = drawHeader(pageTitle);
                } else if (currentY > 50) {
                    currentY += 5;
                }

                // Seite temporär rendern, um sie als Bild einzufangen
                // (die ursprünglich aktive Seite wird danach wiederhergestellt)
                pagesState.activePageId = page.id;
                renderActivePage();

                // Gitter ausblenden für sauberen Druck
                let gridWasVisible = true;
                if (gridLayer) {
                    gridWasVisible = gridLayer.visible(); 
                    gridLayer.visible(false); 
                    stage2D.draw(); 
                }

                // 2D Stage in Bild umwandeln (Ohne Gitter)
                const modelImgData = stage2D.toDataURL({ pixelRatio: 1.5 });
                
                // Gitter wiederherstellen
                if (gridLayer) {
                    gridLayer.visible(gridWasVisible); 
                    stage2D.draw(); 
                }

                const img2D = await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.src = modelImgData;
                });

                // Bild skalieren
                let remainingH = (img2D.height / img2D.width) * usableWmm;
                let srcY_px = 0;
                const pxPerMM = img2D.width / usableWmm;

                while (remainingH > 0) {
                    let space = pageHmm - currentY - footerHmm;
                    let sliceH = Math.min(remainingH, space);
                    const sliceCanvas = document.createElement('canvas');
                    sliceCanvas.width = img2D.width;
                    sliceCanvas.height = sliceH * pxPerMM;
                    sliceCanvas.getContext('2d').drawImage(img2D, 0, srcY_px, img2D.width, sliceH * pxPerMM, 0, 0, sliceCanvas.width, sliceCanvas.height);
                    
                    pdf.addImage(canvasToCompressedJPEG(sliceCanvas), 'JPEG', marginMM, currentY, usableWmm, sliceH);
                    
                    remainingH -= sliceH;
                    srcY_px += sliceH * pxPerMM;
                    if (remainingH > 0.1) { 
                        pdf.addPage(); 
                        currentY = contentStartSubPage; 
                    } else {
                        currentY += sliceH + 8;
                    }
                }

                hasRenderedSomething = true;
            }

            // Ursprünglich aktive Seite im Editor wiederherstellen, damit sich
            // für den Nutzer durch den Export nichts sichtbar verändert.
            pagesState.activePageId = originalActivePageId;
            renderActivePage();
        }

        // ==========================================
        // NOTIZEN-EXPORT
        // ==========================================
        if (options.includeNotizen && hasNotizen()) {
            const notizenResult = getNotizenImage();
            if (notizenResult && notizenResult.dataUrl) {
                if (hasRenderedSomething) {
                    pdf.addPage();
                    currentY = drawHeader("Baustellen-Notizen");
                } else if (currentY > 50) {
                    currentY += 5; 
                }
                
                const notizenImg = await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.src = notizenResult.dataUrl;
                });
                const imageBoxesPx = notizenResult.imageBoxes || [];

                let remainingH = (notizenImg.height / notizenImg.width) * usableWmm;
                let srcY_px = 0;
                const pxPerMM = notizenImg.width / usableWmm;

                while (remainingH > 0) {
                    let space = pageHmm - currentY - footerHmm;
                    let sliceH = Math.min(remainingH, space);
                    let cutPointPx = srcY_px + sliceH * pxPerMM;

                    // Seitenumbruch nicht mitten durch ein eingefügtes Bild legen:
                    // Falls der aktuelle Schnitt ein Bild teilen würde, den Schnitt
                    // auf den Bildanfang vorziehen, damit das Bild komplett auf die
                    // nächste Seite rutscht.
                    let earliestImageTopPx = null;
                    imageBoxesPx.forEach(box => {
                        const boxTop = box.y;
                        const boxBottom = box.y + box.height;
                        if (boxTop >= srcY_px - 0.5 && boxTop < cutPointPx - 0.5 && boxBottom > cutPointPx + 0.5) {
                            if (earliestImageTopPx === null || boxTop < earliestImageTopPx) earliestImageTopPx = boxTop;
                        }
                    });
                    if (earliestImageTopPx !== null && earliestImageTopPx > srcY_px + 0.5) {
                        cutPointPx = earliestImageTopPx;
                        sliceH = (cutPointPx - srcY_px) / pxPerMM;
                    }
                    // (Ist das Bild selbst höher als eine ganze Seite, bleibt der
                    // Schnitt unverändert - das Bild wird dann wie zuvor auf mehrere
                    // Seiten aufgeteilt, um eine Endlosschleife zu vermeiden.)

                    const sliceCanvas = document.createElement('canvas');
                    sliceCanvas.width = notizenImg.width;
                    sliceCanvas.height = sliceH * pxPerMM;
                    sliceCanvas.getContext('2d').drawImage(notizenImg, 0, srcY_px, notizenImg.width, sliceH * pxPerMM, 0, 0, sliceCanvas.width, sliceCanvas.height);
                    
                    pdf.addImage(canvasToCompressedJPEG(sliceCanvas), 'JPEG', marginMM, currentY, usableWmm, sliceH);
                    
                    remainingH -= sliceH;
                    srcY_px += sliceH * pxPerMM;
                    if (remainingH > 0.1) { 
                        pdf.addPage(); 
                        currentY = contentStartSubPage; 
                    }
                }
            }
        }

        // Footer & Logo auf allen Seiten
        const logoImg = document.getElementById('logo-for-pdf');
        let logoWidthMM = 50, logoHeightMM = 10, logoLoaded = false;
        if (logoImg && logoImg.complete && logoImg.naturalHeight !== 0) {
            logoHeightMM = logoWidthMM / (logoImg.naturalWidth / logoImg.naturalHeight);
            logoLoaded = true;
        }
        
        const finalPageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= finalPageCount; i++) {
            pdf.setPage(i);
            if (logoLoaded) pdf.addImage(logoImg, 'PNG', pageWmm - marginMM - logoWidthMM, 10, logoWidthMM, logoHeightMM);
            pdf.setFontSize(9); pdf.setTextColor(150);
            pdf.text(`Seite ${i} von ${finalPageCount}`, pageWmm / 2, pageHmm - 10, { align: 'center' });

            // Faltmarken nach DIN 5008 (Form B): kleine Striche am linken Rand
            // bei 105mm und 210mm von der oberen Blattkante, damit das Blatt
            // korrekt für einen DIN-lang-Umschlag gefaltet werden kann.
            pdf.setDrawColor(120);
            pdf.setLineWidth(0.2);
            const faltmarkeX1 = 3; // 3mm vom linken Blattrand eingerückt
            const faltmarkeX2 = 8; // 5mm lange Markierung
            [105, 210].forEach(y => {
                pdf.line(faltmarkeX1, y, faltmarkeX2, y);
            });
        }
        
        const sanitizedBauvorhaben = (bauvorhaben || "Aufmass").replace(/[\\/:*?"<>|]/g, '_');
        pdf.setProperties({ title: '', subject: '', author: '', keywords: '', creator: '' });
        const pdfFilename = `${sanitizedBauvorhaben}${fileSuffix}.pdf`;

        // Sicherstellen, dass eine Google-Verbindung besteht (fragt nur nach,
        // falls noch nicht über den "Mit Google verbinden"-Button verbunden).
        if (!isGoogleDriveConnected()) {
            try {
                await connectGoogleDrive();
            } catch (connectErr) {
                console.error('Google Drive Verbindung fehlgeschlagen:', connectErr);
                pdf.save(pdfFilename); // Fallback: normaler Download, damit nichts verloren geht
                await window.showAlert('Google Drive nicht verbunden', 'Es konnte keine Verbindung zu Google Drive hergestellt werden. Das PDF wurde stattdessen normal heruntergeladen.');
                return;
            }
        }

        const pdfBlob = pdf.output('blob');
        try {
            await uploadToGoogleDrive(pdfBlob, pdfFilename, 'application/pdf');
        } catch (driveErr) {
            console.error('Google Drive Upload (PDF) fehlgeschlagen, lade stattdessen lokal herunter:', driveErr);
            pdf.save(pdfFilename); // Fallback: normaler Download, damit nichts verloren geht
            await window.showAlert('Google Drive Upload fehlgeschlagen', 'Das PDF konnte nicht in Google Drive gespeichert werden und wurde stattdessen normal heruntergeladen.');
        }

        // Zusätzlich automatisch die passende JSON-Projektdatei nach Google
        // Drive hochladen, damit PDF und Projektdaten als Paar zusammenbleiben.
        try {
            await exportProjectDataToGoogleDriveSilent(fileSuffix);
        } catch (jsonErr) {
            console.warn("JSON-Begleitdatei konnte nicht automatisch nach Google Drive hochgeladen werden:", jsonErr);
        }

    } catch (error) {
        console.error("Export Fehler:", error);
    } finally {
        originalNoPrintDisplays.forEach((display, el) => el.style.display = display);
        requestRedraw(); 
    }
}