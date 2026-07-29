let onDataChangedCallback = null;


// js/materialDataManager.js

import { selectableMainTiles as defaultMaterials, labelBasedMaterials } from './materialDatabase.js';
import { knownMaterialSuggestions, findMaterialSuggestion } from './materialSuggestions.js';

const STORAGE_KEY = 'customMaterialDatabase';

let currentMaterials = [];

// --- Core Functions: Load, Get, Save ---

function loadMaterials() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            currentMaterials = JSON.parse(saved);
            console.log('Custom material database loaded from localStorage.');
            migrateMissingTechnicalFields();
        } else {
            // Deep copy to avoid modifying the original default array
            currentMaterials = JSON.parse(JSON.stringify(defaultMaterials));
            console.log('Initialized with default material database.');
        }
    } catch (e) {
        console.error('Failed to load or parse material database:', e);
        currentMaterials = JSON.parse(JSON.stringify(defaultMaterials));
    }
}

/**
 * Trägt fehlende technische Zusatzfelder (Deckbreite, Decklänge, Firstlattmaß)
 * aus den Code-Standardwerten (materialDatabase.js) in bereits im localStorage
 * gespeicherte Materialien nach. Diese Felder wurden nachträglich eingeführt -
 * ältere, im Browser gespeicherte Materiallisten kennen sie noch nicht und
 * würden sonst dauerhaft bei der einfachen Durchschnittsfaktor-Berechnung
 * bleiben, obwohl der Code-Stand längst präzisere Daten hat.
 * Bereits vom Nutzer angepasste Werte (faktor, einheit, category, First-/
 * Ortgang-Faktoren) werden dabei NICHT überschrieben - nur fehlende Felder
 * werden ergänzt.
 */
function migrateMissingTechnicalFields() {
    let migrated = false;
    const TECH_FIELDS = ['deckbreite_cm', 'decklaenge_cm', 'firstlattmass_cm', 'randhochfuehrung_m', 'bandbreite_cm'];

    currentMaterials.forEach(mat => {
        const defaultMatch = defaultMaterials.find(d => d.material === mat.material);
        if (!defaultMatch) return;
        TECH_FIELDS.forEach(field => {
            if (mat[field] === undefined && defaultMatch[field] !== undefined) {
                mat[field] = defaultMatch[field];
                migrated = true;
            }
        });
    });

    // Neue Zwischenauswahl "Art der Eindeckung" (Ziegel/Pfanne, Bitumen/EPDM,
    // Zink/Alu): Alle bereits vorhandenen Materialien der Kategorie "Ziegel"
    // waren bisher ausschließlich Dachziegel/-steine - werden also einmalig
    // automatisch auf "Ziegel/Pfanne" gesetzt, damit sie in der neuen
    // Zwischenauswahl weiterhin auffindbar bleiben.
    currentMaterials.forEach(mat => {
        if (mat.category === 'Ziegel' && mat.eindeckungsart === undefined) {
            mat.eindeckungsart = 'Ziegel/Pfanne';
            migrated = true;
        }
    });

    if (applyKnownCorrections()) migrated = true;
    if (addMissingNewDefaultMaterials()) migrated = true;

    if (migrated) {
        saveMaterials();
        console.log('Materialdatenbank: Fehlende/veraltete technische Angaben automatisch aus den Code-Standardwerten nachgetragen.');
    }
}

/**
 * Trägt neu hinzugekommene Standard-Materialien nach, die es zum Zeitpunkt
 * der letzten localStorage-Speicherung des Nutzers noch nicht gab (z.B. die
 * neuen Bitumen/EPDM-Lagen). Nur gezielt namentlich gelistete, bewusst neu
 * eingeführte Materialien werden ergänzt - KEIN pauschales "alles fehlende
 * aus defaultMaterials nachtragen", damit vom Nutzer bewusst gelöschte
 * Materialien nicht versehentlich wieder auftauchen.
 */
