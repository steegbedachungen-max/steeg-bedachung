// js/main.js

// --- IMPORTS (ALL AT THE TOP) ---
import { initRenderer, requestRedraw } from './canvasRenderer.js';
import { setupCanvasListeners } from './canvasInteraction.js';
import { setupUIListeners } from './uiControls.js';
import { updateCloseButton } from './sketchLogic.js';
import { loadSketch, deleteSketch, clearAllSketches, saveAndContinue, saveAndExit } from './sketchManager.js';
import { 
    renderSkizzenList, 
    setSketchInclusionMode, 
    toggleSegmentInTotals,
    renderMaterialPage,
    openTileChoiceModal,
    selectMainTile,
    cancelTileChoice,
    inlineEditSketchName,
    openDaemmungChoiceModal,
    selectDaemmung,
    cancelDaemmungChoice,
    openMetallChoiceModal,
    applyMetallChoice,
    cancelMetallChoice,
    openEindeckungLayersModal,
    applyEindeckungLayersChoice,
    cancelEindeckungLayersChoice
} from './aufmassManager.js';
import { 
    addAccessory, 
    selectAccessoryItem, 
    cancelAccessoryChoice,
    selectWindowType,
    cancelWindowChoice,
    selectWindowSizePrefix,
    cancelWindowSizePrefix,
    selectWindowSizeSuffix,
    cancelWindowSizeSuffix
} from './accessoryManager.js';
import { openCalculator, closeCalculator, calculatorInput, calculatorOperator, calculatorEquals, calculatorClear, useCalculatorResult } from './calculator.js';
import { importProjectDataTrigger, setupImportListener } from './importExportManager.js';
import { exportAufmassblattPDF } from './exportManager.js';
import { dataState, uiState, canvasState, labelState } from './state.js';
import { showPrompt, showConfirm, showAlert } from './dialogManager.js';
import './2D/2D_main.js'; // Load the 2D app logic
import { initMaterialDataManager, setOnDataChangedCallback } from './materialDataManager.js';
import { initNotizen } from './notizenManager.js'; // <-- NEU HINZUGEFÜGT
import { initProjectStartDialog } from './projectStartDialog.js';


// --- INIT ---
const canvas = document.getElementById('canvas');
if (!canvas) {
    console.error("FATAL: Canvas-Element nicht gefunden!");
    throw new Error("Canvas-Element konnte nicht im DOM gefunden werden.");
}
const ctx = canvas.getContext('2d');

canvasState.points = [{ x: 2, y: 2 }];

canvas.addEventListener('contextmenu', e => e.preventDefault());

// Listener erst nach kompletter DOM-Struktur setzen
// (damit neue Buttons wie #toggle-hilfspunkt sicher existieren)
document.addEventListener('DOMContentLoaded', () => {
    initRenderer(ctx);
    setupCanvasListeners(canvas);
    setupUIListeners();
    initMaterialDataManager();
    setOnDataChangedCallback(renderMaterialPage); // Connect the callback to re-render the material page
    updateCloseButton();
    requestRedraw();
    setupImportListener();
});

uiState.selectedMainTile = null;
labelState.initializeLabels();


// --- GLOBAL FUNCTIONS BRIDGE ---
window.loadSketch = loadSketch;
window.deleteSketch = deleteSketch;
window.clearAllSketches = clearAllSketches;
window.saveAndContinue = saveAndContinue;
window.saveAndExit = saveAndExit;
window.renderSkizzenList = renderSkizzenList;

// State-Bridge (für 2D->Aufmaß-Optionen wie PV-Summen-Seite)
window.uiState = uiState;

