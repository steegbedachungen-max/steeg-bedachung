// js/aufmassManager.js

import { dataState, canvasState, uiState } from "./state.js";
import { approxEqual, polygonAreaPx, toDegrees } from "./utils.js";
// 'loadSketch' wird hier nicht mehr direkt benötigt, da es über das window-Objekt aufgerufen wird.
import { requestRedraw } from "./canvasRenderer.js";
import { labelBasedMaterials } from './materialDatabase.js';
import { getSelectableMainTiles, getFavoriteMainTiles } from './materialDataManager.js'; // <-- NEU: Dynamische Materialien
import { layer } from './2D/stage.js';
import { pagesState, getActivePage } from './2D/pages.js';

let currentMaterialFilter = 'Alle';

// --- Interne Hilfsfunktionen ---
export function setSketchInclusionMode(idx) {
    if (!dataState.savedSketches[idx]) return;
    const select = document.getElementById(`include-sketch-${idx}`);
    const newMode = parseInt(select.value, 10);
    dataState.savedSketches[idx].inclusionMode = newMode;
    if (document.getElementById('tab-blatt').classList.contains('active')) {
        renderSkizzenList();
    } else if (document.getElementById('tab-material').classList.contains('active')) {
        renderMaterialPage();
    }
}
export function toggleSegmentInTotals(sketchIdx, segmentIdx) {
    const sketch = dataState.savedSketches[sketchIdx];
    if (!sketch) return;
    if (!sketch.segmentInclusion) sketch.segmentInclusion = {};
    sketch.segmentInclusion[segmentIdx] = !(sketch.segmentInclusion[segmentIdx] !== false);
    if (document.getElementById('tab-blatt').classList.contains('active')) {
        renderSkizzenList();
    } else if (document.getElementById('tab-material').classList.contains('active')) {
        renderMaterialPage();
    }
}

/**
 * Berechnet Längen-, Flächen- und Zubehör-Summen für EINE gegebene Liste
 * von Skizzen (statt immer aller gespeicherten Skizzen). Wird genutzt, um
 * Skizzen nach zugewiesenem Material zu gruppieren und pro Gruppe eine
 * eigene Materialbedarfs-Berechnung anzuzeigen (z.B. Hauptdach = Ziegel,
 * Garage = Bitumen).
 */
function calculateTotalsForSketches(sketchList) {
    const globalTotals = {};
    const globalAccessoryTotals = {};
    let globalTotalArea = [];

    sketchList.forEach((sk) => {
        const currentMode = sk.inclusionMode ?? (sk.includeInTotals === false ? 0 : 1);
        sk.inclusionMode = currentMode;
        const inclusionFactor = currentMode;
        if (inclusionFactor === 0) return;
        const sketchLengthTotals = {};
        const sketchAccessoryTotals = {};
        let sketchAreaTotal = 0;
        const deleted = new Set(sk.deletedSegments || []);
        const sketchLabels = sk.labels || {};
        if (!sk.segmentInclusion) {
            sk.segmentInclusion = {};
            Object.keys(sketchLabels).forEach(segIdxStr => {
                if (sketchLabels[segIdxStr]) { sk.segmentInclusion[segIdxStr] = true; }
            });
        }
        for (let i = 1; i < sk.points.length; i++) {
            const segmentIndex = i - 1;
            if (deleted.has(segmentIndex)) continue;
            const label = sketchLabels[segmentIndex];
            if (!label) continue;
            const p1 = sk.points[i - 1], p2 = sk.points[i];
            const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const isSegmentChecked = sk.segmentInclusion[segmentIndex] !== false;
            if (currentMode === 1 && isSegmentChecked) {
                if (!sketchLengthTotals[label]) sketchLengthTotals[label] = 0;
                sketchLengthTotals[label] += len;
            } else if (currentMode === -1) {
                if (!sketchLengthTotals[label]) sketchLengthTotals[label] = 0;
                sketchLengthTotals[label] += len;
            }
        }
        if (sk.points.length > 2 && approxEqual(sk.points[0].x, sk.points[sk.points.length - 1].x) && approxEqual(sk.points[0].y, sk.points[sk.points.length - 1].y)) {
            const closingIdx = sk.points.length - 2;
            if (!deleted.has(closingIdx)) {
                sketchAreaTotal = polygonAreaPx(sk.points.map(p => ({ x: p.x * sk.scale, y: p.y * sk.scale }))) / (sk.scale * sk.scale);
            }
        }
        if (sk.accessories) {
            for (const item in sk.accessories) {
                const accData = sk.accessories[item];
                if (!sketchAccessoryTotals[item]) sketchAccessoryTotals[item] = {};
                if (item === "Wohnraumfenster" && Array.isArray(accData)) {
                    const qty = accData.length;
                    if (qty > 0) { sketchAccessoryTotals[item]['Stück'] = (sketchAccessoryTotals[item]['Stück'] || 0) + qty; }
                } else if (typeof accData === 'number') {
                    const qty = accData;
                    if (qty > 0) { sketchAccessoryTotals[item]['Stück'] = (sketchAccessoryTotals[item]['Stück'] || 0) + qty; }
                } else if (typeof accData === 'object' && accData !== null && typeof accData.qty === 'number') {
                    const qty = accData.qty;
                    const unit = accData.unit || 'Stück';
                    if (qty > 0) { sketchAccessoryTotals[item][unit] = (sketchAccessoryTotals[item][unit] || 0) + qty; }
                }
            }
        }
        for (const label in sketchLengthTotals) {
            if (!globalTotals[label]) globalTotals[label] = [];
            globalTotals[label].push({ skName: sk.name, value: sketchLengthTotals[label], mode: inclusionFactor });
        }
        if (sketchAreaTotal > 0) {
            globalTotalArea.push({ skName: sk.name, value: sketchAreaTotal, mode: inclusionFactor });
        }
        for (const item in sketchAccessoryTotals) {
            if (!globalAccessoryTotals[item]) globalAccessoryTotals[item] = {};
            for (const unit in sketchAccessoryTotals[item]) {
                if (!globalAccessoryTotals[item][unit]) globalAccessoryTotals[item][unit] = [];
                globalAccessoryTotals[item][unit].push({ skName: sk.name, value: sketchAccessoryTotals[item][unit], mode: inclusionFactor });
            }
        }
    });

    return { globalTotals, globalTotalArea, globalAccessoryTotals };
}

/**
 * Zählt die PV-Module aus der 2D-Planung. Unabhängig von der Skizzen-
 * Material-Zuweisung, da PV-Module keiner Dachdeckung zugeordnet sind.
 */
function calculatePvModuleTotals() {
    const globalAccessoryTotals = {};
    try {
        const targetPageId = uiState?.pvTotalsPageId || 'active';
        const page = (targetPageId === 'active')
            ? getActivePage()
            : (pagesState.pages || []).find(p => p.id === targetPageId) || getActivePage();

        const pvCount = (page?.objects || []).filter(o => o && o.typ === 'pv_modul').length;

        if (pvCount > 0) {
            globalAccessoryTotals["PV Modul"] = { "Stück": [] };
            const pageLabel = (targetPageId === 'active') ? (page?.name || 'aktive Seite') : (page?.name || 'Seite');
            globalAccessoryTotals["PV Modul"]["Stück"].push({
                skName: `2D-Planung (${pageLabel})`,
                value: pvCount,
                mode: 1
            });
        }
    } catch (e) {
        console.warn("Fehler beim Zählen der PV-Module aus den 2D-Seiten:", e);
        try {
            if (layer) {
                const pvNodes = layer.getChildren(node => {
                    const ud = node.getAttr('userData');
                    return ud && ud.typ === 'pv_modul';
                });
                const pvCount = pvNodes.length;
                if (pvCount > 0) {
                    globalAccessoryTotals["PV Modul"] = { "Stück": [{ skName: "2D-Planung", value: pvCount, mode: 1 }] };
                }
            }
        } catch (_) {
            // ignore
        }
    }
    return globalAccessoryTotals;
}

/**
 * ZENTRALE FUNKTION: Berechnet alle Summen und gibt sie zurück.
 */