function addMissingNewDefaultMaterials() {
    let added = false;
    const NEU_HINZUGEFUEGTE_MATERIALNAMEN = [
        'Dampfsperre',
        '1. Lage Bitumenbahn',
        '2. Lage Bitumenbahn',
        'EPDM-Dachbahn',
        'Zinkblech (Stehfalz)',
        'Alublech/Aluzink (Stehfalz)'
    ];

    NEU_HINZUGEFUEGTE_MATERIALNAMEN.forEach(name => {
        const alreadyExists = currentMaterials.some(m => m.material === name);
        if (alreadyExists) return;
        const defaultMatch = defaultMaterials.find(d => d.material === name);
        if (!defaultMatch) return;
        currentMaterials.push(JSON.parse(JSON.stringify(defaultMatch)));
        added = true;
    });

    if (added) {
        console.log('Materialdatenbank: Neue Standard-Materialien (z.B. Bitumen/EPDM-Lagen) automatisch ergänzt.');
    }
    return added;
}

/**
 * Trägt gezielte Korrekturen an bereits VORHANDENEN, aber inzwischen als
 * veraltet/ungenau erkannten Werten nach (z.B. First-/Grat-Faktor, der zuerst
 * geschätzt und später durch eine echte Herstellerangabe ersetzt wurde).
 * Anders als migrateMissingTechnicalFields() greift das auch bei bereits
 * gesetzten Feldern - aber NUR, wenn der gespeicherte Wert noch exakt dem
 * alten, bekannten Platzhalter entspricht. Wurde der Wert vom Nutzer manuell
 * auf einen anderen Wert geändert, bleibt er unangetastet.
 */
function applyKnownCorrections() {
    let corrected = false;
    const CORRECTIONS = [
        // { material, path: ['relatedFactors','First','faktor'], oldValue, newValue }
        { material: 'Nelskamp R13S', path: ['relatedFactors', 'First', 'faktor'], oldValue: 3, newValue: 2.7 },
        { material: 'Nelskamp R13S', path: ['relatedFactors', 'Grat', 'faktor'], oldValue: 3, newValue: 2.7 },
        // ZVDH-basierte Verschnitt-Korrektur für Bitumen/EPDM-Lagen (siehe materialDatabase.js)
        // - jetzt reiner Überlappungsfaktor, da Rand-/Wandanschluss separat berechnet wird
        { material: 'Dampfsperre', path: ['faktor'], oldValue: 1.15, newValue: 1.1 },
        { material: '1. Lage Bitumenbahn', path: ['faktor'], oldValue: 1.1, newValue: 1.105 },
        { material: '1. Lage Bitumenbahn', path: ['faktor'], oldValue: 1.24, newValue: 1.105 },
        { material: '2. Lage Bitumenbahn', path: ['faktor'], oldValue: 1.1, newValue: 1.105 },
        { material: '2. Lage Bitumenbahn', path: ['faktor'], oldValue: 1.24, newValue: 1.105 },
        { material: 'EPDM-Dachbahn', path: ['faktor'], oldValue: 1.15, newValue: 1.08 },
        { material: 'EPDM-Dachbahn', path: ['faktor'], oldValue: 1.2, newValue: 1.08 },
        // Nutzerangabe: Bandbreite 500mm / Deckbreite 425mm bei Zinkblech-Scharen
        { material: 'Zinkblech (Stehfalz)', path: ['faktor'], oldValue: 1.08, newValue: 1.176 },
        { material: 'Alublech/Aluzink (Stehfalz)', path: ['faktor'], oldValue: 1.08, newValue: 1.176 },
    ];

    CORRECTIONS.forEach(({ material, path, oldValue, newValue }) => {
        const mat = currentMaterials.find(m => m.material === material);
        if (!mat) return;
        let obj = mat;
        for (let i = 0; i < path.length - 1; i++) {
            if (!obj[path[i]]) return;
            obj = obj[path[i]];
        }
        const lastKey = path[path.length - 1];
        if (obj[lastKey] === oldValue) {
            obj[lastKey] = newValue;
            corrected = true;
        }
    });

    if (corrected) {
        console.log('Materialdatenbank: Bekannte veraltete Platzhalterwerte automatisch durch aktuelle Herstellerangaben ersetzt.');
    }
    return corrected;
}

function saveMaterials() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentMaterials));
    } catch (e) {
        console.error('Failed to save material database to localStorage:', e);
        window.showAlert('Speicherfehler', 'Die Materialdatenbank konnte nicht gespeichert werden. Der Browser-Speicher ist möglicherweise voll.');
    }
}

export function getSelectableMainTiles() {
    // Always read directly from localStorage to ensure the freshest data is used.
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Error parsing materials from localStorage for getSelectableMainTiles. Falling back to default.', e);
            return JSON.parse(JSON.stringify(defaultMaterials));
        }
    }
    // Fallback to the in-memory default if nothing is in storage yet.
    return currentMaterials;
}

