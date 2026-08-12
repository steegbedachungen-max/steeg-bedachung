// js/2D/shading.js
//
// "Verschattung": berechnet und zeichnet den Schattenwurf von Hindernissen
// (z.B. Kamin) mit hinterlegter Höhe auf die (geneigte, ausgerichtete)
// Dachfläche und markiert PV-Module, die davon betroffen sind.
//
// Zwei Modi:
//  1. Genaue Berechnung: wenn eine Projekt-Anschrift vorhanden ist und sich
//     per OpenStreetMap/Nominatim geokodieren lässt, wird der reale
//     Sonnenstand für EINEN Prüfzeitraum (9-15 Uhr, stündlich abgetastet)
//     verwendet und die Schattenfläche als Hülle über den Zeitraum auf die
//     Dachebene projiziert:
//       - Tagundnachtgleiche/Äquinoktium (20.3.): Sonnenstand genau
//         zwischen Winter- und Sommerextrem - der astronomisch echte
//         "mittlere" Tag des Jahres (bewusst KEIN künstlich gemittelter
//         Wert aus zwei Schattenflächen, siehe frühere Versionen dieses
//         Moduls - eine geometrische Vermischung zweier Hüllen entspräche
//         keinem real existierenden Sonnenstand). Die Deklination am 23.9.
//         (Herbst-Äquinoktium) weicht davon nur um ca. 0,2° ab
//         (vernachlässigbar) - eine gesonderte Berechnung dafür ist daher
//         nicht nötig, das Label verweist auf beide Daten.
//  2. Faustregel-Fallback: wenn keine Adresse vorhanden ist oder die
//     Geokodierung fehlschlägt (z.B. kein Netzwerkzugriff), wird ein
//     einfacher, jahreszeit-unabhängiger kreisförmiger Sicherheitsbereich
//     mit Radius = 2,25x Hindernishöhe gezeichnet (Mittelwert der in der
//     PV-Praxis gängigen Faustregel von 2-2,5x Höhe).
//
// Alle Positions-/Größenangaben rechnen in "Welt-Metern" auf der
// Dachfläche, d.h. den tatsächlich am Dach gemessenen (nicht horizontal
// projizierten) Längen - dieselbe Konvention wie in autoDimension.js und
// measurement.js.

/* global Konva */
import { stage, layer, guideLayer } from './stage.js';
import { getActiveScale, getUserData, shadingVisible } from './state.js';
import { getActivePage } from './pages.js';

// Faustregel-Fallback (keine Adresse / Geokodierung fehlgeschlagen) - wie
// bisher braun, jahreszeit-unabhängig.
const FALLBACK_FILL = 'rgba(90, 40, 10, 0.32)';
const FALLBACK_STROKE = '#5a280a';
// Äquinoktium-Schattenfläche (20.3./23.9.) - Grünton, damit sie sich klar
// von der (anders eingefärbten) Faustregel-Fläche unterscheidet.
const UEBERGANG_FILL = 'rgba(46, 125, 79, 0.28)';
const UEBERGANG_STROKE = '#2e7d4f';

const FAUSTFORMEL_FAKTOR = 2.25; // Mittelwert der 2-2,5x-Faustregel
const GROUP_NAME = 'shadingGroup';
const MODULE_WARN_STROKE = '#e74c3c';
const MODULE_WARN_WIDTH_PX = 4;

// Prüfzeitraum: nur noch der "mittlere" Tag (Tagundnachtgleiche) - siehe
// Modul-Kommentar oben. Als Array beibehalten, falls später doch wieder
// mehrere Zeiträume nebeneinander gebraucht werden - der Rest des Moduls
// iteriert generisch darüber.
const SEASONS = [
    { key: 'uebergang', label: 'Tagundnachtgleiche (20.3./23.9., 9-15 Uhr)', shortLabel: '20.3.', month: 3, day: 20, fill: UEBERGANG_FILL, stroke: UEBERGANG_STROKE },
];

// ---------------------------------------------------------------
// Geokodierungs-Cache (vermeidet wiederholte Netzwerk-Anfragen bei
// jedem Neuzeichnen, z.B. während des Verschiebens eines Objekts)
// ---------------------------------------------------------------
let geoCache = { address: null, lat: null, lon: null, resolved: false, failed: false };
let geoInFlight = null;

function normalizeAddress(addr) {
    return (addr || '').trim();
}

