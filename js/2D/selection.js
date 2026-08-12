/* global Konva */
import { stage, layer, guideLayer } from './stage.js';
import { selectedNode, setSelectedNode, getActiveScale, getUserData, setLastPvModuleSize } from './state.js';
import { updatePanelState } from './uiSidePanel.js';
import { deselectActiveLabel } from './figure.js';
import { refreshAutoDimensions } from './autoDimension.js';
import { refreshShadingSync } from './shading.js';

export function highlightNode(n, on) {
    // Zerstöre nur die alte selectionBox, nicht alles
    guideLayer.find('.selectionBox').forEach(box => {
        box.destroy();
    });

    if (on && n) {
        // 1. Wir suchen die eigentliche Form (Rechteck/Polygon) OHNE die Text-Labels
        const targetShape = n.findOne('.shape') || n;

        // 2. Wir berechnen die Bounding Box relativ zum übergeordneten Layer
        const rect = targetShape.getClientRect({ relativeTo: n.getParent() });
        
        // 3. Zoom-Faktor einbeziehen für eine konstante Strichstärke und Abstand
        const zoom = stage.scaleX() || 1;

        guideLayer.add(new Konva.Rect({
            x: rect.x - 4 / zoom, 
            y: rect.y - 4 / zoom, 
            width: rect.width + 8 / zoom, 
            height: rect.height + 8 / zoom,
            stroke: "dodgerblue", 
            strokeWidth: 2 / zoom, 
            dash: [6 / zoom, 4 / zoom], 
            listening: false,
            name: 'selectionBox' 
        }));
    }
    guideLayer.batchDraw();
}

/**
 * Wählt einen Knoten aus, aktualisiert den globalen Zustand
 * und weist das UI-Panel an, sich zu aktualisieren.
 */
export function selectNode(n) {
    deselectActiveLabel(); 
    
    highlightNode(selectedNode, false); // Alte Auswahl de-highlighten
    setSelectedNode(n); // Neuen Node im State setzen

    if (n) {
        highlightNode(n, true); // Neuen Node highlighten
        updatePanelState(n); // Dem Seitenpanel sagen, es soll sich aktualisieren

        // Merkt sich die Größe, falls ein PV-Modul ausgewählt wurde, damit der
        // "+ Weiteres Modul"-Button auch bestehende (angeklickte) Module
        // als Vorlage zum Duplizieren nutzen kann.
        const ud = getUserData(n);
        if (ud && ud.typ === 'pv_modul') {
            setLastPvModuleSize({ name: ud.name, w: ud.width_meter, h: ud.height_meter });
        }
    } else {
        updatePanelState(null); // Panel deaktivieren
    }
}

/**
 * Zerstört das aktuell ausgewählte Objekt und hebt die Auswahl auf.
 */
export function deleteSelectedNode() {
    deselectActiveLabel(); // Schließt das Label-Panel, falls es offen ist
    
    if (selectedNode) {
        selectedNode.destroy(); // Entfernt das Objekt vom Konva-Layer
        layer.batchDraw();
    }

    // Setzt den Zustand zurück (wählt "nichts" aus und deaktiviert das UI-Panel)
    selectNode(null);
    refreshAutoDimensions();
    refreshShadingSync();
}

/**
 * Verschiebt das ausgewählte Objekt um einen bestimmten Meter-Betrag.
 * @param {number} deltaX_m - Verschiebung in Metern auf der X-Achse
 * @param {number} deltaY_m - Verschiebung in Metern auf der Y-Achse
 */
export function nudgeSelectedNode(deltaX_m, deltaY_m) {
    if (!selectedNode) return;

    // 1. Maßstab und Pixel-Delta berechnen
    const scale = getActiveScale(); // Holt aktuellen Maßstab (z.B. 50 px/m)
    const deltaX_px = deltaX_m * scale;
    const deltaY_px = deltaY_m * scale;

    // 2. Objekt verschieben
    selectedNode.move({
        x: deltaX_px,
        y: deltaY_px
    });

    // 3. UI-Panel (X/Y-Werte) aktualisieren
    updatePanelState(selectedNode);
    layer.batchDraw();

    // 3b. WICHTIG: Die blaue Auswahl-Markierung (selectionBox) neu zeichnen.
    // Sie ist ein eigenes, einmalig positioniertes Konva-Rect auf dem
    // guideLayer (siehe highlightNode()) und wird NICHT automatisch von
    // selectedNode.move() mitverschoben. Ohne diesen Aufruf bleibt die Box
    // exakt an der alten Stelle stehen, während sich das Modul mit jedem
    // Tastendruck/Klick auf die Pfeil-Buttons weiter davon entfernt - genau
    // der gemeldete Bug ("das blaue drum herum rückt nicht mit").
    highlightNode(selectedNode, true);

    // 4. WICHTIG: Die userData (Meter-Werte) ebenfalls aktualisieren
    const ud = selectedNode.getAttr('userData');
    if (!ud) return;
    
    const pos = selectedNode.position();
    const offset = selectedNode.offset() || { x: 0, y: 0 };

    if (ud.typ === 'rechteck' || ud.typ === 'pv_modul') {
        ud.x_meter = (pos.x - offset.x) / scale;
        ud.y_meter = (pos.y - offset.y) / scale;
    } else { // polygon, kreis
        ud.x_meter = pos.x / scale;
        ud.y_meter = pos.y / scale;
    }
    selectedNode.setAttr('userData', ud);
    refreshAutoDimensions();
    refreshShadingSync();
}