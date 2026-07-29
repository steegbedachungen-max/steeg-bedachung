// js/uiControls.js

import { 
    addPointByInput, addPointByOffsetXY, undo, closePolygon, newSketch, 
    applyEdit, cancelEdit, deleteSegment, setScale,
    updateCloseButton 
} from './sketchLogic.js';
import { saveAndContinue, saveAndExit } from './sketchManager.js';

import { 
    setMaterialFilter,
    applyMetallChoice,
    cancelMetallChoice,
    applyEindeckungLayersChoice,
    cancelEindeckungLayersChoice,
    cancelTileChoice,
    cancelDaemmungChoice
} from './aufmassManager.js';

import {
    openCalculator, closeCalculator, calculatorInput,
    calculatorOperator, calculatorEquals, calculatorClear, useCalculatorResult,
    toggleCalculator
} from './calculator.js';
import { importProjectDataTrigger } from './importExportManager.js';
import { exportAufmassblattPDF } from './exportManager.js';
import { connectGoogleDrive, isGoogleDriveConnected } from './googleDriveManager.js';
import { uiState, canvasState } from './state.js'; 

// ########## DRAG-FUNKTION ##########
function makePanelDraggable(panel, handle) {
    let isDragging = false;
    let offsetX, offsetY;

    function getEventCoords(e) {
        if (e.touches && e.touches.length > 0) {
            return e.touches[0];
        }
        return e;
    }

    function onDragStart(e) {
        if (e.type === 'mousedown' && e.button !== 0) return;
        
        isDragging = true;
        panel.classList.add('dragging'); 

        const rect = panel.getBoundingClientRect();
        panel.style.left = rect.left + 'px';
        panel.style.top = rect.top + 'px';
        panel.style.transform = 'none'; 

        const coords = getEventCoords(e);
        offsetX = coords.clientX - rect.left;
        offsetY = coords.clientY - rect.top;
        
        e.preventDefault(); 
    }

    function onDragMove(e) {
        if (!isDragging) return;
        
        e.preventDefault(); 

        const coords = getEventCoords(e);
        const newLeft = coords.clientX - offsetX;
        const newTop = coords.clientY - offsetY;

        panel.style.left = newLeft + 'px';
        panel.style.top = newTop + 'px';
    }

    function onDragEnd() {
        isDragging = false;
        panel.classList.remove('dragging');
    }

    handle.addEventListener('mousedown', onDragStart);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);

    handle.addEventListener('touchstart', onDragStart, { passive: false });
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
}

// ########## LOGO-UPLOAD FUNKTION ##########
function setupLogoUploader() {
    const input = document.getElementById('logo-upload-input');
    const imgPdf = document.getElementById('logo-for-pdf');
    const imgPreview = document.getElementById('logo-preview');

    const savedLogo = localStorage.getItem('customCompanyLogo');
    if (savedLogo) {
        if (imgPdf) imgPdf.src = savedLogo;
        if (imgPreview) imgPreview.src = savedLogo;
    }

    if (input) {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                const result = evt.target.result;
                if (imgPdf) imgPdf.src = result;
                if (imgPreview) imgPreview.src = result;
                try {
                    localStorage.setItem('customCompanyLogo', result);
                } catch (err) {
                    console.warn("Logo zu groß für LocalStorage.");
                }
            };
            reader.readAsDataURL(file);
        });
    }
}

// HILFSFUNKTION 1: Zeichnen (mit Auto-Ausführung)
function setAbsoluteAngle(angle) {
    const angleInput = document.getElementById('angle');
    if (!angleInput) return;

    angleInput.value = angle;
    angleInput.dispatchEvent(new Event('input')); 
    
    // Sofort ausführen
    addPointByInput();

    const distInput = document.getElementById('distance');
    if (distInput) {
        distInput.focus();
        distInput.select(); 
    }
}

// HILFSFUNKTION 2: Lock umschalten (FUNKTIONAL)
// Jetzt mit inputId: Wenn gesperrt, wird das Input-Feld disabled!
function toggleLock(btn, inputId) {
    const input = document.getElementById(inputId);
    const isLocked = btn.classList.contains('locked');
    
    if (isLocked) {
        // Entsperren
        btn.classList.remove('locked');
        btn.innerHTML = '🔓';
        if (input) input.disabled = false;
    } else {
        // Sperren
        btn.classList.add('locked');
        btn.innerHTML = '🔒';
        if (input) input.disabled = true;
    }
}