/**
 * Stellt sicher, dass für die übergebene Adresse (falls vorhanden) eine
 * geokodierte Position im Cache liegt - inkl. laufender Anfrage, damit bei
 * mehrfachem Aufruf während desselben Ladevorgangs nicht mehrfach
 * angefragt wird. Muss vor refreshShading() awaited werden, wenn die
 * Adresse sich geändert haben könnte (z.B. beim Umschalten der
 * Verschattung oder nach Bearbeiten des Anschrift-Felds).
 */
export async function ensureGeocoded(rawAddress) {
    const address = normalizeAddress(rawAddress);

    if (!address) {
        geoCache = { address: '', lat: null, lon: null, resolved: false, failed: true };
        return geoCache;
    }

    if (geoCache.address === address && (geoCache.resolved || geoCache.failed)) {
        return geoCache;
    }

    if (geoInFlight && geoCache.address === address) {
        return geoInFlight;
    }

    geoInFlight = (async () => {
        try {
            const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(address);
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
                geoCache = { address, lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), resolved: true, failed: false };
            } else {
                geoCache = { address, lat: null, lon: null, resolved: false, failed: true };
            }
        } catch (e) {
            geoCache = { address, lat: null, lon: null, resolved: false, failed: true };
        }
        return geoCache;
    })();

    const result = await geoInFlight;
    geoInFlight = null;
    return result;
}

// ---------------------------------------------------------------
// Sonnenstand (Elevation + Azimut), verifiziert gegen bekannte
// Referenzwerte (siehe prototype-sun.js / Testsuite)
// ---------------------------------------------------------------
function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }

function dayOfYear(year, month, day) {
    const start = Date.UTC(year, 0, 1);
    const d = Date.UTC(year, month - 1, day);
    return Math.round((d - start) / 86400000) + 1;
}

function solarDeclination(n) {
    return 23.45 * Math.sin(toRad(360 / 365 * (284 + n)));
}