function calculateTotals() {
    const savedSketches = dataState.savedSketches;
    const globalTotals = {};
    const globalAccessoryTotals = {};
    let globalTotalArea = [];
    const keywords = ['gaube', 'kamin', 'dach'];
    const keywordTotals = {};
    keywords.forEach(key => {
        keywordTotals[key] = { lengths: {}, accessories: {}, area: [], hasData: false };
    });

    savedSketches.forEach((sk) => {
        const currentMode = sk.inclusionMode ?? (sk.includeInTotals === false ? 0 : 1);
        sk.inclusionMode = currentMode;
        const inclusionFactor = currentMode;
        if (inclusionFactor === 0) return;
        const sketchLengthTotals = {};
        const sketchAccessoryTotals = {};
        let sketchAreaTotal = 0;
        const deleted = new Set(sk.deletedSegments || []);
        const sketchLabels = sk.labels || {};
        if (!sk.segmentInclusion) {
            sk.segmentInclusion = {};
            Object.keys(sketchLabels).forEach(segIdxStr => {
                if (sketchLabels[segIdxStr]) { sk.segmentInclusion[segIdxStr] = true; }
            });
        }
        for (let i = 1; i < sk.points.length; i++) {
            const segmentIndex = i - 1;
            if (deleted.has(segmentIndex)) continue;
            const label = sketchLabels[segmentIndex];
            if (!label) continue;
            const p1 = sk.points[i - 1], p2 = sk.points[i];
            const len = Math.hypot(p2.x - p1.x, p2.y - p1.y); // Länge ist bereits in Metern
            const isSegmentChecked = sk.segmentInclusion[segmentIndex] !== false;
            if (currentMode === 1 && isSegmentChecked) {
                if (!sketchLengthTotals[label]) sketchLengthTotals[label] = 0;
                sketchLengthTotals[label] += len;
            } else if (currentMode === -1) {
                if (!sketchLengthTotals[label]) sketchLengthTotals[label] = 0;
                sketchLengthTotals[label] += len;
            }
        }
        if (sk.points.length > 2 && approxEqual(sk.points[0].x, sk.points[sk.points.length - 1].x) && approxEqual(sk.points[0].y, sk.points[sk.points.length - 1].y)) {
            const closingIdx = sk.points.length - 2;
            if (!deleted.has(closingIdx)) {
                sketchAreaTotal = polygonAreaPx(sk.points.map(p => ({ x: p.x * sk.scale, y: p.y * sk.scale }))) / (sk.scale * sk.scale);
            }
        }
        if (sk.accessories) {
            for (const item in sk.accessories) {
                const accData = sk.accessories[item];
                if (!sketchAccessoryTotals[item]) sketchAccessoryTotals[item] = {};
                if (item === "Wohnraumfenster" && Array.isArray(accData)) {
                    const qty = accData.length;
                    if (qty > 0) { sketchAccessoryTotals[item]['Stück'] = (sketchAccessoryTotals[item]['Stück'] || 0) + qty; }
                } else if (typeof accData === 'number') {
                    const qty = accData;
                    if (qty > 0) { sketchAccessoryTotals[item]['Stück'] = (sketchAccessoryTotals[item]['Stück'] || 0) + qty; }
                } else if (typeof accData === 'object' && accData !== null && typeof accData.qty === 'number') {
                    const qty = accData.qty;
                    const unit = accData.unit || 'Stück';
                    if (qty > 0) { sketchAccessoryTotals[item][unit] = (sketchAccessoryTotals[item][unit] || 0) + qty; }
                }
            }
        }
        for (const label in sketchLengthTotals) {
            if (!globalTotals[label]) globalTotals[label] = [];
            globalTotals[label].push({ skName: sk.name, value: sketchLengthTotals[label], mode: inclusionFactor });
        }
        if (sketchAreaTotal > 0) {
            globalTotalArea.push({ skName: sk.name, value: sketchAreaTotal, mode: inclusionFactor });
        }
        for (const item in sketchAccessoryTotals) {
            if (!globalAccessoryTotals[item]) globalAccessoryTotals[item] = {};
            for (const unit in sketchAccessoryTotals[item]) {
                if (!globalAccessoryTotals[item][unit]) globalAccessoryTotals[item][unit] = [];
                globalAccessoryTotals[item][unit].push({ skName: sk.name, value: sketchAccessoryTotals[item][unit], mode: inclusionFactor });
            }
        }

        const sketchNameLower = sk.name.toLowerCase();
        let keywordFound = null;

        const quotedMatch = sketchNameLower.match(/['"„“](dach|gaube|kamin)['"„“]/);
        if (quotedMatch && quotedMatch[1]) {
            keywordFound = quotedMatch[1];
        }
        
        if (!keywordFound) {
            for (const key of keywords) {
                if (sketchNameLower.includes(key)) { 
                    keywordFound = key;
                    break; 
                }
            }
        }

        if (keywordFound) {
            const bucket = keywordTotals[keywordFound];
            bucket.hasData = true;
            for (const label in sketchLengthTotals) {
                if (!bucket.lengths[label]) bucket.lengths[label] = [];
                bucket.lengths[label].push({ skName: sk.name, value: sketchLengthTotals[label], mode: inclusionFactor });
            }
            if (sketchAreaTotal > 0) {
                bucket.area.push({ skName: sk.name, value: sketchAreaTotal, mode: inclusionFactor });
            }
            for (const item in sketchAccessoryTotals) {
                if (!bucket.accessories[item]) bucket.accessories[item] = {};
                for (const unit in sketchAccessoryTotals[item]) {
                    if (!bucket.accessories[item][unit]) bucket.accessories[item][unit] = [];
                    bucket.accessories[item][unit].push({ skName: sk.name, value: sketchAccessoryTotals[item][unit], mode: inclusionFactor });
                }
            }
        }
    });

    // ##### PV-Module aus 2D-Canvas zählen (Seite wählbar) #####
    const pvTotals = calculatePvModuleTotals();
    Object.assign(globalAccessoryTotals, pvTotals);
    // ##### ENDE DER PV-LOGIK #####

    return { globalTotals, globalTotalArea, globalAccessoryTotals, keywordTotals };
}

/**
 * Hilfsfunktion zum Erstellen eines Summenblocks (unverändert)
 */
const createTotalsBlock = (title, blockId, lengthData, areaData, accessoryData) => {
    
    if (lengthData["Ortgang (links)"] || lengthData["Ortgang (rechts)"]) {
        const combinedOrtgang = [];
        if (lengthData["Ortgang (links)"]) combinedOrtgang.push(...lengthData["Ortgang (links)"]);
        if (lengthData["Ortgang (rechts)"]) combinedOrtgang.push(...lengthData["Ortgang (rechts)"]);
        lengthData["Ortgang"] = combinedOrtgang;
        delete lengthData["Ortgang (links)"];
        delete lengthData["Ortgang (rechts)"];
    }
    
    let hasLengths = false, hasArea = false, hasAccessories = false;
    let totalsHTML = `<h3 style="margin-top: 0; margin-bottom: 10px;">${title}</h3>`;
    totalsHTML += '<table><thead><tr><th>Posten</th><th>Gesamt</th></tr></thead><tbody>';
    // 1. Längen
    const sortedLabels = Object.keys(lengthData).sort();
    for (const label of sortedLabels) {
        const contributions = lengthData[label];
        if (!contributions || contributions.length === 0) continue;
        let totalLength = 0;
        const formulaParts = [];
        contributions.forEach(contrib => {
            const val = contrib.value * contrib.mode;
            totalLength += val;
            if (Math.abs(val) > 0.001) {
                const sign = val > 0 ? '+' : '-';
                formulaParts.push(`${sign} ${Math.abs(val).toFixed(2)}`);
            }
        });
        if (Math.abs(totalLength) > 0.001) {
            let formulaString = "";
            if (formulaParts.length > 1) {
                if (formulaParts[0].startsWith('+ ')) formulaParts[0] = formulaParts[0].substring(2);
                formulaString = ` <span class="formula">(${formulaParts.join(' ')})</span>`;
            }
            totalsHTML += `<tr><td style="text-align: left; font-weight: 500;">${label}</td><td><b>${totalLength.toFixed(2)} m</b>${formulaString}</td></tr>`;
            hasLengths = true;
        }
    }
    // 2. Fläche
    let totalArea = 0;
    let areaFormulaString = "";
    if (Array.isArray(areaData) && areaData.length > 0) {
        const formulaParts = [];
        areaData.forEach(contrib => {
            const val = contrib.value * contrib.mode;
            totalArea += val;
            if (Math.abs(val) > 0.001) {
                const sign = val > 0 ? '+' : '-';
                formulaParts.push(`${sign} ${Math.abs(val).toFixed(2)}`);
            }
        });
        if (formulaParts.length > 1) {
            if (formulaParts[0].startsWith('+ ')) formulaParts[0] = formulaParts[0].substring(2);
            areaFormulaString = ` <span class="formula">(${formulaParts.join(' ')})</span>`;
        }
    }
    hasArea = Math.abs(totalArea) > 0.001;
    if (hasArea) {
        if (hasLengths) totalsHTML += `<tr><td colspan="2" style="background:#f0f0f0; height: 5px; padding: 2px;"></td></tr>`;
        totalsHTML += `<tr><td style="text-align: left; font-weight: 500;">Gesamtfläche</td><td><b>${totalArea.toFixed(2)} m²</b>${areaFormulaString}</td></tr>`;
    }
    // 3. Zubehör
    const sortedAccessories = Object.keys(accessoryData).sort();
    let accessoriesAdded = false;
    for (const item of sortedAccessories) {
         if (blockId === 'global-totals-block' && item === "Wohnraumfenster") {
              const contributions = accessoryData[item]['Stück'] || [];
              let totalQty = 0;
              contributions.forEach(c => totalQty += (c.value * c.mode));
              if (totalQty > 0) {
                  let detailsText = "";
                  const allDescriptions = [];
                  dataState.savedSketches.forEach(sk => {
                      if (sk.inclusionMode === 1 && sk.accessories && Array.isArray(sk.accessories["Wohnraumfenster"])) {
                           sk.accessories["Wohnraumfenster"].forEach(win => {
                               if (win.desc && win.desc.trim() !== "") allDescriptions.push(win.desc.trim());
                           });
                      }
                  });
                  if (allDescriptions.length > 0) {
                       const descriptionCounts = allDescriptions.reduce((acc, desc) => { acc[desc] = (acc[desc] || 0) + 1; return acc; }, {});
                       detailsText = ` (${Object.entries(descriptionCounts).map(([desc, count]) => `${count}x ${desc}`).join(', ')})`;
                  }
                  if (!accessoriesAdded && (hasLengths || hasArea)) totalsHTML += `<tr><td colspan="2" style="background:#f0f0f0; height: 5px; padding: 2px;"></td></tr>`;
                  totalsHTML += `<tr><td style="text-align: left; font-weight: 500;">${item}</td><td><b>${totalQty} Stück</b>${detailsText}</td></tr>`;
                  accessoriesAdded = true;
                  hasAccessories = true;
              }
          } else {
              const unitMap = accessoryData[item];
              const sortedUnits = Object.keys(unitMap).sort();
              for (const unit of sortedUnits) {
                  const contributions = unitMap[unit] || [];
                  let totalQty = 0;
                  const formulaParts = [];
                  contributions.forEach(contrib => {
                      const val = contrib.value * contrib.mode;
                      totalQty += val;
                      if (Math.abs(val) > 0) {
                          const sign = val > 0 ? '+' : '-';
                          const absVal = (val % 1 === 0) ? Math.abs(val) : Math.abs(val).toFixed(2);
                          formulaParts.push(`${sign} ${absVal}`);
                      }
                  });
                  if (Math.abs(totalQty) > 0) {
                       if (!accessoriesAdded && (hasLengths || hasArea)) {
                          totalsHTML += `<tr><td colspan="2" style="background:#f0f0f0; height: 5px; padding: 2px;"></td></tr>`;
                          accessoriesAdded = true;
                       }
                      let formulaString = "";
                      if (formulaParts.length > 1) {
                          if (formulaParts[0].startsWith('+ ')) formulaParts[0] = formulaParts[0].substring(2);
                          formulaString = ` <span class="formula">(${formulaParts.join(' ')})</span>`;
                      }
                      const displayQty = (totalQty % 1 === 0) ? totalQty : totalQty.toFixed(2);
                      totalsHTML += `<tr><td style="text-align: left; font-weight: 500;">${item}</td><td><b>${displayQty} ${unit}</b>${formulaString}</td></tr>`;
                      hasAccessories = true;
                  }
              }
         }
    }
    // Block erstellen
    if (!hasLengths && !hasAccessories && !hasArea) return null;
    totalsHTML += '</tbody></table>';
    const block = document.createElement('div');
    block.className = 'skizze-block keyword-totals-block';
    if (blockId) { block.id = blockId; block.classList.remove('keyword-totals-block'); }
    const metaDiv = document.createElement('div');
    metaDiv.className = 'skizze-meta';
    metaDiv.style.width = '100%';
    metaDiv.innerHTML = totalsHTML;
    block.appendChild(metaDiv);
    return block;
};


/**
 * Rendert NUR das Aufmaßblatt (Skizzen + Summen).
 */
export function renderSkizzenList() {
    const container = document.getElementById('skizzen-list');
    container.innerHTML = "";
    const savedSketches = dataState.savedSketches;
    if (savedSketches.length === 0) {
        container.innerHTML = "<p>Keine gespeicherten Skizzen.</p>";
        return;
    }
    savedSketches.forEach((sk, idx) => {
        const block = document.createElement('div'); block.className = 'skizze-block';
        const img = document.createElement('img'); img.src = sk.image; img.alt = sk.name;
        const meta = document.createElement('div'); meta.className = 'skizze-meta';
        const currentMode = sk.inclusionMode ?? (sk.includeInTotals === false ? 0 : 1);
        
        let displayName = sk.name;
        const keywordRegex = /(.+)['"„“](dach|gaube|kamin)['"„“]/i; 
        const match = sk.name.match(keywordRegex);
        
        if (match && match[1]) {
            displayName = match[1].trim(); 
        }
        
        let html = `<div style="display:flex;justify-content:space-between;align-items:center; flex-wrap: wrap; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            
                            <input type="checkbox" class="skizze-2d-checkbox no-print" data-sketch-name="${sk.name}" data-sketch-idx="${idx}"
                                   title="Für 2D-Export auswählen" style="min-height: 20px; width: 20px; margin: 0; cursor: pointer;">
                            
                            <div class="no-print">
                                <select id="include-sketch-${idx}" onchange="setSketchInclusionMode(${idx})" style="min-height: 28px; padding: 4px; font-weight: bold; border-radius: 6px;">
                                    <option value="1" ${currentMode === 1 ? 'selected' : ''} style="color: green; font-weight: bold;">[ + ] Addieren</option>
                                    <option value="0" ${currentMode === 0 ? 'selected' : ''} style="color: #555;">[ Ø ] Ignorieren</option>
                                    <option value="-1" ${currentMode === -1 ? 'selected' : ''} style="color: red; font-weight: bold;">[ - ] Subtrahieren</option>
                                </select>
                            </div>
                            
                            <div id="sketch-name-display-${idx}" 
                                 style="font-weight:bold; margin: 0; cursor: pointer; min-height: 22px; padding: 2px 5px; display: inline-block; border-radius: 4px;" 
                                 onclick="window.inlineEditSketchName(${idx})" 
                                 title="Klicken zum Umbenennen">
                                 ${idx + 1}. ${displayName}
                            </div>
                            </div>
                        <div class="no-print">
                            <button onclick="loadSketch(${idx})">✏️ Laden</button>
                            <button onclick="addAccessory(${idx})" style="margin-left: 5px;">📦 Zubehör</button>
                            <button onclick="deleteSketch(${idx})" style="margin-left: 5px;">🗑️ löschen</button>
                        </div>
                    </div>`;
        html += `<table><thead><tr><th>#</th><th>Beschriftung</th><th>Länge (m)</th><th class="no-print" style="width: 30px;">∑</th></tr></thead><tbody>`;
        let totalSketchLength = 0;
        const deleted = new Set(sk.deletedSegments || []);
        const sketchLabels = sk.labels || {};
        if (!sk.segmentInclusion) {
            sk.segmentInclusion = {};
            Object.keys(sketchLabels).forEach(segIdxStr => {
                if (sketchLabels[segIdxStr]) { sk.segmentInclusion[segIdxStr] = true; }
            });
        }
        for (let i = 1; i < sk.points.length; i++) {
            const segmentIndex = i - 1;
            if (deleted.has(segmentIndex)) continue;
            const p1 = sk.points[i - 1], p2 = sk.points[i];
            const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);

            totalSketchLength += len;
            const label = sketchLabels[segmentIndex];
            const labelCell = label ? label : "–";
            const isSegmentChecked = sk.segmentInclusion[segmentIndex] !== false;
            const segmentCheckboxDisabled = (currentMode !== 1);
            let segmentCheckboxHTML = '<td class="no-print"></td>';
            if (label) {
                segmentCheckboxHTML = `<td class="no-print" style="text-align: center;"><input type="checkbox" onchange="toggleSegmentInTotals(${idx}, ${segmentIndex})" ${isSegmentChecked ? 'checked' : ''} ${segmentCheckboxDisabled ? 'disabled' : ''} style="min-height: 18px; width: 18px; margin: 0; cursor: pointer;"></td>`;
            }
            html += `<tr><td>${i}</td><td>${labelCell}</td><td>${len.toFixed(2)}</td>${segmentCheckboxHTML}</tr>`;
        }
        if (sk.points.length > 2 && approxEqual(sk.points[0].x, sk.points[sk.points.length - 1].x) && approxEqual(sk.points[0].y, sk.points[sk.points.length - 1].y)) {
            const closingIdx = sk.points.length - 2;
            const deletedSet = new Set(sk.deletedSegments || []);
            if (!deletedSet.has(closingIdx)) {
                const area = polygonAreaPx(sk.points.map(p => ({ x: p.x * sk.scale, y: p.y * sk.scale }))) / (sk.scale * sk.scale);
                html += `<tr><th colspan="4">Fläche: ${area.toFixed(2)} m²</th></tr>`;
            }
        }
        html += `</tbody></table>`;
        html += `<div style="margin-top:6px;font-weight:500">Gesamtlänge (Skizze): ${totalSketchLength.toFixed(2)} m</div>`;
        meta.innerHTML = html;
        block.appendChild(img);
        block.appendChild(meta);
        container.appendChild(block);
    });
    const { globalTotals, globalTotalArea, globalAccessoryTotals, keywordTotals } = calculateTotals();
    const globalBlock = createTotalsBlock("Gesamtsummen", "global-totals-block", globalTotals, globalTotalArea, globalAccessoryTotals);
    if (globalBlock) container.appendChild(globalBlock);
    const keywords = ['gaube', 'kamin', 'dach'];
    for (const key of keywords) {
        const bucket = keywordTotals[key];
        if (bucket.hasData) {
            const title = key.charAt(0).toUpperCase() + key.slice(1);
            const keywordBlock = createTotalsBlock(`Summe: ${title}`, null, bucket.lengths, bucket.area, bucket.accessories);
            if (keywordBlock) container.appendChild(keywordBlock);
        }
    }
}

/**
 * ZENTRALE FUNKTION: Berechnet und zeigt den Materialbedarf an.
 */
function createMaterialBlock(lengthTotals, areaTotals, accessoryTotals, filter, tile, sketchesWithIdx) {
    const container = document.getElementById('material-list-container');

    if (!tile) return; // Aufrufer (renderMaterialPage) kümmert sich um den "kein Material"-Fall

    // NEU: Intelligente Aufrundungs-Funktion gegen Fließkomma-Ungenauigkeiten
    const smartCeil = (num) => {
        const epsilon = 1e-9; // Eine sehr kleine Toleranz
        return Math.ceil(num - epsilon);
    };

    const materialList = {};
    let totalAreaM2 = 0;

    // --- 1. Berechnung der Gesamtfläche ---
    areaTotals.forEach(contrib => {
        totalAreaM2 += (contrib.value * contrib.mode);
    });
    totalAreaM2 = Math.max(0, totalAreaM2); 

    // --- 2. Hauptdeckung (Fläche) ---
    // anzahlReihenExakt wird, falls die Reihen-Berechnung greift, auch für
    // die Ortgangziegel-Berechnung weiter unten genutzt (Schritt 3) - denn
    // pro Reihe wird links/rechts genau EIN Ortgangziegel benötigt, die
    // Reihenanzahl ist also die exakteste bekannte Größe dafür.
    let anzahlReihenExakt = null;

    if (totalAreaM2 > 0) {
        // Präzise Berechnung nach Handwerker-Logik:
        //   1. Ortganglänge (= tatsächliche Dachlänge Traufe->First, aus der
        //      Skizze gemessen, NICHT über Fläche/Traufe angenähert)
        //      minus Firstlattmaß minus Trauflattmaß (echter Wert falls beim
        //      Material hinterlegt, sonst feste Annahme: 34cm) = Restlänge
        //   2. Restlänge / maximale Lattweite (oberes Ende der Decklängen-
        //      Spanne), aufrunden = Anzahl der "Zwischen"-Latten
        //   3. + 1 = Gesamtzahl Reihen
        //   4. Deckbreite -> Ziegel pro Reihe (Traufe-Länge / Deckbreite)
        //   5. Gesamt = Reihen × Ziegel pro Reihe

        let traufeLength = 0;
        if (lengthTotals["Traufe"]) {
            lengthTotals["Traufe"].forEach(contrib => { traufeLength += (contrib.value * contrib.mode); });
        }
        traufeLength = Math.max(0, traufeLength);

        // Echte Ortganglänge (rechtwinklig zur Traufe) aus der Skizze holen -
        // Mittelwert aus links/rechts, falls beide vorhanden (sollten normalerweise
        // gleich lang sein; kleine Messabweichungen werden so ausgeglichen).
        let ortgangLinks = 0, ortgangRechts = 0;
        let hasOrtgangLinks = false, hasOrtgangRechts = false;
        if (lengthTotals["Ortgang (links)"]) {
            lengthTotals["Ortgang (links)"].forEach(c => { ortgangLinks += (c.value * c.mode); });
            hasOrtgangLinks = true;
        }
        if (lengthTotals["Ortgang (rechts)"]) {
            lengthTotals["Ortgang (rechts)"].forEach(c => { ortgangRechts += (c.value * c.mode); });
            hasOrtgangRechts = true;
        }
        let ortgangLength = 0;
        if (hasOrtgangLinks && hasOrtgangRechts) {
            ortgangLength = (ortgangLinks + ortgangRechts) / 2;
        } else if (hasOrtgangLinks) {
            ortgangLength = ortgangLinks;
        } else if (hasOrtgangRechts) {
            ortgangLength = ortgangRechts;
        }
        ortgangLength = Math.max(0, ortgangLength);

        const decklaengeRange = (tile.decklaenge_cm !== undefined) ? parseDecklaengeRange(tile.decklaenge_cm) : null;
        const canUseRowCalc = tile.deckbreite_cm && traufeLength > 0 && ortgangLength > 0 && decklaengeRange;

        let requiredQty, formulaText;

        if (canUseRowCalc) {
            // Trauflattmaß: recherchierter Wert nutzen, falls beim Material
            // hinterlegt (z.B. bei Röben als Spanne "35,5 - 37,5"); sonst
            // feste Standardannahme von 34cm.
            let LAT_m;
            if (tile.trauflattmass_cm !== undefined) {
                const traufRange = parseDecklaengeRange(tile.trauflattmass_cm);
                LAT_m = traufRange ? ((traufRange.min + traufRange.max) / 2) / 100 : 0.34;
            } else {
                LAT_m = 0.34;
            }
            const DB_m = tile.deckbreite_cm / 100;             // Deckbreite in m
            const maxLattweite_m = decklaengeRange.max / 100;  // maximale Lattweite in m

            // Schritt 4: Deckbreite -> Ziegel pro Reihe (entlang der Traufe).
            // Wie beim Lattmaß auf ganze Ziegel runden (nicht zwingend
            // aufrunden) - die Deckbreite hat i.d.R. etwas Spielraum, sodass
            // z.B. 14,02 rechnerisch zu 14 tatsächlich verlegten Ziegeln wird.
            let ziegelProReihe = Math.round(traufeLength / DB_m);

            // Wenn diese Skizze Ortgangziegel hat (links und/oder rechts),
            // übernehmen diese die Position des jeweils äußersten
            // Flächenziegels - der wird deshalb hier abgezogen, um ihn nicht
            // doppelt zu zählen (er taucht separat in der Ortgang-Zeile der
            // Tabelle auf). Bei Kehle/Übergang/Grat gibt es keine speziellen
            // Randziegel, daher KEIN Abzug in diesen Fällen.
            let ortgangAbzug = 0;
            if (hasOrtgangLinks) ortgangAbzug++;
            if (hasOrtgangRechts) ortgangAbzug++;
            ziegelProReihe = Math.max(1, ziegelProReihe - ortgangAbzug);

            // Schritt 1-3: Ortganglänge minus Firstlattmaß minus Trauflattmaß,
            // Rest durch maximale Lattweite, aufrunden, + 1
            const LAF_m = (tile.firstlattmass_cm !== undefined) ? (tile.firstlattmass_cm / 100) : 0;
            const restlaenge = Math.max(0, ortgangLength - LAF_m - LAT_m);
            const anzahlLatten = Math.ceil(restlaenge / maxLattweite_m);
            const anzahlReihen = Math.max(1, anzahlLatten + 1);
            anzahlReihenExakt = anzahlReihen;

            const firstlattInfo = (tile.firstlattmass_cm !== undefined) ? `${LAF_m.toFixed(3)}m Firstlattmaß` : `0m Firstlattmaß (nicht hinterlegt)`;
            const trauflattInfo = (tile.trauflattmass_cm !== undefined)
                ? `${LAT_m.toFixed(3)}m Trauflattmaß`
                : `${LAT_m.toFixed(3)}m Trauflattmaß [Annahme]`;
            const reihenFormelTeil = `(${ortgangLength.toFixed(2)}m Ortganglänge − ${firstlattInfo} − ${trauflattInfo}) / ${maxLattweite_m.toFixed(3)}m max. Lattweite, aufgerundet, + 1`;
            const genauesLattmass = anzahlLatten > 0 ? (restlaenge / anzahlLatten) : 0;
            const ortgangAbzugInfo = ortgangAbzug > 0 ? `, − ${ortgangAbzug} Ortgangziegel-Position${ortgangAbzug > 1 ? 'en' : ''}` : '';

            requiredQty = anzahlReihen * ziegelProReihe;
            formulaText = `${anzahlReihen} Reihen [${reihenFormelTeil}] × ${ziegelProReihe} Ziegel/Reihe [${traufeLength.toFixed(2)}m Traufe / ${DB_m.toFixed(3)}m Deckbreite${ortgangAbzugInfo}] `
                + `(genaues Lattmaß bei ${anzahlLatten} Latten: ${(genauesLattmass * 100).toFixed(1)}cm)`;
        } else {
            // Fallback: keine Traufe- oder Ortgang-Beschriftung vorhanden
            // (oder keine Deckbreite/Decklänge beim Material hinterlegt)
            // -> einfache Fläche × Durchschnittsfaktor-Rechnung.
            requiredQty = totalAreaM2 * tile.faktor;
            const missingReason = !tile.deckbreite_cm || !decklaengeRange
                ? 'Deckbreite/Decklänge sind für dieses Material nicht hinterlegt'
                : (!ortgangLength ? 'keine Beschriftung "Ortgang (links)" oder "Ortgang (rechts)" gefunden' : 'keine Beschriftung "Traufe" gefunden');
            formulaText = `${totalAreaM2.toFixed(2)} m² * ${tile.faktor} ${tile.einheit}/m² (Durchschnittsfaktor - ${missingReason})`;
        }

        const materialName = tile.material;

        materialList[materialName] = {
            unit: tile.einheit,
            // KORREKTUR: smartCeil statt Math.ceil verwenden
            quantity: tile.einheit === 'Stk' ? smartCeil(requiredQty) : requiredQty,
            category: tile.category,
            formula: formulaText
        };

        // Falls für dieses Material eine Hochführungshöhe hinterlegt ist
        // (z.B. Zink/Alu-Stehfalz), zusätzlich den Rand-/Wandanschluss als
        // eigene Position ausweisen (Wandanschluss- + Randabschluss- +
        // Traufe-Länge × Hochführungshöhe), statt ihn pauschal in den
        // Flächen-Faktor einzurechnen bzw. separat als Tropfblech/
        // Wandanschlussblech zu führen.
        if (tile.randhochfuehrung_m !== undefined) {
            const randLength = (() => {
                let sum = 0;
                (lengthTotals["Wandanschluss"] || []).forEach(c => { sum += c.value * c.mode; });
                (lengthTotals["Randabschluss"] || []).forEach(c => { sum += c.value * c.mode; });
                (lengthTotals["Traufe"] || []).forEach(c => { sum += c.value * c.mode; });
                return Math.max(0, sum);
            })();
            const randQty = randLength * tile.randhochfuehrung_m;
            materialList[`${materialName} (Rand-/Wandanschluss)`] = {
                unit: 'm²',
                quantity: randQty,
                category: tile.category,
                formula: randLength > 0
                    ? `${randLength.toFixed(2)} m Wandanschluss/Randabschluss/Traufe * ${tile.randhochfuehrung_m.toFixed(2)}m Hochführung`
                    : `keine "Wandanschluss"/"Randabschluss"/"Traufe"-Beschriftung in den Skizzen gefunden`
            };
        }
    }

    // --- 3. Längen-basierte Materialien (Traufe, Kehle, Ortgang etc.) ---
    const sortedLabels = Object.keys(lengthTotals).sort();
    
    // a) Materialien aus der Hauptdeckung (First, Grat, Ortgang)
    for (const label in tile.relatedFactors) {
        if (lengthTotals[label]) {
            const factorData = tile.relatedFactors[label];
            const isOrtgangLabel = (label === 'Ortgang (links)' || label === 'Ortgang (rechts)');

            // Für Ortgangziegel: wenn die exakte Reihen-Berechnung (Schritt 2)
            // gelaufen ist, direkt diese Reihenanzahl übernehmen - pro Reihe
            // wird links/rechts genau ein Ortgangziegel benötigt, das ist
            // präziser als die Länge × Stk/lfdm-Näherung.
            if (isOrtgangLabel && anzahlReihenExakt !== null) {
                materialList[factorData.material] = {
                    unit: factorData.einheit,
                    quantity: anzahlReihenExakt,
                    category: factorData.category,
                    formula: `= Anzahl Reihen der Hauptdeckung (${anzahlReihenExakt}) - ein Ortgangziegel pro Reihe`
                };
                continue;
            }

            let totalLength = 0;
            const formulaParts = [];

            lengthTotals[label].forEach(contrib => {
                const val = contrib.value * contrib.mode;
                totalLength += val;
                if (Math.abs(val) > 0.001) {
                    const sign = val > 0 ? '+' : '-';
                    formulaParts.push(`${sign} ${Math.abs(val).toFixed(2)}`);
                }
            });
            
            if (Math.abs(totalLength) > 0.001 && factorData.faktor > 0) {
                const calculatedQty = totalLength * factorData.faktor;
                
                let formulaString = "";
                if (formulaParts.length > 1) {
                    if (formulaParts[0].startsWith('+ ')) formulaParts[0] = formulaParts[0].substring(2);
                    formulaString = `(${formulaParts.join(' ')}) m * ${factorData.faktor} ${factorData.einheit}/m`;
                } else {
                    formulaString = `${totalLength.toFixed(2)} m * ${factorData.faktor} ${factorData.einheit}/m`;
                }

                materialList[factorData.material] = {
                    unit: factorData.einheit,
                    // KORREKTUR: smartCeil statt Math.ceil verwenden
                    quantity: factorData.einheit === 'Stk' ? smartCeil(calculatedQty) : calculatedQty,
                    category: factorData.category,
                    formula: formulaString
                };
            }
        }
    }
    
    // b) Standard-Materialien (Kehlblech, Traufblech, etc.)
    for (const label in labelBasedMaterials) {
        // "Wandanschluss"/"Traufe" überspringen, wenn die gewählte Hauptdeckung
        // selbst schon eine Rand-/Wandanschluss-Position hat (z.B. Zink/Alu-
        // Stehfalz, Bitumen/EPDM) - dort werden Wandanschluss UND Traufe mit
        // demselben Material hochgeführt/abgeschlossen, ein zusätzliches
        // "Wandanschlussblech"/"Tropfblech" wäre doppelt.
        if ((label === 'Wandanschluss' || label === 'Traufe') && tile.randhochfuehrung_m !== undefined) continue;

        if (lengthTotals[label] && !label.startsWith('Zusatzflaeche_')) { 
            const totalLengthData = lengthTotals[label];
            let totalLength = 0;
            const formulaParts = [];

            totalLengthData.forEach(contrib => {
                const val = contrib.value * contrib.mode;
                totalLength += val;
                if (Math.abs(val) > 0.001) {
                    const sign = val > 0 ? '+' : '-';
                    formulaParts.push(`${sign} ${Math.abs(val).toFixed(2)}`);
                }
            });
            
            if (Math.abs(totalLength) > 0.001) {
                labelBasedMaterials[label].forEach(mat => {
                    const calculatedQty = totalLength * mat.faktor;
                    let formulaString = "";
                    if (formulaParts.length > 1) {
                        if (formulaParts[0].startsWith('+ ')) formulaParts[0] = formulaParts[0].substring(2);
                        formulaString = `(${formulaParts.join(' ')}) m * ${mat.faktor} ${mat.einheit}/m`;
                    } else {
                        formulaString = `${totalLength.toFixed(2)} m * ${mat.faktor} ${mat.einheit}/m`;
                    }
                    
                    materialList[mat.material] = {
                        unit: mat.einheit,
                        quantity: calculatedQty,
                        category: mat.category,
                        formula: formulaString
                    };
                });
            }
        }
    }

    // --- 4. Flächen-Zusatzmaterialien (Dämmung, USB) ---
    for (const label in labelBasedMaterials) {
        if (label.startsWith('Zusatzflaeche_') && lengthTotals[label]) {
            const totalAreaContribData = lengthTotals[label];
            let totalAreaContrib = 0;
            
            totalAreaContribData.forEach(contrib => {
                totalAreaContrib += (contrib.value * contrib.mode);
            });
            
            if (Math.abs(totalAreaContrib) > 0.001) {
                 labelBasedMaterials[label].forEach(mat => {
                    const calculatedQty = totalAreaContrib * mat.faktor;
                    
                    materialList[mat.material] = {
                        unit: mat.einheit,
                        quantity: calculatedQty,
                        category: mat.category,
                        formula: `${totalAreaContrib.toFixed(2)} m² * ${mat.faktor} ${mat.einheit}/m²`
                    };
                 });
            }
        }
    }

    // --- 5. Zubehör-Materialien ---
    for (const accessory in accessoryTotals) {
        if (labelBasedMaterials[accessory]) {
            labelBasedMaterials[accessory].forEach(mat => {
                
                const unitMap = accessoryTotals[accessory];
                let totalQty = 0; 
                
                if (unitMap['Stück']) {
                    unitMap['Stück'].forEach(contrib => {
                        totalQty += (contrib.value * contrib.mode);
                    });
                }
                
                if (totalQty > 0) {
                     const calculatedQty = totalQty * mat.faktor; 
                     
                     materialList[mat.material] = {
                        unit: mat.einheit,
                         // KORREKTUR: smartCeil statt Math.ceil verwenden
                        quantity: mat.einheit === 'Stk' ? smartCeil(calculatedQty) : calculatedQty,
                        category: mat.category,
                        formula: `${totalQty} Stk. ${accessory} * ${mat.faktor} ${mat.einheit}/Stk.`
                    };
                }
            });
        } 
        
        if (accessory === "PV Modul") {
            const unitMap = accessoryTotals[accessory];
             if (unitMap['Stück']) {
                 unitMap['Stück'].forEach(contrib => {
                     materialList["PV Modul"] = {
                        unit: 'Stück',
                        // KORREKTUR: smartCeil statt Math.ceil verwenden
                        quantity: smartCeil((materialList["PV Modul"]?.quantity || 0) + (contrib.value * contrib.mode)),
                        category: 'Sonstiges',
                        formula: `Summe aus 2D-Planung`
                    };
                 });
             }
        }
        
        if (accessory !== "Wohnraumfenster" && accessory !== "PV Modul" && accessory !== "Kamin" && accessory !== "Lüfter" && labelBasedMaterials[accessory] === undefined) {
            const unitMap = accessoryTotals[accessory];
             for (const unit in unitMap) {
                 unitMap[unit].forEach(contrib => {
                    const materialName = `${accessory} (${unit})`;
                    const calculatedQty = (materialList[materialName]?.quantity || 0) + (contrib.value * contrib.mode);
                     materialList[materialName] = {
                        unit: unit,
                        // KORREKTUR: smartCeil statt Math.ceil verwenden, falls es Stück ist
                        quantity: unit === 'Stk' || unit === 'Stück' ? smartCeil(calculatedQty) : calculatedQty,
                        category: 'Sonstiges',
                        formula: `Summe aus Skizzen`
                    };
                 });
             }
        }
    }


    // --- 6. Ausgabe des Blocks (mit Filter) ---
    const materialBlock = document.createElement('div');
    materialBlock.className = 'material-block';
    materialBlock.style.marginBottom = '25px';
    
    const tileName = tile.material || "Unbekannt";
    const mainTileMaterial = tile.material;

    const sortPriority = (name) => {
        if (name === mainTileMaterial) return 0;
        if (name.includes("Firstziegel") || name.includes("Gratblech") || name.includes("Firstblech")) return 1;
        if (name.includes("Ortgang")) return 2;
        return 3;
    };

    let html = `<h3 style="margin-top: 0; margin-bottom: 5px;">Materialbedarf: ${tileName}</h3>`;
    html += `<div class="sketch-buttons-placeholder" style="margin-bottom: 10px; display:flex; flex-wrap:wrap; gap:6px; align-items:center;"></div>`;
    let latInfo;
    if (tile.decklaenge_cm !== undefined) {
        // Ziegel-artiges Material mit Reihen-Berechnung (Traufe/Ortgang/Lattmaß)
        latInfo = ` – Deckbreite: ${tile.deckbreite_cm}cm${tile.trauflattmass_cm !== undefined ? `, Trauflattmaß: ${tile.trauflattmass_cm}cm` : ' (Trauflattmaß: 34cm, Annahme)'}${tile.firstlattmass_cm !== undefined ? `, Firstlattmaß: ${tile.firstlattmass_cm}cm` : ' (kein Firstlattmaß hinterlegt)'}`;
    } else if (tile.deckbreite_cm !== undefined) {
        // Durchgehendes Bahnenmaterial (z.B. Stehfalz-Scharen) - kein Reihen-
        // konzept, stattdessen m² pro laufendem Meter als Bestellhilfe.
        const flaecheProLfm = (tile.deckbreite_cm / 100) * tile.faktor;
        const parts = [`Deckbreite: ${tile.deckbreite_cm}cm${tile.bandbreite_cm !== undefined ? ` (Bandbreite: ${tile.bandbreite_cm}cm)` : ''}`, `ca. ${flaecheProLfm.toFixed(3)} m² pro lfm (Schar-Länge)`];
        if (tile.randhochfuehrung_m !== undefined) {
            parts.push(`ca. ${tile.randhochfuehrung_m.toFixed(2)} m² pro lfm (Rand-/Wandanschluss)`);
        }
        latInfo = ` – ${parts.join(', ')}`;
    } else {
        latInfo = ` (Durchschnittsfaktor: ${tile.faktor} ${tile.einheit}/m²)`;
    }
    html += `<div style="margin-bottom: 15px;">**Gewählte Hauptdeckung:** ${tile.material}${latInfo}</div>`;
    
    html += '<table><thead><tr><th>Material / Posten</th><th>Gesamtmenge</th></tr></thead><tbody>';

    let hasData = false;
    
    const sortedMaterials = Object.keys(materialList).sort((a, b) => sortPriority(a) - sortPriority(b));

    for (const materialName of sortedMaterials) {
        const item = materialList[materialName];
        
        if (filter !== 'Alle' && filter !== item.category) {
            continue;
        }

        if (Math.abs(item.quantity) > 0.001) {
            const displayQty = item.unit === 'Stk' || item.unit === 'Stück' 
                               ? item.quantity.toString() 
                               : item.quantity.toFixed(2).replace(/\.00$/, ''); 
            
            const formulaString = ` <span class="formula">(${item.formula})</span>`;
            
            html += `<tr><td style="text-align: left; font-weight: 500;">${materialName}</td><td><b>${displayQty} ${item.unit}</b>${formulaString}</td></tr>`;
            hasData = true;
        }
    }

    if (!hasData) {
        html += `<tr><td colspan="2" style="text-align: center;">Keine Materialien für den Filter "${filter}" gefunden.</td></tr>`;
    }

    html += '</tbody></table>';
    materialBlock.innerHTML = html;
    container.appendChild(materialBlock);

    // Klickbare Skizzen-Buttons einfügen, mit denen man das Material für
    // JEDE einzelne Skizze direkt hier im Material-Tab ändern kann.
    const btnPlaceholder = materialBlock.querySelector('.sketch-buttons-placeholder');
    if (btnPlaceholder && sketchesWithIdx) {
        const label = document.createElement('span');
        label.style.cssText = 'color:#666; font-size:0.9em; margin-right:4px;';
        label.textContent = 'Skizzen:';
        btnPlaceholder.appendChild(label);

        sketchesWithIdx.forEach(({ sk, idx }) => {
            const sBtn = document.createElement('button');
            sBtn.textContent = sk.name;
            sBtn.title = 'Material für diese Skizze ändern';
            sBtn.style.cssText = 'font-size:0.85em; padding:3px 8px;';
            sBtn.onclick = () => openTileChoiceModal(idx);
            btnPlaceholder.appendChild(sBtn);
        });
    }
}


/**
 * Rendert NUR die Materialbedarfs-Seite.
 */
export function renderMaterialPage() {
    const container = document.getElementById('material-list-container');
    container.innerHTML = "";
    
    if (dataState.savedSketches.length === 0) {
        document.getElementById('materialbedarf').querySelector('p')?.remove();
        const p = document.createElement('p');
        p.textContent = "Keine Skizzen vorhanden, um Material zu berechnen.";
        container.appendChild(p);
        
        document.getElementById('tile-choice-modal').style.display = 'none';
        return;
    }

    // --- Zusatzmaterial-Panel: pro Skizze Ziegel/Dämmung/Metall wählen ---
    const selectorPanel = document.createElement('div');
    selectorPanel.className = 'material-selector-panel no-print';
    selectorPanel.style.cssText = 'padding: 15px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px;';
    const selectorTitle = document.createElement('h3');
    selectorTitle.style.cssText = 'margin-top: 0;';
    selectorTitle.textContent = 'Material pro Skizze';
    selectorPanel.appendChild(selectorTitle);

    dataState.savedSketches.forEach((sk, idx) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:6px 0; border-bottom:1px solid #f0f0f0;';
        const name = document.createElement('span');
        name.textContent = sk.name;
        name.style.cssText = 'min-width:110px; font-weight:bold;';
        row.appendChild(name);

        const ziegelBtn = document.createElement('button');
        const layerCount = (sk.eindeckungLayers || []).length;
        let ziegelLabel = 'Eindeckung wählen';
        if (sk.material) ziegelLabel = sk.material.material;
        else if (layerCount > 0) ziegelLabel = `${layerCount} Lage${layerCount > 1 ? 'n' : ''} (Bitumen/EPDM)`;
        ziegelBtn.textContent = `🧱 ${ziegelLabel}`;
        ziegelBtn.onclick = () => openTileChoiceModal(idx);
        row.appendChild(ziegelBtn);

        const daemmungBtn = document.createElement('button');
        daemmungBtn.textContent = `🧊 ${sk.daemmung ? sk.daemmung.material : 'Dämmung wählen'}`;
        daemmungBtn.onclick = () => openDaemmungChoiceModal(idx);
        row.appendChild(daemmungBtn);

        const metallCount = (sk.metallItems || []).length;
        const metallBtn = document.createElement('button');
        metallBtn.textContent = metallCount > 0 ? `🔧 Metall (${metallCount})` : '🔧 Metall wählen';
        metallBtn.onclick = () => openMetallChoiceModal(idx);
        row.appendChild(metallBtn);

        selectorPanel.appendChild(row);
    });
    container.appendChild(selectorPanel);

    // Skizzen nach zugewiesenem Material gruppieren. Jede Skizze braucht ihre
    // EIGENE Materialzuweisung (sk.material) - es gibt keine globale
    // Standard-Hauptdeckung mehr. Skizzen ohne Zuweisung werden separat mit
    // einer direkten Auswahl-Möglichkeit aufgelistet.
    const groups = [];
    const groupIndexByName = new Map();
    const unassignedSketches = [];

    dataState.savedSketches.forEach((sk, idx) => {
        const tile = sk.material;
        if (!tile) {
            unassignedSketches.push({ sk, idx });
            return;
        }
        const key = tile.material;
        if (!groupIndexByName.has(key)) {
            groupIndexByName.set(key, groups.length);
            groups.push({ tile, sketches: [] });
        }
        groups[groupIndexByName.get(key)].sketches.push({ sk, idx });
    });

    groups.forEach((group, i) => {
        const sketchObjs = group.sketches.map(s => s.sk);
        const { globalTotals, globalTotalArea, globalAccessoryTotals } = calculateTotalsForSketches(sketchObjs);
        // PV-Module (nicht materialgebunden) nur in der ersten Gruppe anzeigen,
        // damit sie nicht mehrfach auftauchen, falls mehrere Materialien genutzt werden.
        if (i === 0) {
            Object.assign(globalAccessoryTotals, calculatePvModuleTotals());
        }
        createMaterialBlock(globalTotals, globalTotalArea, globalAccessoryTotals, currentMaterialFilter, group.tile, group.sketches);
    });

    // Hinweis: Ein separater "Skizzen ohne Eindeckung"-Kasten wurde entfernt, da
    // der "🧱 Eindeckung wählen"-Button im "Material pro Skizze"-Panel oben
    // bereits genau das Gleiche anbietet - das war doppelt.

    // --- Dämmung: nach gewähltem Material gruppieren und berechnen ---
    const daemmungGroups = [];
    const daemmungIndexByName = new Map();
    dataState.savedSketches.forEach((sk, idx) => {
        if (!sk.daemmung) return;
        const key = sk.daemmung.material;
        if (!daemmungIndexByName.has(key)) {
            daemmungIndexByName.set(key, daemmungGroups.length);
            daemmungGroups.push({ material: sk.daemmung, sketches: [] });
        }
        daemmungGroups[daemmungIndexByName.get(key)].sketches.push(sk);
    });
    daemmungGroups.forEach(group => {
        const { globalTotalArea } = calculateTotalsForSketches(group.sketches);
        const totalArea = sumAreaContributions(globalTotalArea);
        if (totalArea > 0) {
            renderSimpleMaterialBlock(container, 'Dämmung', group.material, totalArea, group.sketches.map(s => s.name));
        }
    });

    // --- Metall-Positionen: pro gewähltem Item über alle Skizzen gruppieren ---
    const metallGroups = [];
    const metallIndexByName = new Map();
    dataState.savedSketches.forEach(sk => {
        (sk.metallItems || []).forEach(item => {
            const key = item.material;
            if (!metallIndexByName.has(key)) {
                metallIndexByName.set(key, metallGroups.length);
                metallGroups.push({ material: item, sketches: [] });
            }
            metallGroups[metallIndexByName.get(key)].sketches.push(sk);
        });
    });
    metallGroups.forEach(group => {
        const { globalTotalArea } = calculateTotalsForSketches(group.sketches);
        const totalArea = sumAreaContributions(globalTotalArea);
        if (totalArea > 0) {
            renderSimpleMaterialBlock(container, 'Metall', group.material, totalArea, group.sketches.map(s => s.name));
        }
    });

    // --- Bitumen/EPDM-Lagen: pro gewählter Lage über alle Skizzen gruppieren ---
    const eindeckungLayerGroups = [];
    const eindeckungLayerIndexByName = new Map();
    dataState.savedSketches.forEach(sk => {
        (sk.eindeckungLayers || []).forEach(item => {
            const key = item.material;
            if (!eindeckungLayerIndexByName.has(key)) {
                eindeckungLayerIndexByName.set(key, eindeckungLayerGroups.length);
                eindeckungLayerGroups.push({ material: item, sketches: [] });
            }
            eindeckungLayerGroups[eindeckungLayerIndexByName.get(key)].sketches.push(sk);
        });
    });
    eindeckungLayerGroups.forEach(group => {
        const { globalTotals, globalTotalArea } = calculateTotalsForSketches(group.sketches);
        const totalArea = sumAreaContributions(globalTotalArea);
        if (totalArea > 0) {
            const randLength = sumAreaContributions(globalTotals["Wandanschluss"]) + sumAreaContributions(globalTotals["Randabschluss"]) + sumAreaContributions(globalTotals["Traufe"]);
            renderBitumenLayerBlock(container, group.material, totalArea, randLength, group.sketches.map(s => s.name));
        }
    });

    if (groups.length === 0 && unassignedSketches.length === 0 && daemmungGroups.length === 0 && metallGroups.length === 0 && eindeckungLayerGroups.length === 0) {
        const emptyHint = document.createElement('p');
        emptyHint.style.cssText = 'text-align:center; color:#555; margin-top:20px;';
        emptyHint.textContent = 'Noch kein Material zugewiesen.';
        container.appendChild(emptyHint);
    }
}

/**
 * Summiert Flächen-Beiträge (inkl. Addieren/Subtrahieren-Modus) aus einem
 * areaTotals-Array (wie von calculateTotalsForSketches geliefert).
 */
function sumAreaContributions(areaTotals) {
    let total = 0;
    (areaTotals || []).forEach(c => { total += c.value * c.mode; });
    return Math.max(0, total);
}

/**
 * Rendert einen einfachen Fläche × Faktor Material-Block (für Dämmung und
 * Metall-Positionen) - ohne die First/Grat/Ortgang-Logik der Hauptdeckung.
 */
function renderSimpleMaterialBlock(container, kategorieLabel, materialObj, totalAreaM2, sketchNames) {
    const smartCeil = (num) => Math.ceil(num - 1e-9);
    const block = document.createElement('div');
    block.className = 'material-block';
    block.style.marginBottom = '25px';

    const qty = totalAreaM2 * materialObj.faktor;
    const displayQty = materialObj.einheit === 'Stk' ? smartCeil(qty) : qty.toFixed(2);

    block.innerHTML = `
        <h3 style="margin-top:0; margin-bottom:5px;">${kategorieLabel}: ${materialObj.material}</h3>
        <div style="margin-bottom:10px; color:#666; font-size:0.9em;">Skizzen: ${sketchNames.join(', ')}</div>
        <table><thead><tr><th>Material / Posten</th><th>Gesamtmenge</th></tr></thead><tbody>
        <tr>
            <td>${materialObj.material}</td>
            <td><strong>${displayQty} ${materialObj.einheit}</strong> <span class="formula">(${totalAreaM2.toFixed(2)} m² * ${materialObj.faktor} ${materialObj.einheit}/m²)</span></td>
        </tr>
        </tbody></table>
    `;
    container.appendChild(block);
}

/**
 * Rendert einen Bitumen/EPDM-Lagen-Block mit ZWEI getrennten Positionen:
 *   1. "Fläche" - Dachfläche × Überlappungsfaktor
 *   2. "Rand-/Wandanschluss" - Länge der Wandanschluss-/Randabschluss-
 *      Beschriftungen × angenommene Hochführungshöhe (randhochfuehrung_m)
 * Materialien ohne randhochfuehrung_m-Feld (z.B. individuell angelegte
 * Materialien ohne diese Angabe) zeigen nur die Fläche-Position.
 */
function renderBitumenLayerBlock(container, materialObj, totalAreaM2, randLength, sketchNames) {
    const smartCeil = (num) => Math.ceil(num - 1e-9);
    const block = document.createElement('div');
    block.className = 'material-block';
    block.style.marginBottom = '25px';

    const flaecheQty = totalAreaM2 * materialObj.faktor;

    let randRow = '';
    if (materialObj.randhochfuehrung_m !== undefined) {
        const randQty = randLength * materialObj.randhochfuehrung_m;
        randRow = `
        <tr>
            <td>${materialObj.material} (Rand-/Wandanschluss)</td>
            <td><strong>${randQty.toFixed(2)} m²</strong> <span class="formula">(${randLength.toFixed(2)} m Wandanschluss/Randabschluss/Traufe * ${materialObj.randhochfuehrung_m.toFixed(2)}m Hochführung)</span></td>
        </tr>`;
        if (randLength === 0) {
            randRow = `
        <tr>
            <td>${materialObj.material} (Rand-/Wandanschluss)</td>
            <td style="color:#888;"><em>keine "Wandanschluss"/"Randabschluss"/"Traufe"-Beschriftung in den Skizzen gefunden</em></td>
        </tr>`;
        }
    }

    block.innerHTML = `
        <h3 style="margin-top:0; margin-bottom:5px;">Eindeckung: ${materialObj.material}</h3>
        <div style="margin-bottom:10px; color:#666; font-size:0.9em;">Skizzen: ${sketchNames.join(', ')}</div>
        <table><thead><tr><th>Material / Posten</th><th>Gesamtmenge</th></tr></thead><tbody>
        <tr>
            <td>${materialObj.material} (Fläche)</td>
            <td><strong>${flaecheQty.toFixed(2)} m²</strong> <span class="formula">(${totalAreaM2.toFixed(2)} m² * ${materialObj.faktor} m²/m²)</span></td>
        </tr>
        ${randRow}
        </tbody></table>
    `;
    container.appendChild(block);
}


// --- Tab-Aktivierungsfunktionen (unverändert) ---
export function activateSkizzeTab() {
    document.getElementById('tab-skizze').classList.add('active');
    document.getElementById('tab-blatt').classList.remove('active');
    document.getElementById('tab-material').classList.remove('active');
    document.getElementById('skizze').style.display = 'flex';
    document.getElementById('aufmassblatt').style.display = 'none';
    document.getElementById('materialbedarf').style.display = 'none';
    requestRedraw();
}
export function activateAufmassTab() {
    document.getElementById('tab-skizze').classList.remove('active');
    document.getElementById('tab-blatt').classList.add('active');
    document.getElementById('tab-material').classList.remove('active');
    document.getElementById('skizze').style.display = 'none';
    document.getElementById('aufmassblatt').style.display = 'flex';
    document.getElementById('materialbedarf').style.display = 'none';
    renderSkizzenList();
}
export function activateMaterialTab() {
    document.getElementById('tab-skizze').classList.remove('active');
    document.getElementById('tab-blatt').classList.remove('active');
    document.getElementById('tab-material').classList.add('active');
    document.getElementById('skizze').style.display = 'none';
    document.getElementById('aufmassblatt').style.display = 'none';
    document.getElementById('materialbedarf').style.display = 'flex';
    renderMaterialPage();
}

/**
 * Setzt den Materialfilter und rendert die Materialseite neu.
 */
export function setMaterialFilter(category) {
    currentMaterialFilter = category;
    document.querySelectorAll('.material-filters button').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`mat-filter-${category.toLowerCase()}`);
    if (activeBtn) activeBtn.classList.add('active');
    
    renderMaterialPage();
}