window.setSketchInclusionMode = setSketchInclusionMode;
window.toggleSegmentInTotals = toggleSegmentInTotals;
window.renderMaterialPage = renderMaterialPage;
window.addAccessory = addAccessory;
window.selectAccessoryItem = selectAccessoryItem;
window.cancelAccessoryChoice = cancelAccessoryChoice;
window.selectWindowType = selectWindowType;
window.cancelWindowChoice = cancelWindowChoice;
window.selectWindowSizePrefix = selectWindowSizePrefix;
window.cancelWindowSizePrefix = cancelWindowSizePrefix;
window.selectWindowSizeSuffix = selectWindowSizeSuffix;
window.cancelWindowSizeSuffix = cancelWindowSizeSuffix;
window.openTileChoiceModal = openTileChoiceModal;
window.selectMainTile = selectMainTile;
window.openDaemmungChoiceModal = openDaemmungChoiceModal;
window.selectDaemmung = selectDaemmung;
window.cancelDaemmungChoice = cancelDaemmungChoice;
window.openMetallChoiceModal = openMetallChoiceModal;
window.applyMetallChoice = applyMetallChoice;
window.cancelMetallChoice = cancelMetallChoice;
window.openEindeckungLayersModal = openEindeckungLayersModal;
window.applyEindeckungLayersChoice = applyEindeckungLayersChoice;
window.cancelEindeckungLayersChoice = cancelEindeckungLayersChoice;
window.cancelTileChoice = cancelTileChoice;
window.openCalculator = openCalculator;
window.closeCalculator = closeCalculator;
window.calculatorInput = calculatorInput;
window.calculatorOperator = calculatorOperator;
window.calculatorEquals = calculatorEquals;
window.calculatorClear = calculatorClear;
window.useCalculatorResult = useCalculatorResult;
window.importProjectDataTrigger = importProjectDataTrigger;
window.exportAufmassblattPDF = exportAufmassblattPDF;
window.inlineEditSketchName = inlineEditSketchName;
window.showPrompt = showPrompt;
window.showConfirm = showConfirm;
window.showAlert = showAlert;

console.log("Anwendung modular initialisiert. Alle Funktionen verbunden.");