function equationOfTime(n) {
    const B = toRad(360 / 365 * (n - 81));
    return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

/**
 * Sonnenhöhe (Elevation) und Azimut (0=Nord, 90=Ost, 180=Süd, 270=West, im
 * Uhrzeigersinn) für Standort/Zeitpunkt. utcOffsetHours = Zeitzone ohne
 * Sommerzeit (z.B. 1 für CET/Deutschland im Winter).
 */
export function sunPosition(lat, lon, year, month, day, hourLocal, utcOffsetHours = 1) {
    const n = dayOfYear(year, month, day);
    const decl = solarDeclination(n);
    const eot = equationOfTime(n);
    const tzMeridian = 15 * utcOffsetHours;
    const lst = hourLocal + (4 * (lon - tzMeridian)) / 60 + eot / 60;
    const hourAngle = 15 * (lst - 12);

    const latR = toRad(lat), declR = toRad(decl), haR = toRad(hourAngle);
    const sinElev = Math.sin(latR) * Math.sin(declR) + Math.cos(latR) * Math.cos(declR) * Math.cos(haR);
    const elevation = toDeg(Math.asin(Math.max(-1, Math.min(1, sinElev))));

    const elevR = toRad(elevation);
    const sinAz = -Math.sin(haR) * Math.cos(declR) / Math.cos(elevR);
    const cosAz = (Math.sin(declR) - Math.sin(latR) * Math.sin(elevR)) / (Math.cos(latR) * Math.cos(elevR));
    let azimuth = toDeg(Math.atan2(sinAz, cosAz));
    if (azimuth < 0) azimuth += 360;

    return { elevation, azimuth };
}

// ---------------------------------------------------------------
// Schattenwurf-Geometrie auf der geneigten/ausgerichteten Dachebene
// ---------------------------------------------------------------
/**
 * Liefert die Verschiebung (Delta u, Delta v in Metern, in denselben
 * Plan-Achsen wie x_meter/y_meter) vom Fußpunkt eines vertikalen
 * Hindernisses zur Schattenspitze, für gegebene Sonnenposition und
 * Dachneigung/-ausrichtung.
 *
 * Konvention (siehe Dokumentation/UI-Hinweistext):
 *  - "Dachausrichtung" = Kompass-Richtung, in die die Dachfläche zeigt/in
 *    die das Regenwasser abläuft (0=Nord, 90=Ost, 180=Süd, 270=West)
 *  - in der Skizze zeigt +y_meter (nach unten) zur Traufe/Dachfuß, also in
 *    Richtung der Dachausrichtung; +x_meter verläuft entlang der Traufe
 *    (Dachausrichtung + 90°)
 *
 * Gibt null zurück, wenn die Sonne zu diesem Zeitpunkt unter dem lokalen
 * Horizont der Dachfläche steht (rechnerisch kein endlicher Schatten -
 * die ganze Fläche liegt dann im Eigenschatten).
 */
export function shadowOffsetOnRoof(heightM, elevationDeg, azimuthDeg, neigungDeg, ausrichtungDeg) {
    const e = toRad(elevationDeg);
    const A = toRad(azimuthDeg);
    const neigung = toRad(neigungDeg || 0);
    const ausrichtung = toRad(ausrichtungDeg || 0);

    // C = cos(Einfallswinkel) der Sonne auf die Dachebene
    const C = Math.sin(neigung) * Math.cos(e) * Math.cos(A - ausrichtung) + Math.cos(neigung) * Math.sin(e);
    if (C <= 0.001) return null; // Fläche liegt im Eigenschatten - kein sinnvoller endlicher Schatten

    const su = Math.cos(e) * Math.sin(A - ausrichtung);
    const sv = Math.cos(neigung) * Math.cos(e) * Math.cos(A - ausrichtung) - Math.sin(neigung) * Math.sin(e);

    const t = (heightM * Math.cos(neigung)) / C;

    // WICHTIG: die Hindernis-Spitze liegt h Meter SENKRECHT über dem
    // Fußpunkt (nicht senkrecht ZUR Dachebene) - projiziert auf die
    // v-Achse der geneigten Ebene hat "senkrecht nach oben" bereits selbst
    // einen Versatz von -h*sin(neigung) (Richtung First), zusätzlich zum
    // Versatz -t*sv durch den Sonnenstrahl. Ohne diesen ersten Term würde
    // der Schatten bei geneigten Dächern systematisch falsch berechnet
    // (mit Brute-Force-3D-Vektorrechnung gegengeprüft, siehe prototype-shadow.js).
    return { du: -t * su, dv: -heightM * Math.sin(neigung) - t * sv };
}

/**
 * Sample-Zeitpunkte für einen Prüfzeitraum (9-15 Uhr, stündlich, an einem
 * bestimmten Datum) - Standard-Prüffenster in der PV-Planung.
 */
function sampleTimesForDate(month, day) {
    const year = 2025; // Deklination/Zeitgleichung ändern sich zwischen den Jahren nur unwesentlich
    return [9, 10, 11, 12, 13, 14, 15].map(h => ({ year, month, day, hour: h }));
}

// ---------------------------------------------------------------
// 2D-Geometrie-Helfer: konvexe Hülle + Polygon-Überlappung (SAT)
// ---------------------------------------------------------------
function convexHull(points) {
    const pts = points
        .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
        .sort((a, b) => (a.x - b.x) || (a.y - b.y));
    if (pts.length < 3) return pts;

    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

    const lower = [];
    for (const p of pts) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
        lower.push(p);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
        upper.push(p);
    }
    upper.pop(); lower.pop();
    return lower.concat(upper);
}

function polygonOverlap(polyA, polyB) {
    if (polyA.length < 3 || polyB.length < 3) return false;
    const polys = [polyA, polyB];
    for (const poly of polys) {
        for (let i = 0; i < poly.length; i++) {
            const p1 = poly[i], p2 = poly[(i + 1) % poly.length];
            const axis = { x: -(p2.y - p1.y), y: p2.x - p1.x };
            let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
            polyA.forEach(p => { const d = p.x * axis.x + p.y * axis.y; minA = Math.min(minA, d); maxA = Math.max(maxA, d); });
            polyB.forEach(p => { const d = p.x * axis.x + p.y * axis.y; minB = Math.min(minB, d); maxB = Math.max(maxB, d); });
            if (maxA < minB || maxB < minA) return false; // Trennachse gefunden
        }
    }
    return true;
}

// ---------------------------------------------------------------
// Figuren-Geometrie (Plan-Meter) - analog zu autoDimension.js
// ---------------------------------------------------------------
function absoluteToWorld(absPoint) {
    const zoom = stage.scaleX() || 1;
    const stagePos = stage.position();
    return { x: (absPoint.x - stagePos.x) / zoom, y: (absPoint.y - stagePos.y) / zoom };
}

function getRotatedRectCorners(fig, ud) {
    const scale = getActiveScale();
    if (!scale || !ud.width_meter || !ud.height_meter) return null;
    const transform = fig.getAbsoluteTransform();
    const w_px = ud.width_meter * scale, h_px = ud.height_meter * scale;
    const localCorners = [
        { x: -w_px / 2, y: -h_px / 2 }, { x: w_px / 2, y: -h_px / 2 },
        { x: w_px / 2, y: h_px / 2 }, { x: -w_px / 2, y: h_px / 2 }
    ];
    return localCorners.map(p => {
        const absP = transform.point(p);
        const worldPx = absoluteToWorld(absP);
        return { x: worldPx.x / scale, y: worldPx.y / scale };
    });
}

