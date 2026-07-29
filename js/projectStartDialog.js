// js/projectStartDialog.js
//
// Fragt beim Start des Programms gezielt alle Projektfelder ab
// (Bauvorhaben, Name, Anschrift, Telefon, E-Mail), damit keines
// vergessen wird. Die Werte werden bei "Übernehmen" in die echten
// Felder oben in der Toolbar übertragen.

const FIELD_MAP = [
    { startId: 'start-bauvorhaben', targetId: 'projekt-bauvorhaben' },
    { startId: 'start-name',        targetId: 'projekt-name' },
    { startId: 'start-anschrift',   targetId: 'projekt-anschrift' },
    { startId: 'start-telefon',     targetId: 'projekt-telefon' },
    { startId: 'start-email',       targetId: 'projekt-email' },
];

export function initProjectStartDialog() {
    const overlay = document.getElementById('project-start-modal-overlay');
    const okBtn = document.getElementById('project-start-ok');
    const skipBtn = document.getElementById('project-start-skip');

    if (!overlay || !okBtn || !skipBtn) return;

    function closeDialog() {
        overlay.style.display = 'none';
        document.removeEventListener('keydown', onKeyDown);

        // Direkt ins Distanz-Feld springen, damit man sofort tippen kann,
        // ohne das Feld vorher extra antippen zu müssen.
        setTimeout(() => {
            const distanceInput = document.getElementById('distance');
            if (distanceInput) {
                distanceInput.focus();
                distanceInput.select();
            }
        }, 50);
    }

    function applyValues() {
        FIELD_MAP.forEach(({ startId, targetId }) => {
            const startInput = document.getElementById(startId);
            const targetInput = document.getElementById(targetId);
            if (startInput && targetInput) {
                targetInput.value = startInput.value.trim();
            }
        });
    }

    function onKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();

            const activeId = document.activeElement?.id;
            const currentIndex = FIELD_MAP.findIndex(({ startId }) => startId === activeId);

            if (currentIndex !== -1 && currentIndex < FIELD_MAP.length - 1) {
                // Nicht das letzte Feld -> zum nächsten Feld springen
                const nextField = document.getElementById(FIELD_MAP[currentIndex + 1].startId);
                nextField?.focus();
                nextField?.select?.();
            } else {
                // Letztes Feld (oder Fokus außerhalb der Felder) -> Dialog abschließen
                okBtn.click();
            }
        } else if (e.key === 'Escape') {
            skipBtn.click();
        }
    }

    okBtn.addEventListener('click', () => {
        applyValues();
        closeDialog();
    });

    skipBtn.addEventListener('click', () => {
        closeDialog();
    });

    document.addEventListener('keydown', onKeyDown);

    // Dialog anzeigen und erstes Feld fokussieren
    overlay.style.display = 'flex';
    setTimeout(() => {
        document.getElementById('start-bauvorhaben')?.focus();
    }, 50);
}
