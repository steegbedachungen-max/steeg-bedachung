
// js/dialogManager.js

// Referenzen zu den DOM-Elementen des Modals
const modalOverlay = document.getElementById('custom-modal-overlay');
const modalTitle = document.getElementById('custom-modal-title');
const modalText = document.getElementById('custom-modal-text');
const modalInput = document.getElementById('custom-modal-input');
const okButton = document.getElementById('custom-modal-ok');
const cancelButton = document.getElementById('custom-modal-cancel');

// Ein Promise, das die aktuelle Interaktion steuert
let activePromiseResolver = null;

/**
 * Interne Funktion zum Anzeigen des Modals mit Konfiguration.
 */
function showModal(config) {
    modalTitle.textContent = config.title || 'Meldung';
    modalText.textContent = config.text || '';
    modalText.style.display = config.text ? 'block' : 'none';

    if (config.type === 'prompt') {
        modalInput.style.display = 'block';
        modalInput.value = config.defaultValue || '';
        modalInput.placeholder = config.placeholder || '';
    } else {
        modalInput.style.display = 'none';
    }

    if (config.type === 'alert') {
        cancelButton.style.display = 'none';
    } else {
        cancelButton.style.display = 'inline-block';
    }
    
    okButton.textContent = config.okText || 'OK';
    cancelButton.textContent = config.cancelText || 'Abbrechen';

    modalOverlay.style.display = 'flex';
    if (config.type === 'prompt') {
        setTimeout(() => modalInput.focus(), 50);
    }
}

/**
 * Interne Funktion zum Verbergen des Modals.
 */
function hideModal() {
    modalOverlay.style.display = 'none';
}

// Event-Listener für die Buttons
okButton.addEventListener('click', () => {
    if (activePromiseResolver) {
        const result = modalInput.style.display === 'block' ? modalInput.value : true;
        activePromiseResolver(result);
        activePromiseResolver = null;
        hideModal();
    }
});

cancelButton.addEventListener('click', () => {
    if (activePromiseResolver) {
        const result = modalInput.style.display === 'block' ? null : false;
        activePromiseResolver(result);
        activePromiseResolver = null;
        hideModal();
    }
});

// Event-Listener für die Enter-Taste im Input-Feld
modalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        okButton.click();
    } else if (e.key === 'Escape') {
        cancelButton.click();
    }
});

/**
 * Zeigt einen "Confirm"-Dialog an.
 * @param {string} title - Der Titel des Dialogs.
 * @param {string} text - Die Frage oder Nachricht im Dialog.
 * @returns {Promise<boolean>} - Resolvt zu `true` bei OK, `false` bei Abbrechen.
 */
export function showConfirm(title, text) {
    return new Promise(resolve => {
        activePromiseResolver = resolve;
        showModal({
            type: 'confirm',
            title,
            text
        });
    });
}

/**
 * Zeigt einen "Prompt"-Dialog mit einem Eingabefeld an.
 * @param {string} title - Der Titel des Dialogs.
 * @param {string} text - Die Aufforderung über dem Eingabefeld.
 * @param {string} [defaultValue=''] - Der voreingestellte Wert im Eingabefeld.
 * @returns {Promise<string|null>} - Resolvt zum eingegebenen Text bei OK, oder `null` bei Abbrechen.
 */
export function showPrompt(title, text, defaultValue = '') {
    return new Promise(resolve => {
        activePromiseResolver = resolve;
        showModal({
            type: 'prompt',
            title,
            text,
            defaultValue
        });
    });
}

/**
 * Zeigt einen "Alert"-Dialog an (nur eine Nachricht und ein OK-Button).
 * @param {string} title - Der Titel des Dialogs.
 * @param {string} text - Die anzuzeigende Nachricht.
 * @returns {Promise<void>} - Resolvt, wenn der Benutzer OK klickt.
 */
export function showAlert(title, text) {
    return new Promise(resolve => {
        activePromiseResolver = () => resolve(); // Alert braucht keinen Rückgabewert
        showModal({
            type: 'alert',
            title,
            text
        });
    });
}