// --- TAB-NAVIGATION & UI LOGIK ---
document.addEventListener('DOMContentLoaded', () => {
    
    // Projektfelder beim Start leeren (verhindert Browser-Autofill)
    ['projekt-bauvorhaben', 'projekt-name', 'projekt-anschrift', 'projekt-telefon', 'projekt-email'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // Gezielte Abfrage der Projektdaten beim Programmstart
    initProjectStartDialog();

    // Initialisiere das Notizen-Whiteboard
    initNotizen(); 

    const tabSkizze = document.getElementById('tab-skizze');
    const tabBlatt = document.getElementById('tab-blatt');
    const tabMaterial = document.getElementById('tab-material');
    const tab2D = document.getElementById('tab-2d');
    const tabNotizen = document.getElementById('tab-notizen'); 

    const viewSkizze = document.getElementById('skizze');
    const viewBlatt = document.getElementById('aufmassblatt');
    const viewMaterial = document.getElementById('materialbedarf');
    const view2D = document.getElementById('view-2d');
    const viewNotizen = document.getElementById('notizen'); 

    const skizzeControls = document.querySelector('.fixed-controls-wrapper');
    const controlsContainer = skizzeControls ? skizzeControls.querySelector('.controls-container') : null;
    const toggleBtn = skizzeControls ? skizzeControls.querySelector('#toggle-controls-btn') : null;

    const allTabs = [tabSkizze, tabBlatt, tabMaterial, tab2D, tabNotizen]; 
    const allViews = [viewSkizze, viewBlatt, viewMaterial, view2D, viewNotizen]; 

    function switchTab(activeTab, activeView) {
        allViews.forEach(view => {
            if (view) view.style.display = 'none';
        });
        allTabs.forEach(tab => {
            if (tab) tab.classList.remove('active');
        });
        
        if (activeView) {
            // Notizen brauchen display: block (oder flex, aber block ist sicherer für Konva)
            activeView.style.display = (activeView === viewNotizen) ? 'block' : 'flex';
        }
        if (activeTab) activeTab.classList.add('active');

        if (activeTab === tabSkizze) {
            if (skizzeControls) skizzeControls.style.display = 'flex';
            document.body.classList.remove('toolbox-hidden');
            requestRedraw();
            updateCloseButton();
        } else {
            if (skizzeControls) skizzeControls.style.display = 'none';
            const distWinkelPanel = document.getElementById('dist-winkel-panel');
            if (distWinkelPanel) distWinkelPanel.style.display = 'none';
            const editPanel = document.getElementById('edit-panel');
            if (editPanel) editPanel.style.display = 'none';
            
            document.body.classList.add('toolbox-hidden');
            
            if (controlsContainer && !controlsContainer.classList.contains('is-hidden')) {
                const skizzeElement = document.getElementById('skizze');
                
                controlsContainer.classList.add('is-hidden');
                document.body.classList.add('controls-hidden');
                if (skizzeElement) skizzeElement.classList.add('controls-hidden');
                
                if (toggleBtn) {
                    toggleBtn.innerHTML = "🔽";
                    toggleBtn.title = "Steuerung einblenden";
                }
            }
            
            if (activeTab === tabBlatt) {
                renderSkizzenList();
            } else if (activeTab === tabMaterial) {
                renderMaterialPage();
            } else if (activeTab === tab2D) {
                const display = document.getElementById('scale-display-2d');
                if (display) {
                    const current2DScale = window.get2DScale ? window.get2DScale() : 100;
                    display.textContent = `Maßstab: ${current2DScale} px/m`;
                }
            }
        }
    }

    if (tabSkizze) tabSkizze.onclick = () => switchTab(tabSkizze, viewSkizze);
    if (tabBlatt) tabBlatt.onclick = () => switchTab(tabBlatt, viewBlatt);
    if (tabMaterial) tabMaterial.onclick = () => switchTab(tabMaterial, viewMaterial);
    if (tabNotizen) tabNotizen.onclick = () => switchTab(tabNotizen, viewNotizen); 
    
    if (tab2D && view2D) {
        tab2D.onclick = () => {
            switchTab(tab2D, view2D);
            if (typeof window.start2DApp === 'function') {
                window.start2DApp();
            }
        };
    }

    if (tabSkizze && tabSkizze.classList.contains('active')) {
        if (skizzeControls) skizzeControls.style.display = 'flex';
        document.body.classList.remove('toolbox-hidden');
    } else {
        if (skizzeControls) skizzeControls.style.display = 'none';
        document.body.classList.add('toolbox-hidden');
    }
    
    const transferBtn = document.getElementById('btn-transfer-selected-to-2d');
    if (transferBtn) {
        transferBtn.addEventListener('click', transferSelectedSketchesTo2D);
    }

    const mainToolbarToggleBtn = document.getElementById('main-toolbar-toggle-btn');
    const mainToolbar = document.querySelector('.main-toolbar');
    
    if (mainToolbarToggleBtn && mainToolbar) {
        mainToolbarToggleBtn.addEventListener('click', () => {
            const isCollapsed = mainToolbar.classList.toggle('is-collapsed');
            document.body.classList.toggle('main-toolbar-collapsed');
            
            if (isCollapsed) {
                mainToolbarToggleBtn.innerHTML = "🔽";
                mainToolbarToggleBtn.title = "Hauptleiste einblenden";
            } else {
                mainToolbarToggleBtn.innerHTML = "🔼";
                mainToolbarToggleBtn.title = "Hauptleiste einklappen";
            }
        });
    }

    // ==========================================
    // NEU: Dynamischer Abstand zur fixierten Toolbar
    // ------------------------------------------
    // Die Toolbar (.main-toolbar) ist "position: fixed" und liegt über dem
    // Seiteninhalt. Damit sie den Inhalt nicht verdeckt, reserviert der
    // <body> per padding-top Platz dafür. Bisher waren das feste Pixel-Werte
    // pro Modus (Desktop/iPad, Steuerung ein/aus, ...). Das bricht, sobald
    // die Toolbar durch Zeilenumbrüche (z.B. in der schmalen iPad-Ansicht)
    // höher wird als der reservierte Platz - dann liegt die Toolbar über
    // dem Inhalt und verdeckt z.B. den Ausklapp-Pfeil im 2D-Tab.
    // Stattdessen messen wir hier die tatsächliche Höhe und setzen den
    // Abstand live per Inline-Style (das überschreibt automatisch alle
    // CSS-Regeln mit festen Werten, egal welcher Modus gerade aktiv ist).
    // ==========================================
    function syncFixedToolbarOffset() {
        if (!mainToolbar) return;
        const toolbarHeight = mainToolbar.offsetHeight;
        const gap = 12;

        let wrapperHeight = 0;
        if (skizzeControls) {
            // Skizze-Steuerung direkt unterhalb der echten Toolbar-Höhe andocken
            skizzeControls.style.top = toolbarHeight + 'px';

            const isVisible = getComputedStyle(skizzeControls).display !== 'none';
            if (isVisible) {
                wrapperHeight = skizzeControls.offsetHeight;
            }
        }

        document.body.style.paddingTop = (toolbarHeight + wrapperHeight + gap) + 'px';
    }

    if (mainToolbar) {
        const toolbarResizeObserver = new ResizeObserver(() => syncFixedToolbarOffset());
        toolbarResizeObserver.observe(mainToolbar);
        if (skizzeControls) toolbarResizeObserver.observe(skizzeControls);
        window.addEventListener('resize', syncFixedToolbarOffset);
        window.addEventListener('orientationchange', syncFixedToolbarOffset);

        // Initial berechnen (u.a. für den ersten Render) - MUSS vor der
        // Grid/Canvas-Höhenberechnung weiter unten laufen, da diese den
        // fertigen Abstand als Ausgangspunkt (container-Position) braucht.
        syncFixedToolbarOffset();
    }

    // ==========================================
    // NEU: Grid/Canvas-Bereiche füllen den frei gewordenen Platz
    // ------------------------------------------
    // Bisher hatten das 2D-Grid (#container) und die Skizzen-Zeichenfläche
    // eine feste Höhe. Klappt man z.B. im iPad-Modus die Toolbar ein, blieb
    // der zusätzliche Platz ungenutzt. Diese Funktion misst den tatsächlich
    // verfügbaren Platz und passt die Zeichenfläche der Skizze entsprechend
    // an. Das 2D-Grid wird analog in 2D_main.js (syncStageSize) behandelt.
    //
    // WICHTIG: Läuft erst NACH syncFixedToolbarOffset(), damit die Position
    // des Canvas-Containers (abhängig vom Toolbar-Abstand) bereits final
    // korrekt ist, wenn wir seine verfügbare Höhe messen. Sonst wird die
    // Höhe beim allerersten Laden auf Basis eines falschen (zu geringen)
    // Abstands berechnet und der Startpunkt der Skizze landet oberhalb des
    // sichtbaren Bereichs.
    // ==========================================
    function syncSkizzeCanvasHeight() {
        const wrapper = document.querySelector('.canvas-container');
        if (!wrapper) return;
        const bottomGap = 16;
        const top = wrapper.getBoundingClientRect().top;
        const newHeight = Math.max(300, window.innerHeight - top - bottomGap);
        wrapper.style.height = newHeight + 'px';
        requestRedraw();
    }

    // Sobald die Toolbar fertig ein-/ausgeklappt ist (padding-top-Übergang
    // beendet), Grid/Canvas neu einpassen. Das deckt alle Auslöser zentral
    // ab: iPad/Desktop-Umschaltung, Hauptleiste ein-/ausklappen, Tab-Wechsel.
    document.body.addEventListener('transitionend', (e) => {
        if (e.propertyName === 'padding-top') {
            syncSkizzeCanvasHeight();
            window.dispatchEvent(new Event('resize'));
        }
    });

    // Initial einmal berechnen
    syncSkizzeCanvasHeight();

    // ==========================================
    // NEU: Pfeiltasten (Panel-Buttons & Hardware-Tastatur) aktivieren
    // ==========================================
    const directionButtons = {
        'btn-dir-up': 0,       // Hoch
        'btn-dir-right': 90,   // Rechts
        'btn-dir-down': 180,   // Runter
        'btn-dir-left': 270    // Links
    };

    // Zentrale Funktion: Setzt den Winkel und drückt den Button
    function triggerDrawWithAngle(angle) {
        const angleInput = document.getElementById('angle');
        const distInput = document.getElementById('distance');
        const addPointBtn = document.getElementById('btn-add-point');

        if (!angleInput || !distInput || !addPointBtn) return;

        // 1. Winkel eintragen und dem System ein echtes Tipp-Event vorgaukeln
        angleInput.value = angle;
        angleInput.dispatchEvent(new Event('input', { bubbles: true }));
        angleInput.dispatchEvent(new Event('change', { bubbles: true }));

        // 2. Prüfen, ob eine Distanz eingetragen wurde (auch Kommas in Punkte umwandeln)
        const distVal = parseFloat(distInput.value.replace(',', '.'));
        
        if (!isNaN(distVal) && distVal > 0) {
            // Ein winziger Moment Pause, damit das System den Winkel sicher verdaut hat
            setTimeout(() => {
                addPointBtn.click();
                
                // Danach das Distanz-Feld direkt für den nächsten Punkt leeren
                distInput.value = "";
                distInput.dispatchEvent(new Event('input', { bubbles: true }));
                distInput.focus();
            }, 10);
        }
    }

    // Funktion 1: Klick auf die HTML-Buttons im Panel
    for (const [id, angle] of Object.entries(directionButtons)) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); // Verhindert ungewolltes Neuladen
                triggerDrawWithAngle(angle);
            });
        }
    }

    // Funktion 2: Echte Pfeiltasten auf der Tastatur nutzen!
    const distInput = document.getElementById('distance');
    if (distInput) {
        distInput.addEventListener('keydown', (e) => {
            let targetAngle = null;
            if (e.key === 'ArrowUp') targetAngle = 0;
            if (e.key === 'ArrowRight') targetAngle = 90;
            if (e.key === 'ArrowDown') targetAngle = 180;
            if (e.key === 'ArrowLeft') targetAngle = 270;

            if (targetAngle !== null) {
                e.preventDefault(); // Verhindert, dass die Pfeiltaste die Zahl im Feld verändert
                triggerDrawWithAngle(targetAngle);
            }
        });
    }
});