function getFigureCenterMeters(fig) {
    const scale = getActiveScale();
    const transform = fig.getAbsoluteTransform();
    const absP = transform.point({ x: 0, y: 0 });
    const worldPx = absoluteToWorld(absP);
    return { x: worldPx.x / scale, y: worldPx.y / scale };
}

// ---------------------------------------------------------------
// Zeichnen
// ---------------------------------------------------------------
function drawFaustformelCircle(centerM, radiusM, label, fillColor = FALLBACK_FILL, strokeColor = FALLBACK_STROKE) {
    const scale = getActiveScale();
    const zoom = stage.scaleX() || 1;
    const group = new Konva.Group({ name: GROUP_NAME, listening: false });
    group.add(new Konva.Circle({
        x: centerM.x * scale, y: centerM.y * scale, radius: radiusM * scale,
        fill: fillColor, stroke: strokeColor, strokeWidth: 1.5 / zoom,
        dash: [6 / zoom, 4 / zoom], listening: false, name: 'shadingLine'
    }));
    group.add(new Konva.Text({
        x: centerM.x * scale, y: centerM.y * scale + radiusM * scale + 4 / zoom,
        text: label, fontSize: 12 / zoom, fill: strokeColor, fontStyle: 'bold',
        listening: false, name: 'shadingText'
    }));
    guideLayer.add(group);
    return { x: centerM.x - radiusM, y: centerM.y - radiusM, width: radiusM * 2, height: radiusM * 2, poly: null, isCircle: true, center: centerM, radius: radiusM };
}

function drawShadowPolygon(pointsM, label, fillColor = UEBERGANG_FILL, strokeColor = UEBERGANG_STROKE) {
    const scale = getActiveScale();
    const zoom = stage.scaleX() || 1;
    const group = new Konva.Group({ name: GROUP_NAME, listening: false });
    const flatPx = pointsM.flatMap(p => [p.x * scale, p.y * scale]);
    group.add(new Konva.Line({
        points: flatPx, closed: true, fill: fillColor, stroke: strokeColor,
        strokeWidth: 1.5 / zoom, listening: false, name: 'shadingLine'
    }));
    const cx = pointsM.reduce((s, p) => s + p.x, 0) / pointsM.length;
    const cy = pointsM.reduce((s, p) => s + p.y, 0) / pointsM.length;
    group.add(new Konva.Text({
        x: cx * scale, y: cy * scale, text: label, fontSize: 12 / zoom,
        fill: strokeColor, fontStyle: 'bold', padding: 2 / zoom, listening: false, name: 'shadingText'
    }));
    guideLayer.add(group);
}

/**
 * Berechnet und zeichnet die Verschattung neu (SYNCHRON - nutzt den
 * aktuellen Geokodierungs-Cache, fragt selbst nicht erneut beim Server an).
 * Für einen garantiert aktuellen Standort vorher ensureGeocoded() awaiten
 * (macht der Toggle-Button bzw. die Dachdaten-Felder).
 */
function resetModuleWarnings() {
    layer.find('.shape').forEach(shape => {
        const orig = shape.getAttr('origStrokeForShading');
        if (orig !== undefined) {
            shape.stroke(orig.color);
            shape.strokeWidth(orig.width);
        }
    });
}

