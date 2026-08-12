// js/2D/2D_main.js

import { initZoomPan } from './controls.js';
import { initTopBar } from './uiTopBar.js';
import { initSidePanel } from './uiSidePanel.js';
import { initSnap } from './snap.js';
import { initJsonHandlers } from './jsonHandlers.js'; 
import { selectNode } from './selection.js';
import { renderActivePage, captureCurrentPage, switchPage, addEmptyPage, duplicateActivePage, deleteActivePage, renameActivePage, getPagesForUI, pagesState, getActivePage, setActivePageDachdaten } from './pages.js';
import { createDachCompass } from './compass.js';

// ##### HIER WIRD DER KREIS GEBROCHEN #####
import { initFigureModule } from './figure.js'; 
import { getActiveScale } from './state.js';   
import { stage, updateGrid } from './stage.js';
// Wir importieren die isMeasuring-Funktion hier zentral.
import { isMeasuring } from './measurement.js';

let is2DInitialized = false;

/**
 * Passt die Höhe des 2D-Grid-Containers dynamisch an den verfügbaren
 * Platz an, statt eine feste Höhe zu verwenden. Dadurch nutzt das
 * Grid automatisch den zusätzlichen Platz, der z.B. im iPad-Modus
 * durch das Einklappen der Toolbar frei wird.
 */
export function syncStageSize() {
    const container = document.getElementById('container');
    if (!container) return;

    const bottomGap = 16; // kleiner Abstand zum unteren Fensterrand
    const top = container.getBoundingClientRect().top;
    const newHeight = Math.max(300, window.innerHeight - top - bottomGap);

    container.style.height = newHeight + 'px';

    stage.width(container.clientWidth);
    stage.height(container.clientHeight);
    updateGrid(getActiveScale());
    stage.batchDraw();
}

function start2DApp() {
    if (is2DInitialized) {
        console.log("2D-App ist bereits initialisiert.");
        syncStageSize();
        return; 
    }
    console.log("Starte 2D-App zum ersten Mal...");

    syncStageSize();

    initZoomPan();
    initTopBar();
    initSidePanel();
    initSnap();
    
    // ##### HIER IST DIE ÄNDERUNG: Wir übergeben die isMeasuring-Funktion #####
    initFigureModule(selectNode, isMeasuring); 
    initJsonHandlers(selectNode); 

    // --- Pages UI init ---
    initPagesUI();

    // Render initial page (empty)
    renderActivePage();

    updateGrid(getActiveScale());

    // Reagiert auf Fenstergrößenänderungen (Rotation, Resize, ...)
    window.addEventListener('resize', syncStageSize);

    is2DInitialized = true;
}

function initPagesUI() {
    const selectEl = document.getElementById('page-select-2d');
    const addBtn = document.getElementById('page-add-2d');
    const dupBtn = document.getElementById('page-duplicate-2d');
    const delBtn = document.getElementById('page-delete-2d');
    const renBtn = document.getElementById('page-rename-2d');

    // PV-Summen-Seiten-Auswahl (für Aufmaßblatt)
    const pvSelectEl = document.getElementById('pv-page-select');

    // Dachneigung/-ausrichtung der aktiven Seite (für die Verschattungsberechnung, siehe shading.js)
    const neigungInput = document.getElementById('dachneigung-2d');
    const kompassContainer = document.getElementById('dachausrichtung-kompass');

    if (!selectEl) return;

    // Kompass-Widget statt Dropdown: Nadel per Maus/Finger auf die
    // Himmelsrichtung ziehen (oder Richtung direkt antippen), rastet auf
    // die 8 Himmelsrichtungen ein - schreibt direkt in die Seitendaten.
    const initialAusrichtung = Number.isFinite(getActivePage()?.dachausrichtung) ? getActivePage().dachausrichtung : 180;
    const dachKompass = kompassContainer
        ? createDachCompass(kompassContainer, initialAusrichtung, (deg) => {
              setActivePageDachdaten(undefined, deg);
          })
        : null;

    const refresh = () => {
        const pages = getPagesForUI();

        // Seiten-Dropdown
        selectEl.innerHTML = '';
        pages.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            if (p.id === pagesState.activePageId) opt.selected = true;
            selectEl.appendChild(opt);
        });

        // Dachneigung/-ausrichtung der aktiven Seite anzeigen
        const active = getActivePage();
        if (neigungInput) neigungInput.value = Number.isFinite(active?.dachneigung) ? active.dachneigung : 0;
        if (dachKompass) dachKompass.setValue(Number.isFinite(active?.dachausrichtung) ? active.dachausrichtung : 180);

        // PV-Dropdown
        if (pvSelectEl) {
            const current = (window.uiState && window.uiState.pvTotalsPageId) ? window.uiState.pvTotalsPageId : 'active';
            pvSelectEl.innerHTML = '';

            const optActive = document.createElement('option');
            optActive.value = 'active';
            optActive.textContent = 'Aktive 2D-Seite';
            if (current === 'active') optActive.selected = true;
            pvSelectEl.appendChild(optActive);

            pages.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                if (current === p.id) opt.selected = true;
                pvSelectEl.appendChild(opt);
            });
        }
    };

    refresh();

    pvSelectEl?.addEventListener('change', () => {
        if (!window.uiState) window.uiState = {};
        window.uiState.pvTotalsPageId = pvSelectEl.value;
        try { window.renderSkizzenList?.(); } catch (_) {}
    });

    selectEl.addEventListener('change', () => {
        switchPage(selectEl.value);
        refresh();
    });

    neigungInput?.addEventListener('input', () => {
        const v = parseFloat(neigungInput.value);
        setActivePageDachdaten(Number.isFinite(v) ? v : 0, undefined);
    });

    addBtn?.addEventListener('click', () => {
        addEmptyPage();
        refresh();
    });

    dupBtn?.addEventListener('click', () => {
        duplicateActivePage();
        refresh();
    });

    renBtn?.addEventListener('click', async () => {
        captureCurrentPage();
        const current = getPagesForUI().find(p => p.id === pagesState.activePageId);
        const newName = await window.showPrompt('Seite umbenennen', 'Neuer Name:', current?.name || 'Seite');
        if (newName === null) return;
        renameActivePage(newName);
        refresh();
    });

    delBtn?.addEventListener('click', async () => {
        const ok = await window.showConfirm('Seite löschen?', 'Soll die aktuelle Seite wirklich gelöscht werden?');
        if (!ok) return;
        const did = deleteActivePage();
        if (!did) {
            await window.showAlert('Nicht möglich', 'Mindestens eine Seite muss vorhanden sein.');
        }
        refresh();
    });
}

window.start2DApp = start2DApp;
window.loadDataInto2DApp = (arr) => {
    // Load incoming data into the ACTIVE page
    captureCurrentPage();
    const page = pagesState.pages.find(p => p.id === pagesState.activePageId);
    if (page) {
        page.objects = Array.isArray(arr) ? JSON.parse(JSON.stringify(arr)) : [];
        page.measurements = [];
    }
    renderActivePage();
};
window.get2DScale = getActiveScale;