// --- SKETCH TRANSFER TO 2D ---
function transferSelectedSketchesTo2D() {
    console.log("Übertrage ausgewählte Skizzen...");
    
    const checkoxes = document.querySelectorAll('.skizze-2d-checkbox:checked');
    if (checkoxes.length === 0) {
        window.showAlert("Keine Auswahl", "Bitte wähle zuerst eine oder mehrere Skizzen aus, die übertragen werden sollen.");
        return;
    }

    const allFigurData = [];

    // WICHTIG: nicht per Name suchen (Namen koennen identisch sein wie "Dach"),
    // sonst wird bei mehreren Skizzen ggf. immer die erste gefunden.
    // Wir nutzen stattdessen den Index aus data-sketch-idx.
    checkoxes.forEach(box => {
        const idxStr = box.dataset.sketchIdx;
        const idx = parseInt(idxStr, 10);
        if (!Number.isFinite(idx) || idx < 0 || idx >= dataState.savedSketches.length) {
            console.warn('Ungültiger Sketch-Index für 2D-Transfer:', idxStr);
            return;
        }

        const aufmassSketch = dataState.savedSketches[idx];
        if (!aufmassSketch || !aufmassSketch.points || !aufmassSketch.points.length) {
            console.warn(`Skizze #${idx} nicht gefunden oder leer.`);
            return;
        }

        const figurObjekt = translateAufmassTo2D(aufmassSketch);
        if (figurObjekt) allFigurData.push(figurObjekt);
    });

    if (allFigurData.length === 0) {
        window.showAlert("Fehler", "Die ausgewählten Skizzen konnten nicht verarbeitet werden.");
        return;
    }

    console.log(`Sende ${allFigurData.length} Skizzen an 2D-App...`, allFigurData);

    if (typeof window.start2DApp === 'function') {
        window.start2DApp();
    }

    if (typeof window.loadDataInto2DApp === 'function') {
        try {
            window.loadDataInto2DApp(allFigurData);
        } catch (error) {
            console.error("Fehler beim Laden der Daten in 2D-App:", error);
            window.showAlert("Fehler bei 2D-Übertragung", "Fehler beim Übertragen: " + error.message);
            return;
        }
    } else {
        console.error("2D-App Ladefunktion (loadDataInto2DApp) nicht gefunden.");
        window.showAlert("Fehler", "2D-App ist nicht bereit, Daten zu empfangen.");
        return;
    }

    const tab2D = document.getElementById('tab-2d');
    if (tab2D) {
        tab2D.click();
    }
}

function translateAufmassTo2D(aufmassSketch) {
    console.log("Übersetze Aufmaß-Skizze (in METER):", aufmassSketch);

    const meterPoints = aufmassSketch.points;
    
    const konvaLabels = [];
    const realLengths = [];
    
    for (let i = 0; i < aufmassSketch.points.length - 1; i++) {
        const p1 = aufmassSketch.points[i];
        const p2 = aufmassSketch.points[i + 1];

        const realLength = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        
        konvaLabels[i] = realLength.toFixed(2) + ' m';
        realLengths[i] = realLength;
    }

    const figurObjekt = {
        name: aufmassSketch.name,
        pointsInMeters: meterPoints,
        realLengths: realLengths,
        labels: konvaLabels,
        x: null,
        y: null,
        fill: "#E0F0FF",
        stroke: "black"
    };
    
    return figurObjekt;
}