// --- Eindeckung-Auswahl-Funktionen ---

const EINDECKUNGSARTEN = [
    { key: 'Ziegel/Pfanne', icon: '🧱' },
    { key: 'Bitumen/EPDM', icon: '🛢️' },
    { key: 'Zink/Alu', icon: '⚙️' }
];

/**
 * Öffnet das Eindeckung-Auswahl-Modal für eine bestimmte Skizze.
 * Zeigt zunächst eine Zwischenauswahl nach Art der Eindeckung
 * (Ziegel/Pfanne, Bitumen/EPDM, Zink/Alu), danach die passenden Materialien.
 * @param {number} sketchIdx - Die Skizze, der das Material zugewiesen wird.
 */
export function openTileChoiceModal(sketchIdx) {
    showEindeckungsartStep(sketchIdx);
    document.getElementById('tile-choice-modal').style.display = 'block';
}

/**
 * Schritt 1: Zeigt die Zwischenauswahl "Art der Eindeckung".
 */
function showEindeckungsartStep(sketchIdx) {
    const container = document.getElementById('tile-item-buttons');
    container.innerHTML = "";
    const allTiles = getSelectableMainTiles().filter(t => t.category === 'Ziegel');

    EINDECKUNGSARTEN.forEach(({ key, icon }) => {
        const count = allTiles.filter(t => (t.eindeckungsart || 'Ziegel/Pfanne') === key).length;
        const btn = document.createElement('button');
        btn.textContent = `${icon} ${key} (${count})`;
        btn.style.cssText = 'display:block; width:100%; margin-bottom:8px; text-align:left; padding:10px;';
        btn.disabled = count === 0;
        if (count === 0) btn.style.opacity = '0.5';
        btn.onclick = () => {
            if (key === 'Bitumen/EPDM') {
                openEindeckungLayersModal(sketchIdx);
            } else {
                showMaterialListStep(sketchIdx, key);
            }
        };
        container.appendChild(btn);
    });

    // Möglichkeit anbieten, eine bereits gesetzte Zuweisung wieder zu entfernen
    // (Skizze gilt dann wieder als "kein Material zugewiesen").
    if (dataState.savedSketches[sketchIdx]?.material) {
        const resetBtn = document.createElement('button');
        resetBtn.textContent = '✖ Material entfernen';
        resetBtn.style.cssText = 'display:block; width:100%; margin-top:10px; color:#555;';
        resetBtn.onclick = () => {
            dataState.savedSketches[sketchIdx].material = null;
            document.getElementById('tile-choice-modal').style.display = 'none';
            renderMaterialPage();
        };
        container.appendChild(resetBtn);
    }
}