export function setupUIListeners() {
    
    // --- ANSICHT-UMSCHALTER: Desktop / iPad mini 6 (Hochformat) ---
    const btnViewDesktop = document.getElementById('btn-view-desktop');
    const btnViewIpad = document.getElementById('btn-view-ipad');

    // Setzt den Ein-/Ausklapp-Zustand der Hauptleiste (Projektfelder + Tabs)
    // über den bereits vorhandenen ersten Pfeil-Button (#main-toolbar-toggle-btn).
    function setMainToolbarCollapsed(collapsed) {
        const mainToolbar = document.querySelector('.main-toolbar');
        const toggleBtn = document.getElementById('main-toolbar-toggle-btn');
        if (!mainToolbar) return;

        mainToolbar.classList.toggle('is-collapsed', collapsed);
        document.body.classList.toggle('main-toolbar-collapsed', collapsed);

        if (toggleBtn) {
            toggleBtn.innerHTML = collapsed ? "🔽" : "🔼";
            toggleBtn.title = collapsed ? "Hauptleiste einblenden" : "Hauptleiste einklappen";
        }
        // Hinweis: Der ResizeObserver in main.js reagiert automatisch auf die
        // geänderte Höhe der .main-toolbar und passt den reservierten Platz
        // (body padding-top) neu an.
    }

    function setViewMode(mode) {
        const isIpad = mode === 'ipad';
        document.body.classList.toggle('view-ipad', isIpad);

        if (btnViewDesktop) {
            btnViewDesktop.classList.toggle('active', !isIpad);
            btnViewDesktop.setAttribute('aria-pressed', String(!isIpad));
        }
        if (btnViewIpad) {
            btnViewIpad.classList.toggle('active', isIpad);
            btnViewIpad.setAttribute('aria-pressed', String(isIpad));
        }

        // Standardzustand je nach Modus: Desktop = offen, iPad = zu.
        // Der vorhandene Pfeil-Button bleibt danach frei bedienbar.
        setMainToolbarCollapsed(isIpad);

        try { localStorage.setItem('preferredViewMode', mode); } catch (e) {}

        // Canvas/Stage auf neue Breite anpassen
        window.dispatchEvent(new Event('resize'));
    }

    btnViewDesktop?.addEventListener('click', () => setViewMode('desktop'));
    btnViewIpad?.addEventListener('click', () => setViewMode('ipad'));

    // Gespeicherte Auswahl wiederherstellen (Standard: Desktop)
    let savedView = 'desktop';
    try { savedView = localStorage.getItem('preferredViewMode') || 'desktop'; } catch (e) {}
    setViewMode(savedView);

    // Toggle-Button für Steuerung
    const controlsContainer = document.querySelector('.fixed-controls-wrapper .controls-container');
    const toggleBtn = document.getElementById('toggle-controls-btn');
    const skizzeElement = document.getElementById('skizze');

    if (toggleBtn && controlsContainer && skizzeElement) {
        toggleBtn.addEventListener('click', () => {
            controlsContainer.classList.toggle('is-hidden');
            
            document.body.classList.toggle('controls-hidden');
            document.body.classList.toggle('controls-open');
            
            const isHidden = controlsContainer.classList.contains('is-hidden');
            if (isHidden) {
                toggleBtn.innerHTML = "🔽"; 
                toggleBtn.title = "Steuerung einblenden";
            } else {
                toggleBtn.innerHTML = "🔼"; 
                toggleBtn.title = "Steuerung ausblenden";
            }
        });
    }
    
    
    // --- OBERE CONTROLS (Skizze) ---
    document.getElementById('btn-add-point')?.addEventListener('click', (e) => {
        e.preventDefault();
        addPointByInput();
    });

    // Punkt per X/Y-Offset einmessen
    document.getElementById('btn-add-point-xy')?.addEventListener('click', (e) => {
        e.preventDefault();
        addPointByOffsetXY();
    });

    document.getElementById('btn-undo')?.addEventListener('click', undo);
    
    const closeButton = document.getElementById('close-btn');
    if (closeButton) {
        closeButton.addEventListener('click', closePolygon);
        closeButton.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.stopPropagation();
            }
        });
    }

    document.getElementById('btn-new-sketch')?.addEventListener('click', newSketch);
    document.getElementById('btn-open-calc')?.addEventListener('click', toggleCalculator);
    document.getElementById('btn-export-sketch-pdf')?.addEventListener('click', exportAufmassblattPDF);
    document.getElementById('mode')?.addEventListener('change', updateCloseButton); 

    // --- Maßstab-Buttons ---
    document.getElementById('btn-scale-10')?.addEventListener('click', () => {
        setScale(10);
        uiState.target2DScale = 10;
    });
    document.getElementById('btn-scale-25')?.addEventListener('click', () => {
        setScale(25);
        uiState.target2DScale = 25;
    });
    document.getElementById('btn-scale-50')?.addEventListener('click', () => {
        setScale(50);
        uiState.target2DScale = 50;
    });
    document.getElementById('btn-scale-100')?.addEventListener('click', () => {
        setScale(100);
        uiState.target2DScale = 100;
    });

    // --- ENTER-KEY FÜR DISTANZ/WINKEL ---
    const distInput = document.getElementById('distance');
    const angleInput = document.getElementById('angle');

    distInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (angleInput) {
                angleInput.focus();
                angleInput.select();
            }
        }
    });

    angleInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addPointByInput();
            
            if (distInput) {
                distInput.focus();
                distInput.select();
            }
        }
    });
    
    const kompassPfeil = document.getElementById('kompass-pfeil');
    if (angleInput && kompassPfeil) {
        angleInput.addEventListener('input', () => {
            const winkel = parseFloat(angleInput.value) || 0;
            kompassPfeil.style.transform = `rotate(${winkel}deg)`;
        });
    }

    // --- Option A: Richtung wählen + Betrag (ohne Minus) ---
    const offsetXHidden = document.getElementById('offset-x');
    const offsetYHidden = document.getElementById('offset-y');
    const offsetXAbs = document.getElementById('offset-x-abs');
    const offsetYAbs = document.getElementById('offset-y-abs');

    const btnXLeft = document.getElementById('xy-x-left');
    const btnXRight = document.getElementById('xy-x-right');
    const btnYUp = document.getElementById('xy-y-up');
    const btnYDown = document.getElementById('xy-y-down');

    // Default-Richtungen
    let xDir = 1; // +1 = rechts, -1 = links
    let yDir = 1; // +1 = runter, -1 = hoch (Canvas-Konvention)

    const setActive = (btnA, btnB, activeA) => {
        if (!btnA || !btnB) return;
        btnA.classList.toggle('active', activeA);
        btnB.classList.toggle('active', !activeA);
    };

    const syncHiddenOffsets = () => {
        const ax = Math.max(0, parseFloat(offsetXAbs?.value) || 0);
        const ay = Math.max(0, parseFloat(offsetYAbs?.value) || 0);

        if (offsetXAbs) offsetXAbs.value = ax;
        if (offsetYAbs) offsetYAbs.value = ay;

        if (offsetXHidden) offsetXHidden.value = (xDir * ax).toString();
        if (offsetYHidden) offsetYHidden.value = (yDir * ay).toString();
    };

    // Clicks: Richtung umschalten
    btnXLeft?.addEventListener('click', (e) => {
        e.preventDefault();
        xDir = -1;
        setActive(btnXLeft, btnXRight, true);
        syncHiddenOffsets();
    });
    btnXRight?.addEventListener('click', (e) => {
        e.preventDefault();
        xDir = 1;
        setActive(btnXLeft, btnXRight, false);
        syncHiddenOffsets();
    });

    btnYUp?.addEventListener('click', (e) => {
        e.preventDefault();
        yDir = -1;
        setActive(btnYUp, btnYDown, true);
        syncHiddenOffsets();
    });
    btnYDown?.addEventListener('click', (e) => {
        e.preventDefault();
        yDir = 1;
        setActive(btnYUp, btnYDown, false);
        syncHiddenOffsets();
    });

    // Input: Betrag ändert sich
    offsetXAbs?.addEventListener('input', syncHiddenOffsets);
    offsetYAbs?.addEventListener('input', syncHiddenOffsets);

    // Initial state
    setActive(btnXLeft, btnXRight, false);
    setActive(btnYUp, btnYDown, false);
    syncHiddenOffsets();

    // --- LISTENERS FÜR RICHTUNGS-BUTTONS (ZEICHNEN) ---
    const btnUp = document.getElementById('btn-dir-up');
    const btnRight = document.getElementById('btn-dir-right');
    const btnDown = document.getElementById('btn-dir-down');
    const btnLeft = document.getElementById('btn-dir-left');

    // Hinweis: Die Richtungs-Buttons werden in main.js zentral behandelt (triggerDrawWithAngle),
    // damit pro Berührung/Klick genau 1 Segment erzeugt wird.
    // (Keine doppelten Listener hier registrieren.)


    // --- EDIT-PANEL ---
    document.getElementById('btn-apply-edit')?.addEventListener('click', applyEdit);
    document.getElementById('btn-cancel-edit')?.addEventListener('click', cancelEdit);
    document.getElementById('btn-delete-segment')?.addEventListener('click', deleteSegment);

    // --- LISTENERS FÜR SCHLÖSSER (MIT INPUT-ID) ---
    const btnLockLength = document.getElementById('btn-lock-length');
    const btnLockAngle = document.getElementById('btn-lock-angle');

    if (btnLockLength) {
        // Übergibt die ID des Input-Feldes
        btnLockLength.addEventListener('click', () => toggleLock(btnLockLength, 'edit-length'));
    }
    if (btnLockAngle) {
        // Übergibt die ID des Input-Feldes
        btnLockAngle.addEventListener('click', () => toggleLock(btnLockAngle, 'edit-angle'));
    }

    const editLength = document.getElementById('edit-length');
    const editAngle = document.getElementById('edit-angle');
    const editLabel = document.getElementById('edit-label');
    const handleEditKeydown = (event) => {
        if (event.key === 'Enter') { event.preventDefault(); applyEdit(); }
    };
    editLength?.addEventListener('keydown', handleEditKeydown);
    editAngle?.addEventListener('keydown', handleEditKeydown);
    editLabel?.addEventListener('keydown', handleEditKeydown);
    
    // --- AUFMASSBLATT-BUTTONS ---
    document.getElementById('btn-clear-all-sketches')?.addEventListener('click', () => window.clearAllSketches());
    document.getElementById('btn-project-load')?.addEventListener('click', importProjectDataTrigger);
    document.getElementById('btn-export-aufmass-pdf')?.addEventListener('click', exportAufmassblattPDF);

    // --- GOOGLE DRIVE VERBINDEN ---
    const gDriveBtn = document.getElementById('btn-google-drive-connect');
    const gDriveStatus = document.getElementById('google-drive-status');
    const updateGoogleDriveStatusUI = () => {
        const connected = isGoogleDriveConnected();
        if (gDriveStatus) gDriveStatus.style.display = connected ? 'inline' : 'none';
        if (gDriveBtn) gDriveBtn.textContent = connected ? '🔗 Erneut verbinden' : '🔗 Mit Google verbinden';
    };
    gDriveBtn?.addEventListener('click', async () => {
        try {
            await connectGoogleDrive();
            updateGoogleDriveStatusUI();
            await window.showAlert('Verbunden', 'Erfolgreich mit Google Drive verbunden. Exporte werden jetzt automatisch in den hinterlegten Ordner hochgeladen.');
        } catch (err) {
            console.error('Google Drive Verbindung fehlgeschlagen:', err);
            await window.showAlert('Verbindung fehlgeschlagen', 'Die Verbindung zu Google Drive konnte nicht hergestellt werden. Bitte erneut versuchen.');
        }
    });
    updateGoogleDriveStatusUI();

    document.getElementById('mat-filter-all')?.addEventListener('click', () => setMaterialFilter('Alle'));
    document.getElementById('btn-apply-metall-choice')?.addEventListener('click', applyMetallChoice);
    document.getElementById('btn-cancel-metall-choice')?.addEventListener('click', cancelMetallChoice);
    document.getElementById('btn-apply-eindeckung-layers')?.addEventListener('click', applyEindeckungLayersChoice);
    document.getElementById('btn-cancel-eindeckung-layers')?.addEventListener('click', cancelEindeckungLayersChoice);
    document.getElementById('btn-close-tile-choice')?.addEventListener('click', cancelTileChoice);
    document.getElementById('btn-close-daemmung-choice')?.addEventListener('click', cancelDaemmungChoice);
    document.getElementById('mat-filter-ziegel')?.addEventListener('click', () => setMaterialFilter('Ziegel'));
    document.getElementById('mat-filter-dämmung')?.addEventListener('click', () => setMaterialFilter('Dämmung'));
    document.getElementById('mat-filter-metall')?.addEventListener('click', () => setMaterialFilter('Metall'));
    document.getElementById('mat-filter-sonstiges')?.addEventListener('click', () => setMaterialFilter('Sonstiges'));

    // --- TASCHENRECHNER-BUTTONS ---
    document.getElementById('calc-0')?.addEventListener('click', () => calculatorInput('0'));
    document.getElementById('calc-1')?.addEventListener('click', () => calculatorInput('1'));
    document.getElementById('calc-2')?.addEventListener('click', () => calculatorInput('2'));
    document.getElementById('calc-3')?.addEventListener('click', () => calculatorInput('3'));
    document.getElementById('calc-4')?.addEventListener('click', () => calculatorInput('4'));
    document.getElementById('calc-5')?.addEventListener('click', () => calculatorInput('5'));
    document.getElementById('calc-6')?.addEventListener('click', () => calculatorInput('6'));
    document.getElementById('calc-7')?.addEventListener('click', () => calculatorInput('7'));
    document.getElementById('calc-8')?.addEventListener('click', () => calculatorInput('8'));
    document.getElementById('calc-9')?.addEventListener('click', () => calculatorInput('9'));
    document.getElementById('calc-dot')?.addEventListener('click', () => calculatorInput('.'));
    document.getElementById('calc-add')?.addEventListener('click', () => calculatorOperator('+'));
    document.getElementById('calc-subtract')?.addEventListener('click', () => calculatorOperator('-'));
    document.getElementById('calc-multiply')?.addEventListener('click', () => calculatorOperator('*'));
    document.getElementById('calc-divide')?.addEventListener('click', () => calculatorOperator('/'));
    document.getElementById('calc-equals')?.addEventListener('click', calculatorEquals);
    document.getElementById('calc-clear')?.addEventListener('click', calculatorClear);
    document.getElementById('calc-use')?.addEventListener('click', useCalculatorResult);
    document.getElementById('calc-close')?.addEventListener('click', closeCalculator);
    
    // --- Hilfspunkt-Panel (X/Y) auf-/zuklappen ---
    const toggleHilfspunktBtn = document.getElementById('toggle-hilfspunkt');
    const hilfspunktBlock = document.getElementById('hilfspunkt-block');

    // gemeinsamer Zustand + UI-Update
    const setHilfspunktCollapsed = (collapsed) => {
        if (!hilfspunktBlock) return;
        hilfspunktBlock.style.display = collapsed ? 'none' : 'block';

        // Titel-Toggle (falls vorhanden)
        if (toggleHilfspunktBtn) {
            toggleHilfspunktBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            toggleHilfspunktBtn.textContent = collapsed ? '🔽' : '🔼';
        }

    };

    if (hilfspunktBlock) {
        // Standard: eingeklappt
        setHilfspunktCollapsed(true);

        // Titel-Button (wenn er existiert)
        if (toggleHilfspunktBtn) {
            toggleHilfspunktBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isExpanded = toggleHilfspunktBtn.getAttribute('aria-expanded') !== 'false';
                setHilfspunktCollapsed(isExpanded);
            });
        }
    }

    // --- PANEL-BUTTONS ---
    document.getElementById('btn-panel-close')?.addEventListener('click', closePolygon);
    document.getElementById('btn-panel-undo')?.addEventListener('click', undo);
    
    // Listener für die "fertig"-Buttons
    document.getElementById('btn-finished-undo')?.addEventListener('click', undo);
    document.getElementById('btn-save-and-exit')?.addEventListener('click', saveAndExit);
    document.getElementById('btn-save-and-continue')?.addEventListener('click', saveAndContinue);


    document.addEventListener('keydown', (event) => {
        
        const modal = document.getElementById('calculator-modal');
        if (modal && modal.style.display === 'block') {
            const key = event.key;
            let handled = true;
            if (key >= '0' && key <= '9') calculatorInput(key);
            else if (key === '.' || key === ',') calculatorInput('.');
            else if (key === '+') calculatorOperator('+');
            else if (key === '-') calculatorOperator('-');
            else if (key === '*') calculatorOperator('*');
            else if (key === '/') calculatorOperator('/');
            else if (key === '=') calculatorEquals();
            else if (key === 'Enter') {
                const { operator, firstOperand, formulaString } = uiState.calculatorState;
                const isResultDisplayed = !operator && firstOperand === null && formulaString.includes('=');
                if (isResultDisplayed) useCalculatorResult();
                else calculatorEquals();
            } else if (key === 'Escape') closeCalculator();
            else if (key === 'Backspace' || key === 'Delete' || key === 'c' || key === 'C') calculatorClear();
            else handled = false;
            
            if (handled) event.preventDefault();
            return;
        }

        if (event.key === 'Enter') {
            if (event.target.tagName.toLowerCase() === 'input') {
                return;
            }

            // Wenn das "Skizze fertig" Panel sichtbar ist, wird "Skizze speichern" ausgelöst.
            const finishedActions = document.getElementById('panel-finished-actions');
            if (finishedActions && window.getComputedStyle(finishedActions).display !== 'none') {
                document.getElementById('btn-save-and-exit')?.click();
                event.preventDefault();
            }
        }
    });

    // --- Panel-Drag-Logik initialisieren ---
    const distPanel = document.getElementById('dist-winkel-panel');
    const distPanelHandle = distPanel.querySelector('h4');
    if (distPanel && distPanelHandle) {
        makePanelDraggable(distPanel, distPanelHandle);
    }
    
    const editPanel = document.getElementById('edit-panel');
    const editPanelHandle = editPanel?.querySelector('h4');
    if (editPanel && editPanelHandle) {
        makePanelDraggable(editPanel, editPanelHandle);

        // Nach dem ersten Drag wird per JS left/top gesetzt.
        // Damit CSS-Breite/Right-Position weiterhin greifen, resetten wir beim Loslassen.
        const resetEditPanelPosition = () => {
            editPanel.style.left = '';
            editPanel.style.top = '';
            editPanel.style.transform = '';
        };
        document.addEventListener('mouseup', resetEditPanelPosition);
        document.addEventListener('touchend', resetEditPanelPosition);
    }

    const calculatorPanel = document.getElementById('calculator-modal');
    const calculatorHandle = calculatorPanel.querySelector('h4');
    if (calculatorPanel && calculatorHandle) {
        makePanelDraggable(calculatorPanel, calculatorHandle);
    }

    const labelRotPanel = document.getElementById('label-rotation-panel');
    if (labelRotPanel) {
        makePanelDraggable(labelRotPanel, labelRotPanel);
    }

    const tileChoicePanel = document.getElementById('tile-choice-modal');
    const tileChoiceHandle = tileChoicePanel?.querySelector('h4');
    if (tileChoicePanel && tileChoiceHandle) {
        makePanelDraggable(tileChoicePanel, tileChoiceHandle);
    }

    const daemmungChoicePanel = document.getElementById('daemmung-choice-modal');
    const daemmungChoiceHandle = daemmungChoicePanel?.querySelector('h4');
    if (daemmungChoicePanel && daemmungChoiceHandle) {
        makePanelDraggable(daemmungChoicePanel, daemmungChoiceHandle);
    }

    const metallChoicePanel = document.getElementById('metall-choice-modal');
    const metallChoiceHandle = metallChoicePanel?.querySelector('h4');
    if (metallChoicePanel && metallChoiceHandle) {
        makePanelDraggable(metallChoicePanel, metallChoiceHandle);
    }

    const eindeckungLayersPanel = document.getElementById('eindeckung-layers-modal');
    const eindeckungLayersHandle = eindeckungLayersPanel?.querySelector('h4');
    if (eindeckungLayersPanel && eindeckungLayersHandle) {
        makePanelDraggable(eindeckungLayersPanel, eindeckungLayersHandle);
    }

    updateCloseButton();
    setupLogoUploader();
}