/**
 * Wie getSelectableMainTiles(), aber nur die als Favorit markierten
 * Materialien (favorite !== false). Wird für die Liste "Haupt-Dachziegel
 * auswählen" genutzt, damit diese trotz wachsender Herstellerdatenbank
 * übersichtlich bleibt. Materialien ohne "favorite"-Feld (ältere/Standard-
 * Einträge) gelten als Favorit.
 */
export function getFavoriteMainTiles() {
    return getSelectableMainTiles().filter(m => m.favorite !== false);
}

// --- UI Functions for Management Modal ---

function openManagementModal() {
    populateMaterialList();
    document.getElementById('material-management-modal').style.display = 'block';
}

function closeManagementModal() {
    document.getElementById('material-management-modal').style.display = 'none';
    // Notify the app that data may have changed, triggering a re-render
    if (onDataChangedCallback) {
        onDataChangedCallback();
    }
}

// --- UI Functions for Browsing the Manufacturer Database ---

/**
 * Wandelt einen Eintrag aus der recherchierten Herstellerdatenbank
 * (materialSuggestions.js) in das Format um, das die App für Materialien
 * in currentMaterials erwartet (inkl. First/Grat/Ortgang-Platzhaltern,
 * falls dafür keine recherchierten Werte vorliegen).
 */
function suggestionToMaterial(suggestion) {
    const rf = suggestion.relatedFactors || {};
    const makeRF = (key, defaultMaterialName) => ({
        category: rf[key]?.category || suggestion.category,
        material: rf[key]?.material || defaultMaterialName,
        faktor: rf[key]?.faktor ?? 0,
        einheit: rf[key]?.einheit || 'Stk'
    });
    return {
        category: suggestion.category,
        eindeckungsart: suggestion.eindeckungsart || (suggestion.category === 'Ziegel' ? 'Ziegel/Pfanne' : undefined),
        material: suggestion.material,
        faktor: suggestion.faktor,
        einheit: suggestion.einheit,
        waste: suggestion.waste ?? 0.08,
        favorite: false, // Aus der Herstellerdatenbank hinzugefügte Materialien sind
                         // standardmäßig kein Favorit, damit "Haupt-Dachziegel
                         // auswählen" übersichtlich bleibt. Über den Stern in
                         // "Materialien verwalten" lässt sich das jederzeit ändern.
        relatedFactors: {
            "First": makeRF("First", `Firstziegel (${suggestion.material})`),
            "Grat": makeRF("Grat", `Firstziegel (${suggestion.material})`),
            "Ortgang (links)": makeRF("Ortgang (links)", `Ortgang (${suggestion.material}, links)`),
            "Ortgang (rechts)": makeRF("Ortgang (rechts)", `Ortgang (${suggestion.material}, rechts)`)
        }
    };
}