/**
 * Schritt 2: Zeigt die (nach Favorit gefilterten) Materialien der gewählten
 * Eindeckungsart.
 */
function showMaterialListStep(sketchIdx, eindeckungsart) {
    const container = document.getElementById('tile-item-buttons');
    container.innerHTML = "";

    const backBtn = document.createElement('button');
    backBtn.textContent = '← Zurück';
    backBtn.style.cssText = 'display:block; width:100%; margin-bottom:10px; color:#555;';
    backBtn.onclick = () => showEindeckungsartStep(sketchIdx);
    container.appendChild(backBtn);

    const favoriteTiles = getFavoriteMainTiles().filter(t =>
        t.category === 'Ziegel' && (t.eindeckungsart || 'Ziegel/Pfanne') === eindeckungsart
    );

    favoriteTiles.forEach((tile) => {
        const btn = document.createElement('button');
        btn.textContent = tile.material; 
        btn.style.cssText = 'display:block; width:100%; margin-bottom:6px;';
        btn.onclick = () => selectMainTile(tile.material, sketchIdx);
        container.appendChild(btn);
    });
    if (favoriteTiles.length === 0) {
        const hint = document.createElement('p');
        hint.style.color = '#888';
        hint.textContent = `Keine Favoriten für "${eindeckungsart}" markiert. Unter "Materialien verwalten" kannst du Materialien mit dem Stern ★ als Favorit festlegen (und die Art der Eindeckung im Bearbeiten-Formular setzen).`;
        container.appendChild(hint);
    }
}

