// js/2D/uiTopBar.js

import { layer, stage, gridLayer, updateGrid } from './stage.js';
import {
    labelsVisible, setLabelsVisible,
    snapEnabled, setSnapEnabled,
    setActiveScale,
    gridVisible, setGridVisible,
    selectedNode, setSelectedNode, getUserData,
    lastPvModuleSize, setLastPvModuleSize, incrementPvCascadeCount,
    autoDimensionVisible, setAutoDimensionVisible
} from './state.js';

import { reDrawAllFigures, addPVModule, addWindow, addObstacle } from './figure.js';
import { nudgeSelectedNode, highlightNode } from './selection.js';
import { refreshAutoDimensions } from './autoDimension.js';

import {
    toggleMeasurementMode,
    initMeasurementModule,
    clearAllMeasurements
} from './measurement.js';

// --- Variablen deklarieren ---
let snapBtn, labelToggleBtn;
let gridBtn;
let autodimToggleBtn;
let scaleBtn25, scaleBtn50, scaleBtn100;
let allScaleBtns = [];
let addPvBtn;
let addPvRepeatBtn;
let addWindowBtn;
let addObstacleBtn;
let toggleBtn2D;
let controlsContainer2D;

let nudgeAmountInput, nudgeUpBtn, nudgeDownBtn, nudgeLeftBtn, nudgeRightBtn;

function updateLabelVisibility() {
    layer.find('.edgeLabel, .mainLabel').forEach(label => {
        label.visible(labelsVisible);
    });
    layer.batchDraw();
}

function updateScale(newScale) {
    
    clearAllMeasurements(); 

    let selectedObjectData = null;
    if (selectedNode) {
        selectedObjectData = getUserData(selectedNode);
        highlightNode(null, false); 
    }

    setActiveScale(newScale);

    allScaleBtns.forEach(btn => {
        if (btn && btn.id.includes(newScale.toString())) {
            btn.classList.add('active');
        } else if (btn) {
            btn.classList.remove('active');
        }
    });

    reDrawAllFigures();
    updateGrid(newScale);
    
    if (selectedObjectData) {
        let newSelectedNode = null;
        layer.getChildren().forEach(fig => {
            const figData = getUserData(fig);
            if (figData === selectedObjectData) { 
                newSelectedNode = fig;
            }
        });

        if (newSelectedNode) {
            setSelectedNode(newSelectedNode);
            highlightNode(newSelectedNode, true); 
        } else {
            setSelectedNode(null);
        }
    }
}