function populateBrowseList(filterText = '') {
    const listContainer = document.getElementById('material-browse-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const normalized = filterText.trim().toLowerCase();
    const filtered = knownMaterialSuggestions.filter(m => m.material.toLowerCase().includes(normalized));

    if (filtered.length === 0) {
        listContainer.innerHTML = '<p style="color:#888; margin: 8px 0;">Keine Treffer.</p>';
        return;
    }

    filtered.forEach(suggestion => {
        const alreadyAdded = currentMaterials.some(m => m.material === suggestion.material);

        const item = document.createElement('div');
        item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; gap:10px; padding:8px; border-bottom:1px solid #eee;';

        const info = document.createElement('div');
        info.innerHTML = `<strong>${suggestion.material}</strong><br><span style="font-size:0.85em; color:#666;">${suggestion.faktor} Stk/m²${suggestion.category ? ' · ' + suggestion.category : ''}</span>`;
        item.appendChild(info);

        const btn = document.createElement('button');
        if (alreadyAdded) {
            btn.textContent = '✓ Hinzugefügt';
            btn.disabled = true;
            btn.style.cssText = 'white-space: nowrap; color: #28a745; background: none; border: 1px solid #28a745;';
        } else {
            btn.textContent = '+ Hinzufügen';
            btn.style.whiteSpace = 'nowrap';
            btn.onclick = () => {
                currentMaterials.push(suggestionToMaterial(suggestion));
                saveMaterials();
                populateBrowseList(document.getElementById('material-browse-search').value);
                populateMaterialList();
                if (onDataChangedCallback) onDataChangedCallback();
            };
        }
        item.appendChild(btn);
        listContainer.appendChild(item);
    });
}

function openBrowseModal() {
    const searchInput = document.getElementById('material-browse-search');
    if (searchInput) searchInput.value = '';
    populateBrowseList('');
    document.getElementById('material-browse-modal').style.display = 'block';
}

function closeBrowseModal() {
    document.getElementById('material-browse-modal').style.display = 'none';
}

function populateMaterialList() {
    const listContainer = document.getElementById('material-management-list');
    listContainer.innerHTML = ''; // Clear list

    currentMaterials.forEach((material, index) => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '8px';
        item.style.borderBottom = '1px solid #eee';

        const nameWrap = document.createElement('div');
        nameWrap.style.cssText = 'display:flex; align-items:center; gap:8px;';

        // Favoriten-Stern: bestimmt, ob das Material bei "Haupt-Dachziegel
        // auswählen" angezeigt wird. Fehlt das Feld (ältere/Standard-
        // Materialien), gilt es als Favorit (true).
        const isFavorite = material.favorite !== false;
        const favBtn = document.createElement('button');
        favBtn.textContent = isFavorite ? '★' : '☆';
        favBtn.title = isFavorite
            ? 'Favorit - wird bei "Haupt-Dachziegel auswählen" angezeigt. Klicken zum Entfernen.'
            : 'Kein Favorit - wird bei "Haupt-Dachziegel auswählen" ausgeblendet. Klicken zum Hinzufügen.';
        favBtn.style.cssText = `background:none; border:none; cursor:pointer; font-size:1.2em; color:${isFavorite ? '#f1c40f' : '#ccc'}; padding:0;`;
        favBtn.onclick = () => {
            material.favorite = !isFavorite;
            saveMaterials();
            populateMaterialList();
        };
        nameWrap.appendChild(favBtn);

        const name = document.createElement('span');
        name.textContent = material.material;
        nameWrap.appendChild(name);

        item.appendChild(nameWrap);

        const actions = document.createElement('div');
        const editButton = document.createElement('button');
        editButton.textContent = '✏️ Bearbeiten';
        editButton.onclick = () => openEditModal(index);
        actions.appendChild(editButton);

        // Prevent deleting the last item and the 'Alternative' item
        if (currentMaterials.length > 1 && material.material !== 'Alternative') {
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '🗑️ Löschen';
            deleteButton.style.marginLeft = '5px';
            deleteButton.onclick = () => deleteMaterial(index);
            actions.appendChild(deleteButton);
        }

        item.appendChild(actions);
        listContainer.appendChild(item);
    });
}

async function deleteMaterial(index) {
    const materialToDelete = currentMaterials[index];
    const confirmed = await window.showConfirm('Material löschen?', `Möchten Sie das Material "${materialToDelete.material}" wirklich endgültig löschen?`);
    if (confirmed) {
        currentMaterials.splice(index, 1);
        saveMaterials();
        populateMaterialList();
    }
}

// --- UI Functions for Edit/Add Modal ---

let editingIndex = null; // null for adding, index for editing