/**
 * Schließt das Eindeckung-Auswahl-Modal ohne Auswahl.
 */
export function cancelTileChoice() {
    document.getElementById('tile-choice-modal').style.display = 'none';
}

/**
 * Schließt das Dämmung-Auswahl-Modal ohne Auswahl.
 */
export function cancelDaemmungChoice() {
    document.getElementById('daemmung-choice-modal').style.display = 'none';
}

/**
 * Parst eine Decklänge-Angabe ("33,4 - 36,4" oder eine Einzelzahl) in
 * einen {min, max}-Bereich in cm.
 */
function parseDecklaengeRange(decklaenge_cm) {
    if (typeof decklaenge_cm === 'number') return { min: decklaenge_cm, max: decklaenge_cm };
    if (typeof decklaenge_cm === 'string') {
        const parts = decklaenge_cm.split('-').map(s => parseFloat(s.replace(',', '.').trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return { min: parts[0], max: parts[1] };
        }
        const single = parseFloat(decklaenge_cm.replace(',', '.'));
        if (!isNaN(single)) return { min: single, max: single };
    }
    return null;
}

/**
 * Speichert die Auswahl und schließt das Modal.
 * @param {string} materialName
 * @param {number} sketchIdx - Die Skizze, der das Material zugewiesen wird.
 */
export function selectMainTile(materialName, sketchIdx) {
    const found = getSelectableMainTiles().find(t => t.material === materialName);
    let selected = found ? JSON.parse(JSON.stringify(found)) : null;
    if (!selected || sketchIdx === undefined || !dataState.savedSketches[sketchIdx]) return;

    if (selected.material === "Alternative") {
        const flaecheFaktor = prompt(`Faktor für Fläche (Stk/m²):`, "12.5");
        const firstFaktor = prompt(`Faktor für First/Grat (Stk/m):`, "3");
        const ortgangLinksFaktor = prompt(`Faktor für Ortgang (links) (Stk/m):`, "3");
        const ortgangRechtsFaktor = prompt(`Faktor für Ortgang (rechts) (Stk/m):`, "3");

        selected.faktor = parseFloat(flaecheFaktor) || 12.5;
        
        if (selected.relatedFactors.First) {
            selected.relatedFactors.First.faktor = parseFloat(firstFaktor) || 3;
        }
        if (selected.relatedFactors.Grat) {
            selected.relatedFactors.Grat.faktor = parseFloat(firstFaktor) || 3; 
        }
        if (selected.relatedFactors["Ortgang (links)"]) {
            selected.relatedFactors["Ortgang (links)"].faktor = parseFloat(ortgangLinksFaktor) || 3;
        }
        if (selected.relatedFactors["Ortgang (rechts)"]) {
            selected.relatedFactors["Ortgang (rechts)"].faktor = parseFloat(ortgangRechtsFaktor) || 3;
        }
    }
    // Hinweis: Der frühere Dialog zur manuellen Lattenabstand-Auswahl wurde
    // entfernt, da die Reihen-Berechnung (siehe createMaterialBlock) jetzt
    // immer entweder das recherchierte trauflattmass_cm oder die feste
    // Annahme (34cm) nutzt - eine manuelle Eingabe hatte hier keinen Effekt
    // mehr auf das Ergebnis.
    
    dataState.savedSketches[sketchIdx].material = selected;
    document.getElementById('tile-choice-modal').style.display = 'none';
    renderSkizzenList();
    renderMaterialPage(); 
}

// --- Dämmung-Auswahl (pro Skizze, Einzelauswahl) ---

/**
 * Öffnet das Dämmung-Auswahl-Modal für eine bestimmte Skizze.
 * @param {number} sketchIdx
 */
export function openDaemmungChoiceModal(sketchIdx) {
    const container = document.getElementById('daemmung-item-buttons');
    container.innerHTML = "";
    const daemmungOptions = getSelectableMainTiles().filter(t => t.category === 'Dämmung');

    daemmungOptions.forEach((mat) => {
        const btn = document.createElement('button');
        btn.textContent = mat.material;
        btn.style.display = 'block';
        btn.style.width = '100%';
        btn.style.marginBottom = '6px';
        btn.onclick = () => selectDaemmung(mat.material, sketchIdx);
        container.appendChild(btn);
    });
    if (daemmungOptions.length === 0) {
        const hint = document.createElement('p');
        hint.style.color = '#888';
        hint.textContent = 'Keine Dämmung in der Materialdatenbank hinterlegt. Unter "Materialien verwalten" mit Kategorie "Dämmung" hinzufügen.';
        container.appendChild(hint);
    }
    if (dataState.savedSketches[sketchIdx]?.daemmung) {
        const resetBtn = document.createElement('button');
        resetBtn.textContent = '✖ Dämmung entfernen';
        resetBtn.style.cssText = 'display:block; width:100%; margin-top:10px; color:#555;';
        resetBtn.onclick = () => {
            dataState.savedSketches[sketchIdx].daemmung = null;
            document.getElementById('daemmung-choice-modal').style.display = 'none';
            renderMaterialPage();
        };
        container.appendChild(resetBtn);
    }
    document.getElementById('daemmung-choice-modal').style.display = 'block';
}

/**
 * Weist einer Skizze eine Dämmung zu.
 */
export function selectDaemmung(materialName, sketchIdx) {
    const found = getSelectableMainTiles().find(t => t.material === materialName && t.category === 'Dämmung');
    if (!found || sketchIdx === undefined || !dataState.savedSketches[sketchIdx]) return;
    dataState.savedSketches[sketchIdx].daemmung = JSON.parse(JSON.stringify(found));
    document.getElementById('daemmung-choice-modal').style.display = 'none';
    renderMaterialPage();
}

// --- Metall-Auswahl (pro Skizze, Mehrfachauswahl) ---

let metallModalSketchIdx = null;
let metallModalPendingSelection = new Set();

/**
 * Öffnet das Metall-Auswahl-Modal (Checkboxen, Mehrfachauswahl) für eine
 * bestimmte Skizze.
 * @param {number} sketchIdx
 */
export function openMetallChoiceModal(sketchIdx) {
    metallModalSketchIdx = sketchIdx;
    const sketch = dataState.savedSketches[sketchIdx];
    const alreadySelected = new Set((sketch?.metallItems || []).map(m => m.material));
    metallModalPendingSelection = new Set(alreadySelected);

    const container = document.getElementById('metall-item-checkboxes');
    container.innerHTML = "";
    const metallOptions = getSelectableMainTiles().filter(t => t.category === 'Metall');

    metallOptions.forEach((mat) => {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex; align-items:center; gap:8px; margin-bottom:8px; cursor:pointer;';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = alreadySelected.has(mat.material);
        cb.onchange = () => {
            if (cb.checked) metallModalPendingSelection.add(mat.material);
            else metallModalPendingSelection.delete(mat.material);
        };
        row.appendChild(cb);
        const label = document.createElement('span');
        label.textContent = `${mat.material} (${mat.faktor} ${mat.einheit}${mat.einheit === 'm' || mat.einheit === 'm²' ? '/m²' : ''})`;
        row.appendChild(label);
        container.appendChild(row);
    });
    if (metallOptions.length === 0) {
        const hint = document.createElement('p');
        hint.style.color = '#888';
        hint.textContent = 'Kein Metall-Material in der Materialdatenbank hinterlegt. Unter "Materialien verwalten" mit Kategorie "Metall" hinzufügen.';
        container.appendChild(hint);
    }
    document.getElementById('metall-choice-modal').style.display = 'block';
}

/**
 * Übernimmt die im Metall-Modal angehakten Positionen für die Skizze.
 */
export function applyMetallChoice() {
    if (metallModalSketchIdx === null || !dataState.savedSketches[metallModalSketchIdx]) {
        document.getElementById('metall-choice-modal').style.display = 'none';
        return;
    }
    const metallOptions = getSelectableMainTiles().filter(t => t.category === 'Metall');
    const selectedMaterials = metallOptions
        .filter(mat => metallModalPendingSelection.has(mat.material))
        .map(mat => JSON.parse(JSON.stringify(mat)));

    dataState.savedSketches[metallModalSketchIdx].metallItems = selectedMaterials;
    document.getElementById('metall-choice-modal').style.display = 'none';
    metallModalSketchIdx = null;
    renderMaterialPage();
}

export function cancelMetallChoice() {
    document.getElementById('metall-choice-modal').style.display = 'none';
    metallModalSketchIdx = null;
}

// --- Bitumen/EPDM-Lagen-Auswahl (pro Skizze, Mehrfachauswahl) ---

let eindeckungLayersModalSketchIdx = null;
let eindeckungLayersModalPendingSelection = new Set();

/**
 * Öffnet das Bitumen/EPDM-Lagen-Auswahl-Modal (Checkboxen, Mehrfachauswahl)
 * für eine bestimmte Skizze. Mehrere Lagen (z.B. Dampfsperre + 2 Bahnen)
 * können gleichzeitig gewählt werden, da ein Flachdachaufbau i.d.R. aus
 * mehreren übereinanderliegenden Lagen besteht.
 * @param {number} sketchIdx
 */
export function openEindeckungLayersModal(sketchIdx) {
    eindeckungLayersModalSketchIdx = sketchIdx;
    const sketch = dataState.savedSketches[sketchIdx];
    const alreadySelected = new Set((sketch?.eindeckungLayers || []).map(m => m.material));
    eindeckungLayersModalPendingSelection = new Set(alreadySelected);

    const container = document.getElementById('eindeckung-layers-checkboxes');
    container.innerHTML = "";
    const layerOptions = getSelectableMainTiles().filter(t => t.category === 'Ziegel' && t.eindeckungsart === 'Bitumen/EPDM');

    layerOptions.forEach((mat) => {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex; align-items:center; gap:8px; margin-bottom:8px; cursor:pointer;';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = alreadySelected.has(mat.material);
        cb.onchange = () => {
            if (cb.checked) eindeckungLayersModalPendingSelection.add(mat.material);
            else eindeckungLayersModalPendingSelection.delete(mat.material);
        };
        row.appendChild(cb);
        const label = document.createElement('span');
        label.textContent = `${mat.material} (${mat.faktor} ${mat.einheit}/m²)`;
        row.appendChild(label);
        container.appendChild(row);
    });
    if (layerOptions.length === 0) {
        const hint = document.createElement('p');
        hint.style.color = '#888';
        hint.textContent = 'Keine Bitumen/EPDM-Lagen in der Materialdatenbank hinterlegt.';
        container.appendChild(hint);
    }
    document.getElementById('eindeckung-layers-modal').style.display = 'block';
}

/**
 * Übernimmt die im Bitumen/EPDM-Modal angehakten Lagen für die Skizze.
 * Ersetzt eine ggf. vorhandene Ziegel/Zink-Zuweisung (sk.material), da eine
 * Skizze entweder eine einzelne Eindeckung ODER einen Lagenaufbau hat.
 */
export function applyEindeckungLayersChoice() {
    if (eindeckungLayersModalSketchIdx === null || !dataState.savedSketches[eindeckungLayersModalSketchIdx]) {
        document.getElementById('eindeckung-layers-modal').style.display = 'none';
        return;
    }
    const layerOptions = getSelectableMainTiles().filter(t => t.category === 'Ziegel' && t.eindeckungsart === 'Bitumen/EPDM');
    const selectedLayers = layerOptions
        .filter(mat => eindeckungLayersModalPendingSelection.has(mat.material))
        .map(mat => JSON.parse(JSON.stringify(mat)));

    const sketch = dataState.savedSketches[eindeckungLayersModalSketchIdx];
    sketch.eindeckungLayers = selectedLayers;
    sketch.material = null; // Lagenaufbau ersetzt eine einzelne Ziegel/Zink-Wahl
    document.getElementById('eindeckung-layers-modal').style.display = 'none';
    eindeckungLayersModalSketchIdx = null;
    renderSkizzenList();
    renderMaterialPage();
}

export function cancelEindeckungLayersChoice() {
    document.getElementById('eindeckung-layers-modal').style.display = 'none';
    eindeckungLayersModalSketchIdx = null;
}

/**
 * Wandelt einen klickbaren Skizzen-Namen in ein Input-Feld um.
 */
export function inlineEditSketchName(idx) {
    const sketch = dataState.savedSketches[idx];
    if (!sketch) return;

    const displayName = sketch.name;
    const container = document.getElementById(`sketch-name-display-${idx}`);
    if (!container || container.querySelector('input')) return; 

    const input = document.createElement('input');
    input.type = 'text';
    input.value = displayName;
    input.style.minHeight = "20px";
    input.style.fontSize = "15px";
    input.style.padding = "2px 4px";
    input.style.width = "200px"; 

    input.onblur = () => {
        const newName = input.value.trim();
        if (newName && newName !== displayName) {
            sketch.name = newName;
            const checkbox = container.parentElement.querySelector('.skizze-2d-checkbox');
            if(checkbox) {
                checkbox.dataset.sketchName = newName;
            }
        }
        renderSkizzenList(); 
    };

    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur(); 
        } else if (e.key === 'Escape') {
            e.preventDefault();
            renderSkizzenList();
        }
    };
    
    container.innerHTML = `${idx + 1}. `; 
    container.appendChild(input);
    
    input.focus();
    input.select();
    
    container.onclick = (e) => e.stopPropagation();
    input.onclick = (e) => e.stopPropagation();
}