export function initTopBar() {
    
    snapBtn = document.getElementById("snap-toggle-btn");
    labelToggleBtn = document.getElementById("label-toggle-btn");
    gridBtn = document.getElementById("grid-toggle-btn");
    
    scaleBtn25 = document.getElementById("btn-scale-2d-25");
    scaleBtn50 = document.getElementById("btn-scale-2d-50");
    scaleBtn100 = document.getElementById("btn-scale-2d-100");
    allScaleBtns = [scaleBtn25, scaleBtn50, scaleBtn100];
    
    addPvBtn = document.getElementById("add-pv-btn");
    addPvRepeatBtn = document.getElementById("add-pv-repeat-btn");
    addWindowBtn = document.getElementById("add-window-btn");
    addObstacleBtn = document.getElementById("add-obstacle-btn");
    autodimToggleBtn = document.getElementById("autodim-toggle-btn");

    const measureBtn = document.getElementById("measure-btn");
    toggleBtn2D = document.getElementById("toggle-controls-btn-2d"); 
    controlsContainer2D = document.getElementById("buttons");

    nudgeAmountInput = document.getElementById("nudge-amount");
    nudgeUpBtn = document.getElementById("nudge-up");
    nudgeDownBtn = document.getElementById("nudge-down");
    nudgeLeftBtn = document.getElementById("nudge-left");
    nudgeRightBtn = document.getElementById("nudge-right");

    // --- Modal-Elemente für Fensterauswahl ---
    const windowModal = document.getElementById("window-2d-choice-modal");
    const closeWindowModalBtn = document.getElementById("close-window-2d-modal");
    const veluxBtns = document.querySelectorAll(".velux-btn");

    // --- NEU: Modal-Elemente für PV-Auswahl ---
    const pvModal = document.getElementById("pv-choice-modal");
    const closePvModalBtn = document.getElementById("close-pv-modal");
    const pvBtns = document.querySelectorAll(".pv-btn");

    if (snapBtn) {
        snapBtn.onclick = () => {
            setSnapEnabled(!snapEnabled); 
            snapBtn.textContent = snapEnabled ? "Snap: AN" : "Snap: AUS";
        };
    }
    
    if (labelToggleBtn) {
        labelToggleBtn.onclick = () => {
            setLabelsVisible(!labelsVisible); 
            labelToggleBtn.textContent = labelsVisible ? "Beschriftung: AN" : "Beschriftung: AUS";
            updateLabelVisibility();
        };
    }
    
    if (gridBtn) {
        gridBtn.onclick = () => {
            setGridVisible(!gridVisible);
            gridBtn.textContent = gridVisible ? "Grid: AN" : "Grid: AUS";
            gridLayer.visible(gridVisible);
            stage.batchDraw();
        };
    }

    // --- Autobemaßung: zeigt automatisch den Abstand jedes Objekts (PV-Modul,
    // Fenster, Hindernis) zur nächsten Dachkante sowie zum nächsten anderen
    // Objekt an (kein fester Mindestabstand - nur der gemessene IST-Wert).
    if (autodimToggleBtn) {
        autodimToggleBtn.onclick = () => {
            setAutoDimensionVisible(!autoDimensionVisible);
            autodimToggleBtn.textContent = autoDimensionVisible ? "📐 Autobemaßung: AN" : "📐 Autobemaßung: AUS";
            refreshAutoDimensions();
        };
    }

    if (measureBtn) {
        initMeasurementModule(measureBtn); 
        measureBtn.onclick = toggleMeasurementMode;
    }

    if (scaleBtn25) scaleBtn25.onclick = () => updateScale(25);
    if (scaleBtn50) scaleBtn50.onclick = () => updateScale(50);
    if (scaleBtn100) scaleBtn100.onclick = () => updateScale(100);

    // --- NEU: PV-Modal Logik ---
    if (addPvBtn && pvModal) {
        addPvBtn.onclick = () => {
            pvModal.style.display = 'block';
        };
    }

    if (closePvModalBtn && pvModal) {
        closePvModalBtn.onclick = () => {
            pvModal.style.display = 'none';
        };
    }

    pvBtns.forEach(btn => {
        btn.onclick = () => {
            const name = btn.getAttribute("data-name");
            const w = parseFloat(btn.getAttribute("data-w"));
            const h = parseFloat(btn.getAttribute("data-h"));
            
            addPVModule(name, w, h);
            pvModal.style.display = 'none';

            // Größe merken, damit der "+"-Button sie direkt duplizieren kann.
            setLastPvModuleSize({ name, w, h });
        };
    });

    if (addPvRepeatBtn) {
        addPvRepeatBtn.onclick = () => {
            if (!lastPvModuleSize) return;
            const count = incrementPvCascadeCount();
            addPVModule(lastPvModuleSize.name, lastPvModuleSize.w, lastPvModuleSize.h, count);
        };
    }

    // --- Fenster-Modal Logik ---
    if (addWindowBtn && windowModal) {
        addWindowBtn.onclick = () => {
            windowModal.style.display = 'block';
        };
    }

    if (closeWindowModalBtn && windowModal) {
        closeWindowModalBtn.onclick = () => {
            windowModal.style.display = 'none';
        };
    }

    veluxBtns.forEach(btn => {
        btn.onclick = () => {
            const name = btn.getAttribute("data-name");
            const w = parseFloat(btn.getAttribute("data-w"));
            const h = parseFloat(btn.getAttribute("data-h"));
            addWindow(name, w, h);
            windowModal.style.display = 'none';
        };
    });

    // --- Hindernis einfügen (z.B. Kamin, Lüfter, Dachflächenfenster ohne PV) ---
    // Wird als eigenes Objekt auf der 2D-Fläche platziert und nimmt danach wie
    // jedes andere Objekt an der Autobemaßung (Abstand zu Dachkante/Nachbarn) teil.
    if (addObstacleBtn) {
        addObstacleBtn.onclick = async () => {
            const name = await window.showPrompt("Hindernis einfügen", "Bezeichnung (z.B. Kamin, Lüfter, Antenne):", "Kamin");
            if (!name) return;
            const wStr = await window.showPrompt("Hindernis einfügen", "Breite in Metern:", "0.5");
            if (wStr === null || wStr === undefined || wStr === "") return;
            const hStr = await window.showPrompt("Hindernis einfügen", "Höhe/Tiefe in Metern:", "0.5");
            if (hStr === null || hStr === undefined || hStr === "") return;
            const w = parseFloat(String(wStr).replace(',', '.'));
            const h = parseFloat(String(hStr).replace(',', '.'));
            if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) {
                if (window.showAlert) window.showAlert("Ungültige Eingabe", "Bitte gültige Maße (in Metern) eingeben.");
                return;
            }
            addObstacle(name, w, h);
        };
    }

    if (toggleBtn2D && controlsContainer2D) {
        const isInitiallyHidden = controlsContainer2D.classList.contains('is-hidden');
        if (isInitiallyHidden) {
             toggleBtn2D.innerHTML = "🔽";
             toggleBtn2D.title = "2D-Steuerung einblenden";
        }

        toggleBtn2D.addEventListener('click', () => {
            const isHidden = controlsContainer2D.classList.toggle('is-hidden');
            if (isHidden) {
                toggleBtn2D.innerHTML = "🔽";
                toggleBtn2D.title = "2D-Steuerung einblenden";
            } else {
                toggleBtn2D.innerHTML = "🔼";
                toggleBtn2D.title = "2D-Steuerung einklappen";
            }
        });

        // Grid-Höhe anpassen, sobald sich die Höhe des Steuerungs-Panels
        // ändert (z.B. nach dem Ein-/Ausklappen) - über das dazugehörige
        // 'resize'-Event, auf das syncStageSize() bereits reagiert.
        controlsContainer2D.addEventListener('transitionend', () => {
            window.dispatchEvent(new Event('resize'));
        });
    }
    
    const getNudgeValue = () => {
        return parseFloat(nudgeAmountInput.value) || 0.1;
    };

    if (nudgeUpBtn) {
        nudgeUpBtn.onclick = () => {
            const val = getNudgeValue();
            nudgeSelectedNode(0, -val); 
        };
    }
    if (nudgeDownBtn) {
        nudgeDownBtn.onclick = () => {
            const val = getNudgeValue();
            nudgeSelectedNode(0, val); 
        };
    }
    if (nudgeLeftBtn) {
        nudgeLeftBtn.onclick = () => {
            const val = getNudgeValue();
            nudgeSelectedNode(-val, 0); 
        };
    }
    if (nudgeRightBtn) {
        nudgeRightBtn.onclick = () => {
            const val = getNudgeValue();
            nudgeSelectedNode(val, 0); 
        };
    }
}