function openEditModal(index = null) {
    editingIndex = index;
    const modal = document.getElementById('material-edit-modal');
    const title = document.getElementById('material-edit-title');

    // Alten Hinweistext (von einem zuvor bearbeiteten/nachgeschlagenen
    // Material) immer zurücksetzen, damit hier nie veraltete Werte eines
    // anderen Materials stehen bleiben.
    const hintReset = document.getElementById('material-suggestion-hint');
    if (hintReset) hintReset.style.display = 'none';

    if (index === null) { // Adding new material
        title.textContent = 'Neues Material hinzufügen';
        // Clear all fields for a new entry as requested by the user
        document.getElementById('material-edit-category').value = '';
        document.getElementById('material-edit-eindeckungsart').value = '';
        document.getElementById('material-edit-material').value = '';
        document.getElementById('material-edit-faktor').value = '';
        document.getElementById('material-edit-einheit').value = '';
        document.getElementById('material-edit-deckbreite').value = '';
        document.getElementById('material-edit-decklaenge').value = '';
        document.getElementById('material-edit-trauflattmass').value = '';
        document.getElementById('material-edit-firstlattmass').value = '';
        document.getElementById('material-edit-first-faktor').value = '';
        document.getElementById('material-edit-first-einheit').value = '';
        document.getElementById('material-edit-ortgang-links-faktor').value = '';
        document.getElementById('material-edit-ortgang-rechts-faktor').value = '';
    } else { // Editing existing material
        const material = currentMaterials[index];
        title.textContent = 'Material bearbeiten';
        document.getElementById('material-edit-category').value = material.category || '';
        document.getElementById('material-edit-eindeckungsart').value = material.eindeckungsart || '';
        document.getElementById('material-edit-material').value = material.material || '';
        document.getElementById('material-edit-faktor').value = material.faktor || '0';
        document.getElementById('material-edit-einheit').value = material.einheit || '';
        document.getElementById('material-edit-deckbreite').value = material.deckbreite_cm ?? '';
        document.getElementById('material-edit-decklaenge').value = material.decklaenge_cm ?? '';
        document.getElementById('material-edit-trauflattmass').value = material.trauflattmass_cm ?? '';
        document.getElementById('material-edit-firstlattmass').value = material.firstlattmass_cm ?? '';
        document.getElementById('material-edit-first-faktor').value = material.relatedFactors?.First?.faktor || '0';
        document.getElementById('material-edit-first-einheit').value = material.relatedFactors?.First?.einheit || 'Stk';
        document.getElementById('material-edit-ortgang-links-faktor').value = material.relatedFactors?.['Ortgang (links)']?.faktor || '0';
        document.getElementById('material-edit-ortgang-rechts-faktor').value = material.relatedFactors?.['Ortgang (rechts)']?.faktor || '0';
    }
    
    // Dynamically populate category suggestions with a fixed order
    const categoryDatalist = document.getElementById('category-suggestions');
    categoryDatalist.innerHTML = ''; // Clear existing options

    // 1. Define the desired fixed order
    const fixedOrder = ["Ziegel", "Dämmung", "Metall", "Sonstiges"];

    // 2. Gather all unique categories from all sources
    const mainCategories = currentMaterials.map(m => m.category);
    const labelBasedCategories = [];
    for (const key in labelBasedMaterials) {
        if (Array.isArray(labelBasedMaterials[key])) {
            labelBasedMaterials[key].forEach(mat => {
                if (mat.category) {
                    labelBasedCategories.push(mat.category);
                }
            });
        }
    }
    const allUniqueCategories = new Set([...mainCategories, ...labelBasedCategories]);

    // 3. Build the sorted list
    const sortedCategories = [];
    // Add fixed-order categories first if they exist
    fixedOrder.forEach(category => {
        if (allUniqueCategories.has(category)) {
            sortedCategories.push(category);
            allUniqueCategories.delete(category); // Remove it so it's not added again
        }
    });

    // Add any remaining (custom) categories, sorted alphabetically
    const remainingCategories = Array.from(allUniqueCategories).sort((a, b) => a.localeCompare(b));
    sortedCategories.push(...remainingCategories);

    // 4. Populate the datalist with the sorted list
    sortedCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        categoryDatalist.appendChild(option);
    });

    // Dynamically populate unit suggestions
    const unitDatalist = document.getElementById('unit-suggestions');
    unitDatalist.innerHTML = ''; // Clear existing options
    const uniqueUnits = new Set();
    currentMaterials.forEach(m => {
        if (m.einheit) uniqueUnits.add(m.einheit);
        if (m.relatedFactors?.First?.einheit) uniqueUnits.add(m.relatedFactors.First.einheit);
    });
    const sortedUnits = Array.from(uniqueUnits).sort((a, b) => a.localeCompare(b));
    sortedUnits.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit;
        unitDatalist.appendChild(option);
    });

    // Dynamically populate known-material name suggestions (für Autovervollständigung
    // mit recherchierten Herstellerdaten, siehe materialSuggestions.js)
    const materialNameDatalist = document.getElementById('material-name-suggestions');
    if (materialNameDatalist) {
        materialNameDatalist.innerHTML = '';
        knownMaterialSuggestions.forEach(m => {
            const option = document.createElement('option');
            option.value = m.material;
            materialNameDatalist.appendChild(option);
        });
    }

    modal.style.display = 'block';
}

/**
 * Prüft, ob der eingegebene Materialname einem bekannten, recherchierten
 * Modell entspricht, und füllt die restlichen Felder automatisch aus.
 * Greift nur beim NEU-Anlegen (nicht beim Bearbeiten vorhandener Materialien),
 * damit keine bereits individuell angepassten Werte überschrieben werden.
 */
