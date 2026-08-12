// js/2D/compass.js
//
// Vierte Version des Dachausrichtungs-Widgets. Diesmal wörtlich wie
// gewünscht: EIN Pfeil, der Süden markiert (rote Spitze, "S"-Beschriftung),
// wird per Maus/Finger frei gedreht - dort, wohin er zeigt, IST Süden auf
// der Skizze. Acht feste (nicht drehende) Pfeilsymbole rundherum dienen nur
// als Referenzraster für "oben/rechts/unten/links (+ Diagonalen) relativ
// zur Skizze" und sind zusätzlich direkt antippbar, um dorthin zu springen.
//
// Zusammenhang mit der bestehenden "Dachausrichtung" (0=Nord, 90=Ost,
// 180=Süd, 270=West, siehe shading.js): laut shading.js-Konvention zeigt
// "unten" in der Skizze (+y_meter) immer in Richtung der Dachausrichtung
// (Traufe/Dachfuß), und "rechts" (+x_meter) zeigt in Richtung
// Dachausrichtung+90°. Löst man das für "wo zeigt Süden (180°) hin" auf,
// ergibt sich (nachgerechnet UND gegen die tatsächliche Schattenformel
// shadowOffsetOnRoof() verifiziert - Schatten muss z.B. um die
// Mittagszeit exakt nach Norden fallen, unabhängig von der
// Dachausrichtung): der Bildschirm-Winkel des Süd-Pfeils IST direkt die
// Dachausrichtung (keine Spiegelung/Negation!). Zeigt der Süd-Pfeil nach
// unten (Bildschirm-Winkel 180°), ist die Dachausrichtung Süd (180°) -
// der bisherige Standardfall. Zeigt er nach oben (0°), ist Dachausrichtung
// Nord (0°). Zeigt er nach rechts (90°), ist Dachausrichtung Ost (90°) -
// usw., 1:1 (siehe toDachausrichtung()).
//
// (Hinweis für künftige Änderungen an diesem Modul: eine frühere Version
// nutzte hier fälschlich eine Spiegelung [dachausrichtung = 360 -
// Bildschirm-Winkel], was die Verschattungsberechnung bei jeder vom
// Standardfall abweichenden Dachausrichtung auf die genau
// gegenüberliegende Himmelsrichtung stellte - IMMER erst mit der obigen
// "Schatten muss mittags nach Norden zeigen"-Probe gegenrechnen, bevor
// diese Formel erneut geändert wird.)
//
// WICHTIG (Touch/iPad): touchstart/touchmove/touchend zusätzlich zu den
// Maus-Events, da auf iPad reine Maus-Events nicht zuverlässig feuern -
// dieselbe Lektion wie beim PV-Modul-Auswahl-Bug in figure.js. Außerdem
// wird nach dem Loslassen ein "Geister-Klick" auf ein darunterliegendes
// Element unterdrückt (siehe suppressNextClick) - ohne das würde ein
// Browser-Klickereignis nach dem Ziehen sonst versehentlich einen der
// festen Referenzpfeile treffen und das Dreh-Ergebnis zurücksetzen.

const SCREEN_DIRS = [
    { deg: 0, phrase: 'oben', glyph: '↑' },
    { deg: 45, phrase: 'oben rechts', glyph: '↗' },
    { deg: 90, phrase: 'rechts', glyph: '→' },
    { deg: 135, phrase: 'unten rechts', glyph: '↘' },
    { deg: 180, phrase: 'unten', glyph: '↓' },
    { deg: 225, phrase: 'unten links', glyph: '↙' },
    { deg: 270, phrase: 'links', glyph: '←' },
    { deg: 315, phrase: 'oben links', glyph: '↖' },
];

const MARKER_RADIUS_PX = 34; // Abstand der festen Referenzpfeile vom Mittelpunkt

function phraseForScreenAngle(deg) {
    const d = SCREEN_DIRS.find(x => x.deg === deg);
    return d ? d.phrase : `${deg}°`;
}

function snapTo8(deg) {
    const step = 45;
    const n = (Math.round(deg / step) * step) % 360;
    return n < 0 ? n + 360 : n;
}