export function refreshShadingSync() {
    resetModuleWarnings();
    guideLayer.find(`.${GROUP_NAME}`).forEach(n => n.destroy());

    if (!shadingVisible) {
        guideLayer.batchDraw();
        layer.batchDraw();
        return;
    }

    const page = getActivePage();
    const neigung = Number(page?.dachneigung) || 0;
    const ausrichtung = Number(page?.dachausrichtung) || 0;

    const figures = layer.getChildren();
    const obstacles = [];
    const modules = [];
    figures.forEach(fig => {
        const ud = getUserData(fig);
        if (!ud) return;
        if ((ud.typ === 'rechteck' || ud.typ === 'pv_modul') && ud.schattenHoeheM > 0) {
            obstacles.push({ fig, ud });
        } else if (ud.typ === 'pv_modul') {
            modules.push({ fig, ud });
        }
    });

    if (obstacles.length === 0) {
        guideLayer.batchDraw();
        return;
    }

    const usePrecise = geoCache.resolved && Number.isFinite(geoCache.lat) && Number.isFinite(geoCache.lon);
    const shadowPolys = [];

    obstacles.forEach(({ fig, ud }) => {
        const corners = getRotatedRectCorners(fig, ud);
        const center = getFigureCenterMeters(fig);
        if (!corners) return;
        const h = ud.schattenHoeheM;

        if (usePrecise) {
            SEASONS.forEach(season => {
                const offsets = [];
                sampleTimesForDate(season.month, season.day).forEach(t => {
                    const sun = sunPosition(geoCache.lat, geoCache.lon, t.year, t.month, t.day, t.hour, 1);
                    if (sun.elevation <= 0) return; // Sonne unter dem (horizontalen) Horizont
                    const off = shadowOffsetOnRoof(h, sun.elevation, sun.azimuth, neigung, ausrichtung);
                    if (off) offsets.push(off);
                });

                if (offsets.length === 0) {
                    // Die ganze Prüfperiode dieser Jahreszeit liegt im
                    // Eigenschatten der Dachfläche (z.B. Nordseite bei
                    // steilem Dach) - kein gerichteter Schatten berechenbar,
                    // Faustregel als Hinweis (in der Farbe der Jahreszeit).
                    const poly = drawFaustformelCircle(center, FAUSTFORMEL_FAKTOR * h,
                        `Verschattung ~${(FAUSTFORMEL_FAKTOR * h).toFixed(1)} m (${season.shortLabel}, Dachseite ohne direkte Sonne)`,
                        season.fill, season.stroke);
                    shadowPolys.push(poly);
                    return;
                }

                const hullPoints = [...corners];
                corners.forEach(c => {
                    offsets.forEach(off => hullPoints.push({ x: c.x + off.du, y: c.y + off.dv }));
                });
                const hull = convexHull(hullPoints);
                drawShadowPolygon(hull, `Verschattung ${season.label}`, season.fill, season.stroke);
                shadowPolys.push({ poly: hull, isCircle: false });
            });
        } else {
            const radius = FAUSTFORMEL_FAKTOR * h;
            const poly = drawFaustformelCircle(center, radius, `Verschattung ~${radius.toFixed(1)} m (Faustregel)`);
            shadowPolys.push(poly);
        }
    });

    // PV-Module bei Überlappung mit einer Schattenfläche markieren
    modules.forEach(({ fig, ud }) => {
        const corners = getRotatedRectCorners(fig, ud);
        if (!corners) return;
        const affected = shadowPolys.some(s => {
            if (s.isCircle) {
                // Kreis grob als 24-Eck für die SAT-Prüfung annähern
                const circlePoly = [];
                for (let i = 0; i < 24; i++) {
                    const a = (i / 24) * Math.PI * 2;
                    circlePoly.push({ x: s.center.x + s.radius * Math.cos(a), y: s.center.y + s.radius * Math.sin(a) });
                }
                return polygonOverlap(corners, circlePoly);
            }
            return polygonOverlap(corners, s.poly);
        });
        const shape = fig.findOne('.shape');
        if (shape && affected) {
            if (shape.getAttr('origStrokeForShading') === undefined) {
                shape.setAttr('origStrokeForShading', { color: shape.stroke(), width: shape.strokeWidth() });
            }
            shape.stroke(MODULE_WARN_STROKE);
            shape.strokeWidth(MODULE_WARN_WIDTH_PX / (stage.scaleX() || 1));
        }
    });

    guideLayer.batchDraw();
    layer.batchDraw();
}

/**
 * Komfort-Funktion für Stellen, an denen sich die Adresse/Standort geändert
 * haben könnte (Toggle-Button, Änderung von Anschrift/Dachneigung/
 * -ausrichtung): stellt zuerst sicher, dass der Geokodierungs-Cache aktuell
 * ist, und zeichnet danach neu.
 */
export async function refreshShading(address) {
    await ensureGeocoded(address);
    refreshShadingSync();
}

/**
 * Passt nur Strichstärke/Schriftgröße der bereits gezeichneten Schatten an
 * einen neuen Zoom-Faktor an (kein Neuberechnen der Geometrie nötig, die ist
 * zoom-unabhängig in Welt-Metern) - analog zu rescaleAutoDimensionsForZoom.
 */
export function rescaleShadingForZoom(zoom) {
    const z = zoom || 1;
    guideLayer.find('.shadingLine').forEach(n => n.strokeWidth(1.5 / z));
    guideLayer.find('.shadingText').forEach(n => n.fontSize(12 / z));
    guideLayer.batchDraw();
}