function tryAutoFillFromKnownMaterial() {
    const hint = document.getElementById('material-suggestion-hint');
    if (editingIndex !== null) {
        if (hint) hint.style.display = 'none';
        return;
    }

    const materialInput = document.getElementById('material-edit-material');
    const suggestion = findMaterialSuggestion(materialInput.value);

    if (!suggestion) {
        if (hint) hint.style.display = 'none';
        return;
    }

    document.getElementById('material-edit-category').value = suggestion.category || '';
    document.getElementById('material-edit-faktor').value = suggestion.faktor ?? '';
    document.getElementById('material-edit-einheit').value = suggestion.einheit || '';
    document.getElementById('material-edit-deckbreite').value = suggestion.deckbreite_cm ?? '';
    document.getElementById('material-edit-decklaenge').value = suggestion.decklaenge_cm ?? '';
    document.getElementById('material-edit-trauflattmass').value = suggestion.trauflattmass_cm ?? '';
    document.getElementById('material-edit-firstlattmass').value = suggestion.firstlattmass_cm ?? '';
    document.getElementById('material-edit-eindeckungsart').value = suggestion.eindeckungsart || (suggestion.category === 'Ziegel' ? 'Ziegel/Pfanne' : '');
    document.getElementById('material-edit-first-faktor').value = suggestion.relatedFactors?.First?.faktor ?? '';
    document.getElementById('material-edit-first-einheit').value = suggestion.relatedFactors?.First?.einheit || 'Stk';
    document.getElementById('material-edit-ortgang-links-faktor').value = suggestion.relatedFactors?.['Ortgang (links)']?.faktor ?? '';
    document.getElementById('material-edit-ortgang-rechts-faktor').value = suggestion.relatedFactors?.['Ortgang (rechts)']?.faktor ?? '';

    if (hint) {
        let extra = '';
        const parts = [];
        if (suggestion.decklaenge_cm !== undefined) parts.push(`Decklänge ${suggestion.decklaenge_cm} cm`);
        if (suggestion.deckbreite_cm !== undefined) parts.push(`Deckbreite ${suggestion.deckbreite_cm} cm`);
        if (suggestion.trauflattmass_cm !== undefined) parts.push(`Trauflattmaß ${suggestion.trauflattmass_cm} cm`);
        if (suggestion.firstlattmass_cm !== undefined) parts.push(`Firstlattmaß ${suggestion.firstlattmass_cm} cm`);
        if (parts.length > 0) {
            extra = ` (${parts.join(', ')})`;
        }
        if (suggestion.relatedFactorsEstimated) {
            hint.style.color = '#b8860b';
            hint.textContent = `⚠ Flächen-Faktor aus Herstellerangaben übernommen${extra}. First-/Grat-/Ortgang-Werte sind KEINE Herstellerangabe, sondern eine branchenübliche Faustregel (2,5 Stk/m First/Grat, 3,0 Stk/m Ortgang) – bitte vor Verwendung unbedingt mit dem Datenblatt des Herstellers abgleichen.`;
        } else if (suggestion.relatedFactors) {
            hint.style.color = '#28a745';
            hint.textContent = `✓ Technische Daten aus Herstellerangaben übernommen${extra} – bitte vor Verwendung mit dem aktuellen Datenblatt abgleichen.`;
        } else {
            hint.style.color = '#28a745';
            hint.textContent = `✓ Flächen-Faktor aus Herstellerangaben übernommen${extra}. First-/Grat-/Ortgang-Werte konnten nicht sicher recherchiert werden – bitte manuell ergänzen.`;
        }
        hint.style.display = 'block';
    }
}

function closeEditModal() {
    document.getElementById('material-edit-modal').style.display = 'none';
    editingIndex = null;
}

