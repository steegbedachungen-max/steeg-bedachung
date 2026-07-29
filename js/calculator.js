// js/calculator.js

import { uiState } from './state.js';

// Interne Hilfsfunktion
const performCalculation = {
    '/': (a, b) => b !== 0 ? a / b : NaN,
    '*': (a, b) => a * b,
    '+': (a, b) => a + b,
    '-': (a, b) => a - b
};

/**
 * Aktualisiert die Anzeige des Taschenrechners (Zahl und Formel).
 */
function updateCalculatorDisplay() {
    document.getElementById('calc-display').value = uiState.calculatorState.displayValue; // <-- state
    document.getElementById('calc-formula-display').textContent = uiState.calculatorState.formulaString; // <-- state
}

/**
 * Öffnet das Rechner-Modal.
 */
export function openCalculator() {
    calculatorClear(); // Beim Öffnen immer zurücksetzen

    const modal = document.getElementById('calculator-modal');
    if (!modal) return;

    // Erst anzeigen, damit getBoundingClientRect() korrekte Werte liefert
    modal.style.display = 'block';

    // In die Mitte des sichtbaren Bereichs (Viewport) setzen
    // Hinweis: Einige Panels werden beim Draggen auf left/top + transform:none umgestellt.
    // Damit der Rechner immer sauber mittig aufgeht, setzen wir das hier explizit zurück.
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.right = 'auto';
    modal.style.bottom = 'auto';
    modal.style.transform = 'translate(-50%, -50%)';

    // Button als aktiv markieren
    const btn = document.getElementById('btn-open-calc');
    if (btn) btn.classList.add('active');

    updateCalculatorDisplay();
}

/**
 * Schließt das Rechner-Modal.
 */
export function closeCalculator() {
    document.getElementById('calculator-modal').style.display = 'none';
    const btn = document.getElementById('btn-open-calc');
    if (btn) btn.classList.remove('active');
}

/**
 * Schaltet das Rechner-Modal um (an/aus).
 * Erster Klick öffnet, zweiter Klick schließt.
 */
export function toggleCalculator() {
    const modal = document.getElementById('calculator-modal');
    if (!modal) return;

    const isOpen = modal.style.display === 'block';
    if (isOpen) {
        closeCalculator();
    } else {
        openCalculator();
    }
}

/**
 * Verarbeitet eine Ziffern- oder Punkt-Eingabe.
 * @param {string} digit 
 */
export function calculatorInput(digit) {
    const { displayValue, waitingForSecondOperand } = uiState.calculatorState; // <-- state

     if (!uiState.calculatorState.operator && uiState.calculatorState.firstOperand === null && uiState.calculatorState.formulaString.includes('=')) {
        uiState.calculatorState.formulaString = ''; // <-- state
     }

    if (waitingForSecondOperand) {
        uiState.calculatorState.displayValue = digit === '.' ? '0.' : digit; // <-- state
        uiState.calculatorState.waitingForSecondOperand = false; // <-- state
    } else {
        if (digit === '.' && !displayValue.includes('.')) {
             uiState.calculatorState.displayValue += '.'; // <-- state
        } else if (digit !== '.') {
             uiState.calculatorState.displayValue = (displayValue === '0' ? digit : displayValue + digit); // <-- state
        }
    }
    updateCalculatorDisplay();
}

/**
 * Verarbeitet eine Operator-Eingabe (+, -, *, /).
 * @param {string} nextOperator 
 */
export function calculatorOperator(nextOperator) {
    const { firstOperand, displayValue, operator, waitingForSecondOperand } = uiState.calculatorState; // <-- state
    const inputValue = parseFloat(displayValue);
    const state = uiState.calculatorState; // <-- state (Kürzel)

    if (waitingForSecondOperand && operator) {
        state.operator = nextOperator;
        if (/\s[+\-*/]\s$/.test(state.formulaString)) {
             state.formulaString = state.formulaString.slice(0, -3) + ` ${nextOperator} `;
        }
        updateCalculatorDisplay();
        return;
    }

     if (!operator && state.firstOperand === null && state.formulaString.includes('=')) {
        state.firstOperand = inputValue;
        state.formulaString = `${displayValue} ${nextOperator} `;
     }
    else if (firstOperand === null && !isNaN(inputValue)) {
        state.firstOperand = inputValue;
        state.formulaString = `${displayValue} ${nextOperator} `;
    }
    else if (operator && !waitingForSecondOperand) {
        const result = performCalculation[operator](firstOperand, inputValue);
        const roundedResult = Math.round(result * 1000000) / 1000000;

        state.formulaString += `${displayValue} ${nextOperator} `;
        state.displayValue = String(roundedResult);
        state.firstOperand = roundedResult;
    }
     else if (!operator && firstOperand !== null){
         if (/\s[+\-*/]\s$/.test(state.formulaString)) {
             state.formulaString = state.formulaString.slice(0, -3) + ` ${nextOperator} `;
         } else {
             state.formulaString = `${firstOperand} ${nextOperator} `;
         }
     }

    state.waitingForSecondOperand = true;
    state.operator = nextOperator;
    updateCalculatorDisplay();
}

/**
 * Führt die = (Gleich) Operation aus.
 */
export function calculatorEquals() {
    const { firstOperand, displayValue, operator, waitingForSecondOperand } = uiState.calculatorState; // <-- state
    const inputValue = parseFloat(displayValue);
    const state = uiState.calculatorState; // <-- state

    if (operator && !waitingForSecondOperand) {
         if (firstOperand === null) return;
         const result = performCalculation[operator](firstOperand, inputValue);
         const roundedResult = Math.round(result * 1000000) / 1000000;

         if (!state.formulaString.includes('=')) {
             state.formulaString += `${displayValue} =`;
         }

         state.displayValue = String(roundedResult);
         state.firstOperand = null;
         state.waitingForSecondOperand = false;
         state.operator = null;
         updateCalculatorDisplay();
    }
}

/**
 * Setzt den Rechner zurück (C-Button).
 */
export function calculatorClear() {
    // Setzt den State-Teil zurück
    uiState.calculatorState = { // <-- state
        displayValue: '0',
        firstOperand: null,
        waitingForSecondOperand: false,
        operator: null,
        formulaString: '',
    };
    updateCalculatorDisplay();
}

/**
 * Übernimmt das Ergebnis in das Distanz-Feld.
 */
export function useCalculatorResult() {
    const result = parseFloat(uiState.calculatorState.displayValue); // <-- state
    if (!isNaN(result)) {
        document.getElementById('distance').value = result.toFixed(2);
    }
    closeCalculator();
}