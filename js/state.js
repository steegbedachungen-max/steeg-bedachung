// js/state.js

/**
 * Zustand der Canvas-Zeichnung und Interaktion
 */
export const canvasState = {
    points: [{ x: 2, y: 2 }],
    currentAngle: 0,
    viewOffset: { x: 0, y: 0 },
    zoom: 1,
    isPanning: false,
    panStart: { x: 0, y: 0 },
    draggingPoint: null,
    isDraggingClosedLoop: false,
    dragStartOffset: { x: 0, y: 0 },
    mouseWorld: null,
    hoverPos: null,
    selectedSegment: null,
    labelingQueue: [],
    activeStartPoint: null,
    lastMouseMoveTime: 0,
};

/**
 * Zustand der gespeicherten Daten (Skizzen, Labels etc.)
 */
export const dataState = {
    savedSketches: [],
    segmentLabels: {},
    pendingDeletedSegments: new Set(),
    deletedSegments: new Set(),
    currentlyEditingSketchIndex: null,
};

/**
 * Zustand der UI-Elemente (Modals, Panels)
 */
export const uiState = {
    onSketchSave: null, // Callback für das Speichern von Skizzen

    // Welche 2D-Seite soll für die PV-Summe im Aufmaßblatt zählen?
    // 'active' = aktuell aktive 2D-Seite
    pvTotalsPageId: 'active',
    editSnapshot: null,
    editSnapshotOriginalLength: "",
    editSnapshotOriginalAngle: "",
    accessoryModalSketchIdx: null,
    calculatorState: {
        displayValue: '0',
        firstOperand: null,
        waitingForSecondOperand: false,
        operator: null,
        formulaString: '',
    },
    tempWindowType: null,
    tempWindowPrefix: null,
    target2DScale: 100, 
    selectedMainTile: null,
};

// KORREKTUR: Neues State-Objekt für die Beschriftungs-Vorschläge mit LocalStorage
export const labelState = {
    defaultLabels: [
        'Traufe', 
        'First', 
        'Ortgang (links)', 
        'Ortgang (rechts)', 
        'Kehle', 
        'Wandanschluss', 
        'Randabschluss',
        'Übergang'
    ],
    labelFrequencies: {},
    
    // KORRIGIERT: Lädt Frequenzen aus localStorage oder initialisiert sie
    initializeLabels() {
        const savedFrequencies = localStorage.getItem('aufmassLabelFrequencies');
        if (savedFrequencies) {
            try {
                this.labelFrequencies = JSON.parse(savedFrequencies);
            } catch (e) {
                console.error("Fehler beim Parsen der Label-Frequenzen aus localStorage:", e);
                this.labelFrequencies = {}; // Fallback
            }
        }
        
        // Stellt sicher, dass alle Standard-Labels existieren, falls sie gelöscht wurden
        this.defaultLabels.forEach(label => {
            if (!this.labelFrequencies[label]) {
                this.labelFrequencies[label] = 1;
            }
        });
        // Entfernt alte/unerwünschte Labels aus früheren Versionen
        delete this.labelFrequencies['w'];
        delete this.labelFrequencies['test'];

        this.saveLabelFrequencies(); // Speichert den initialen (ggf. gemergten) Zustand
    },

    // KORRIGIERT: Inkrementiert und speichert danach sofort
    incrementLabelUsage(label) {
        if (this.labelFrequencies[label]) {
            this.labelFrequencies[label]++;
        } else {
            this.labelFrequencies[label] = 1;
        }
        this.saveLabelFrequencies(); // Nach jeder Änderung speichern
    },

    // NEU: Speichert die Frequenzen im localStorage
    saveLabelFrequencies() {
        try {
            localStorage.setItem('aufmassLabelFrequencies', JSON.stringify(this.labelFrequencies));
        } catch (e) {
            console.error("Fehler beim Speichern der Label-Frequenzen im localStorage:", e);
        }
    },

    getSortedLabels() {
        return Object.keys(this.labelFrequencies).sort((a, b) => {
            // Zusätzliche Sortierung: Bei gleicher Frequenz alphabetisch sortieren
            if (this.labelFrequencies[b] === this.labelFrequencies[a]) {
                return a.localeCompare(b);
            }
            return this.labelFrequencies[b] - this.labelFrequencies[a];
        });
    }
};


/**
 * Zustand der Render-Schleife
 */
export const renderState = {
    needsRedraw: true,
    animationFrameRequested: false,
};

/**
 * Konfigurationen (Werte, die sich selten ändern)
 */
export const config = {
    snapThresholdPxScreen: 8,
};

/**
 * "Getters" - Funktionen, die den Zustand aus dem DOM lesen
 */
export const getters = {
    snapGridEnabled: () => document.getElementById('snap-grid').checked,
    snapEnabled: () => document.getElementById('snap-enable').checked,
    getScale: () => parseFloat(document.getElementById('scale').value) || 50,
    getGridSize: () => parseFloat(document.getElementById('grid-size')?.value) || 1,
};