async function saveMaterialFromModal() {
    const materialName = document.getElementById('material-edit-material').value.trim();
    if (!materialName) {
        await window.showAlert('Fehler', 'Bitte geben Sie einen Materialnamen an.');
        return;
    }

    // Lattmaß-Felder sind optional - nur setzen, wenn tatsächlich ausgefüllt,
    // damit z.B. der Reihen-Berechnungs-Fallback (34cm Annahme) korrekt
    // erkennt, ob ein echtes Trauflattmaß hinterlegt wurde oder nicht.
    const deckbreiteInput = document.getElementById('material-edit-deckbreite').value.trim();
    const decklaengeInput = document.getElementById('material-edit-decklaenge').value.trim();
    const trauflattmassInput = document.getElementById('material-edit-trauflattmass').value.trim();
    const firstlattmassInput = document.getElementById('material-edit-firstlattmass').value.trim();

    const newMaterial = {
        category: document.getElementById('material-edit-category').value.trim() || 'Sonstiges',
        material: materialName,
        faktor: parseFloat(document.getElementById('material-edit-faktor').value) || 0,
        einheit: document.getElementById('material-edit-einheit').value.trim() || 'Stk',
        waste: 0.08, // Default waste
        relatedFactors: {
            "First": {
                category: document.getElementById('material-edit-category').value.trim(),
                material: `Firstziegel (${materialName})`,
                faktor: parseFloat(document.getElementById('material-edit-first-faktor').value) || 0,
                einheit: document.getElementById('material-edit-first-einheit').value.trim() || 'Stk'
            },
            "Grat": {
                category: document.getElementById('material-edit-category').value.trim(),
                material: `Firstziegel (${materialName})`,
                faktor: parseFloat(document.getElementById('material-edit-first-faktor').value) || 0,
                einheit: document.getElementById('material-edit-first-einheit').value.trim() || 'Stk'
            },
            "Ortgang (links)": {
                category: document.getElementById('material-edit-category').value.trim(),
                material: `Ortgang (${materialName}, links)`,
                faktor: parseFloat(document.getElementById('material-edit-ortgang-links-faktor').value) || 0,
                einheit: document.getElementById('material-edit-first-einheit').value.trim() || 'Stk'
            },
            "Ortgang (rechts)": {
                category: document.getElementById('material-edit-category').value.trim(),
                material: `Ortgang (${materialName}, rechts)`,
                faktor: parseFloat(document.getElementById('material-edit-ortgang-rechts-faktor').value) || 0,
                einheit: document.getElementById('material-edit-first-einheit').value.trim() || 'Stk'
            }
        }
    };

    if (deckbreiteInput !== '') {
        const val = parseFloat(deckbreiteInput.replace(',', '.'));
        if (!isNaN(val)) newMaterial.deckbreite_cm = val;
    }
    if (decklaengeInput !== '') {
        newMaterial.decklaenge_cm = decklaengeInput; // als String gespeichert (kann Spanne sein, z.B. "31,0 - 36,5")
    }
    if (trauflattmassInput !== '') {
        newMaterial.trauflattmass_cm = trauflattmassInput; // als String gespeichert (kann Spanne sein)
    }
    if (firstlattmassInput !== '') {
        const val = parseFloat(firstlattmassInput.replace(',', '.'));
        if (!isNaN(val)) newMaterial.firstlattmass_cm = val;
    }
    const eindeckungsartInput = document.getElementById('material-edit-eindeckungsart').value;
    if (eindeckungsartInput !== '') {
        newMaterial.eindeckungsart = eindeckungsartInput;
    }

    if (editingIndex === null) { // Adding new
        currentMaterials.push(newMaterial);
    } else { // Editing existing
        currentMaterials[editingIndex] = newMaterial;
    }

    saveMaterials();
    populateMaterialList();
    closeEditModal();
}

// --- Initialization ---

export function initMaterialDataManager() {
    // Load materials at startup
    loadMaterials();

    // Add event listeners
    document.getElementById('btn-manage-materials').addEventListener('click', openManagementModal);
    document.getElementById('btn-close-material-management').addEventListener('click', closeManagementModal);
    document.getElementById('btn-add-new-material').addEventListener('click', () => openEditModal(null));
    document.getElementById('btn-save-material-edit').addEventListener('click', saveMaterialFromModal);
    document.getElementById('btn-cancel-material-edit').addEventListener('click', closeEditModal);
    document.getElementById('material-edit-material')?.addEventListener('input', tryAutoFillFromKnownMaterial);
    document.getElementById('material-edit-material')?.addEventListener('change', tryAutoFillFromKnownMaterial);
    document.getElementById('btn-browse-material-db')?.addEventListener('click', openBrowseModal);
    document.getElementById('btn-close-material-browse')?.addEventListener('click', closeBrowseModal);
    document.getElementById('material-browse-search')?.addEventListener('input', (e) => populateBrowseList(e.target.value));
    
    console.log('Material Data Manager Initialized.');
}


export function setOnDataChangedCallback(callback) {
    onDataChangedCallback = callback;
}