function norm360(deg) {
    const n = deg % 360;
    return n < 0 ? n + 360 : n;
}

// Rechnet zwischen "Dachausrichtung" (geografisch, 0=Nord...) und dem
// Bildschirm-Winkel des Süd-Pfeils um - laut shading.js-Konvention 1:1
// (siehe Modul-Kommentar oben), dieselbe Formel in beide Richtungen.
function toDachausrichtung(arrowScreenDeg) {
    return norm360(arrowScreenDeg);
}
function toArrowScreenDeg(dachausrichtungDeg) {
    return norm360(dachausrichtungDeg);
}

/**
 * Erstellt das Dachausrichtungs-Widget im übergebenen (leeren) Container.
 *
 * @param {HTMLElement} container - Ziel-Element für das Widget
 * @param {number} initialDeg - Start-Dachausrichtung (0/45/.../315, wie bisher)
 * @param {(deg:number)=>void} onChange - wird mit der neuen Dachausrichtung aufgerufen, sobald sich etwas ändert
 * @returns {{ setValue: (deg:number)=>void, destroy: () => void }}
 */
export function createDachCompass(container, initialDeg, onChange) {
    container.innerHTML = '';
    container.classList.add('dach-kompass');

    const wrap = document.createElement('div');
    wrap.className = 'dach-kompass-wrap';
    container.appendChild(wrap);

    // -- Feste Referenzpfeile (drehen sich NICHT) - reines Raster für
    //    "oben/rechts/unten/links (+Diagonalen) relativ zur Skizze",
    //    gleichzeitig antippbar zum direkten Springen. --
    const markerEls = {};
    SCREEN_DIRS.forEach(d => {
        const rad = (d.deg * Math.PI) / 180;
        const x = Math.sin(rad) * MARKER_RADIUS_PX;
        const y = -Math.cos(rad) * MARKER_RADIUS_PX;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dach-kompass-marker';
        btn.textContent = d.glyph;
        btn.title = `Süden zeigt nach ${d.phrase}`;
        btn.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        btn.addEventListener('click', () => {
            setArrowAngle(d.deg, true);
            onChange(current);
        });
        wrap.appendChild(btn);
        markerEls[d.deg] = btn;
    });

    // -- Drehbarer Süd-Pfeil --
    const arrow = document.createElement('div');
    arrow.className = 'dach-kompass-arrow';
    arrow.tabIndex = 0;
    arrow.setAttribute('role', 'slider');
    arrow.setAttribute('aria-label', 'Süd-Pfeil - zeigt an, wo auf der Skizze Süden ist');
    const arrowShaft = document.createElement('div');
    arrowShaft.className = 'dach-kompass-arrow-shaft';
    const arrowTag = document.createElement('div');
    arrowTag.className = 'dach-kompass-arrow-tag';
    arrowTag.textContent = 'S';
    arrow.appendChild(arrowShaft);
    arrow.appendChild(arrowTag);
    wrap.appendChild(arrow);

    const hub = document.createElement('div');
    hub.className = 'dach-kompass-hub';
    wrap.appendChild(hub);

    const label = document.createElement('span');
    label.className = 'dach-kompass-label';
    container.appendChild(label);

    let current = snapTo8(Number.isFinite(initialDeg) ? initialDeg : 180);
    let arrowAngle = toArrowScreenDeg(current);

    function render(animate) {
        arrow.style.transition = animate ? 'transform 0.2s ease' : 'none';
        arrow.style.transform = `rotate(${arrowAngle}deg)`;
        label.textContent = `Süden zeigt nach ${phraseForScreenAngle(arrowAngle)}`;
        container.title = `Dachausrichtung: ${['Nord', 'Nordost', 'Ost', 'Südost', 'Süd', 'Südwest', 'West', 'Nordwest'][current / 45]}`;
        Object.entries(markerEls).forEach(([deg, el]) => {
            el.classList.toggle('dach-kompass-marker--active', Number(deg) === arrowAngle);
        });
        arrow.setAttribute('aria-valuenow', String(arrowAngle));
    }

    function setArrowAngle(deg, animate) {
        arrowAngle = snapTo8(deg);
        current = toDachausrichtung(arrowAngle);
        render(animate);
    }

    render(false);

    // ---------------------------------------------------------------
    // Dreh-Geste: Pfeil wie einen echten Zeiger mit Maus/Finger im Kreis
    // drehen (inkrementell, mit Kürzeste-Weg-Behandlung - siehe
    // shortestAngleDelta).
    // ---------------------------------------------------------------
    let dragging = false;
    let dragMoved = false;
    let suppressNextClick = false;
    let lastPointerAngle = 0;

    function angleFromPoint(clientX, clientY) {
        const rect = wrap.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const rad = Math.atan2(clientX - cx, -(clientY - cy)); // 0=oben, im Uhrzeigersinn
        return norm360((rad * 180) / Math.PI);
    }

    function shortestAngleDelta(from, to) {
        let d = (to - from) % 360;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        return d;
    }

    function dragStart(clientX, clientY) {
        dragging = true;
        dragMoved = false;
        arrow.classList.add('dach-kompass-arrow--dragging');
        lastPointerAngle = angleFromPoint(clientX, clientY);
    }

    function dragMove(clientX, clientY) {
        if (!dragging) return;
        dragMoved = true;
        const pointerAngle = angleFromPoint(clientX, clientY);
        const delta = shortestAngleDelta(lastPointerAngle, pointerAngle);
        arrowAngle = norm360(arrowAngle + delta);
        lastPointerAngle = pointerAngle;
        current = toDachausrichtung(snapTo8(arrowAngle));
        // Live-Vorschau ohne Snap (fühlt sich beim Ziehen weicher an),
        // gemeldeter Wert (current) ist aber schon der gesnappte Zielwert.
        arrow.style.transition = 'none';
        arrow.style.transform = `rotate(${arrowAngle}deg)`;
        label.textContent = `Süden zeigt nach ${phraseForScreenAngle(snapTo8(arrowAngle))}`;
    }

    function dragEnd() {
        if (!dragging) return;
        dragging = false;
        arrow.classList.remove('dach-kompass-arrow--dragging');
        if (dragMoved) {
            suppressNextClick = true;
            setTimeout(() => { suppressNextClick = false; }, 300);
        }
        setArrowAngle(arrowAngle, true);
        onChange(current);
    }

    const onMouseDown = (e) => { dragStart(e.clientX, e.clientY); e.preventDefault(); };
    const onMouseMove = (e) => { if (dragging) dragMove(e.clientX, e.clientY); };
    const onMouseUp = () => dragEnd();

    const onTouchStart = (e) => {
        const t = e.touches[0];
        if (!t) return;
        dragStart(t.clientX, t.clientY);
        e.preventDefault();
    };
    const onTouchMove = (e) => {
        if (!dragging) return;
        const t = e.touches[0];
        if (!t) return;
        dragMove(t.clientX, t.clientY);
        e.preventDefault();
    };
    const onTouchEnd = () => dragEnd();

    arrow.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    arrow.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    // Fängt einen "Geister-Klick" nach dem Ziehen ab, der sonst einen der
    // festen Referenzpfeile treffen und das Dreh-Ergebnis überschreiben
    // könnte (Capture-Phase auf dem gesamten Widget).
    wrap.addEventListener('click', (e) => {
        if (suppressNextClick) {
            suppressNextClick = false;
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);

    // Pfeiltasten für Tastatur-/Barrierefreiheits-Bedienung (dreht den
    // Süd-Pfeil direkt, nicht die Dachausrichtung - fühlt sich beim
    // Bedienen konsistent zur Maus-/Touch-Geste an).
    arrow.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            setArrowAngle(arrowAngle + 45, true);
            onChange(current);
            e.preventDefault();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            setArrowAngle(arrowAngle - 45, true);
            onChange(current);
            e.preventDefault();
        }
    });

    return {
        setValue(deg) {
            current = snapTo8(Number.isFinite(deg) ? deg : 180);
            arrowAngle = toArrowScreenDeg(current);
            render(false);
        },
        destroy() {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('touchcancel', onTouchEnd);
        }
    };
}