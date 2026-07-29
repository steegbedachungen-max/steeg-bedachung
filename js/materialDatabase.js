// js/materialDatabase.js

/**
 * TEIL 1: Auswählbare Haupt-Dachdeckungen (für die Fläche)
 * Enthält jetzt alle zugehörigen Faktoren (relatedFactors).
 * Bei "Alternative" sind die Faktoren 0, da sie abgefragt werden.
 */
export const selectableMainTiles = [
    { 
        category: "Ziegel", 
        material: "Nelskamp R13S", 
        faktor: 13.8, // Stk/m²
        waste: 0.08, 
        einheit: "Stk",
        deckbreite_cm: 21.4,
        decklaenge_cm: "31,0 - 36,5",
        firstlattmass_cm: 4.0, // Herstellerangabe: Abstand oberste Traglatte zum Firstscheitelpunkt bei DN ≤30° (Verlegeanleitung R13S, S.6)
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Nelskamp R13S)", faktor: 2.7, einheit: "Stk" }, // Herstellerangabe (Verlegeanleitung R13S, S.4)
            "Grat": { category: "Ziegel", material: "Firstziegel (Nelskamp R13S)", faktor: 2.7, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Nelskamp R13S, links)", faktor: 3, einheit: "Stk" }, // Herstellerangabe
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Nelskamp R13S, rechts)", faktor: 3, einheit: "Stk" }
        }
    },
    { 
        category: "Ziegel", 
        material: "BRAAS Taunus", 
        faktor: 10, // Stk/m²
        waste: 0.08, 
        einheit: "Stk",
        deckbreite_cm: 30.0,
        decklaenge_cm: "31,2 - 34,5",
        firstlattmass_cm: 4.0,
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Taunus)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Taunus)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Taunus, links)", faktor: 3, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Taunus, rechts)", faktor: 3, einheit: "Stk" }
        }
    },
    { 
        category: "Ziegel", 
        material: "BAG Bari", 
        faktor: 10.5, // Stk/m²
        waste: 0.08, 
        einheit: "Stk",
        // Werte übernommen vom Nachfolgeprodukt "Röben Bari" (BAG wurde von
        // Röben Tonbaustoffe GmbH übernommen) - siehe materialSuggestions.js
        deckbreite_cm: 22.7,
        decklaenge_cm: "33,5 - 36,5",
        firstlattmass_cm: 4.0,
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BAG Bari)", faktor: 3, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BAG Bari)", faktor: 3, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BAG Bari, links)", faktor: 3, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BAG Bari, rechts)", faktor: 3, einheit: "Stk" }
        }
    },
    { 
        category: "Ziegel",
        material: "BAG Rheinland",
        faktor: 11.5, // Stk/m²
        waste: 0.08,
        einheit: "Stk",
        // Werte übernommen vom Nachfolgeprodukt "Röben Rheinland" (BAG wurde
        // von Röben Tonbaustoffe GmbH übernommen) - siehe materialSuggestions.js
        deckbreite_cm: 20.3,
        decklaenge_cm: "27,5 - 35,5",
        firstlattmass_cm: 4.0,
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BAG Rheinland)", faktor: 3, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BAG Rheinland)", faktor: 3, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BAG Rheinland, links)", faktor: 3, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BAG Rheinland, rechts)", faktor: 3, einheit: "Stk" }
        }
    },
    { 
        category: "Metall", 
        material: "Metall Scharen",
        faktor: 1.8,   // lfm/m²
        waste: 0.10,
        einheit: "lfm",
        relatedFactors: {
            // Metall hat keine Ziegel, daher leere Regeln oder Metall-Zubehör
            "First": { category: "Metall", material: "Firstblech (Metall)", faktor: 1, einheit: "m" },
            "Grat": { category: "Metall", material: "Gratblech (Metall)", faktor: 1, einheit: "m" },
            "Ortgang (links)": { category: "Metall", material: "Ortgangblech (Metall)", faktor: 1, einheit: "m" },
            "Ortgang (rechts)": { category: "Metall", material: "Ortgangblech (Metall)", faktor: 1, einheit: "m" }
        }
    },
    { 
        category: "Sonstiges", 
        material: "Alternative",
        faktor: 0, // Wird abgefragt
        waste: 0.08, 
        einheit: "Stk",
        relatedFactors: {
            // Faktoren werden abgefragt
            "First": { category: "Ziegel", material: "First (Alternative)", faktor: 0, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "First (Alternative)", faktor: 0, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Alternative, links)", faktor: 0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Alternative, rechts)", faktor: 0, einheit: "Stk" }
        }
    },

    // ==========================================================
    // Dämmung – auswählbar pro Skizze (neu)
    // ==========================================================
    {
        category: "Dämmung",
        material: "Aufsparrendämmung 160mm",
        faktor: 1.03, // m²/m² (inkl. Verschnitt)
        waste: 0,
        einheit: "m²"
    },
    {
        category: "Dämmung",
        material: "Unterspannbahn",
        faktor: 1.05, // m²/m² (inkl. 5% Verschnitt)
        waste: 0,
        einheit: "m²"
    },

    // ==========================================================
    // Metall-Positionen – mehrfach auswählbar pro Skizze (neu)
    // Faktor bezieht sich auf die Dachfläche der Skizze (m²), außer wo
    // durch die bereits automatische Beschriftungs-Zuordnung anders
    // sinnvoll (Traufe/Kehle/Wandanschluss laufen weiterhin zusätzlich
    // automatisch über die Segment-Beschriftung).
    // ==========================================================
    {
        category: "Metall",
        material: "Traufblech",
        faktor: 0.1, // lfm/m² - grobe Näherung, bitte pro Projekt prüfen; alternativ Traufe-Beschriftung nutzen
        waste: 0.05,
        einheit: "m"
    },
    {
        category: "Metall",
        material: "Rinne (Kunststoff)",
        faktor: 0.1, // lfm/m² - grobe Näherung, bitte pro Projekt prüfen
        waste: 0.05,
        einheit: "m"
    },
    {
        category: "Metall",
        material: "Rinne (Metall)",
        faktor: 0.1, // lfm/m² - grobe Näherung, bitte pro Projekt prüfen
        waste: 0.05,
        einheit: "m"
    },

    // ==========================================================
    // Bitumen/EPDM – Lagen für Flachdach-Aufbau (Mehrfachauswahl)
    //
    // Berechnung wird jetzt in ZWEI Positionen aufgeteilt:
    //   1. "Fläche": Dachfläche × Überlappungs-Faktor (ZVDH: 80mm/120mm
    //      Überlappung bei 1m-Bahnbreite -> Faktor ca. 1,105)
    //   2. "Rand-/Wandanschluss": Länge der Wandanschluss-/Randabschluss-
    //      Beschriftungen × angenommene Hochführungshöhe (randhochfuehrung_m),
    //      da die Bahn an Attika/Wänden hochgeführt werden muss (siehe
    //      Planungshinweise für Flachdächer).
    // Bitte Hochführungshöhe projektbezogen prüfen (übliche Werte 15-30cm).
    // ==========================================================
    {
        category: "Ziegel",
        eindeckungsart: "Bitumen/EPDM",
        material: "Dampfsperre",
        faktor: 1.1, // m²/m² - reiner Überlappungsfaktor (mind. 8cm)
        randhochfuehrung_m: 0.15, // Hochführungshöhe an Wänden/Attika in m
        waste: 0.1,
        einheit: "m²"
    },
    {
        category: "Ziegel",
        eindeckungsart: "Bitumen/EPDM",
        material: "1. Lage Bitumenbahn",
        faktor: 1.105, // m²/m² - ZVDH: Überlappung 80mm längs / 120mm quer
        randhochfuehrung_m: 0.3, // Hochführungshöhe an Wänden/Attika in m
        waste: 0.105,
        einheit: "m²"
    },
    {
        category: "Ziegel",
        eindeckungsart: "Bitumen/EPDM",
        material: "2. Lage Bitumenbahn",
        faktor: 1.105, // m²/m² - ZVDH: Überlappung 80mm längs / 120mm quer
        randhochfuehrung_m: 0.3, // Hochführungshöhe an Wänden/Attika in m
        waste: 0.105,
        einheit: "m²"
    },
    {
        category: "Ziegel",
        eindeckungsart: "Bitumen/EPDM",
        material: "EPDM-Dachbahn",
        faktor: 1.08, // m²/m² - EPDM meist in größeren, überlappungsärmeren Bahnen verlegt
        randhochfuehrung_m: 0.3, // Hochführungshöhe an Wänden/Attika in m
        waste: 0.08,
        einheit: "m²"
    },

    // ==========================================================
    // Zink/Alu – Stehfalzdeckung (Einzelauswahl, wie Ziegel/Pfanne)
    // Herleitung: Deckbreite/Nutzbreite bei Standard-Stehfalzprofilen ca.
    // 524mm/484mm = Faktor ca. 1,08 (Materialverbrauch durch den Falz selbst,
    // längs i.d.R. kein Verschnitt-Mehrbedarf, quer nur bei Bahnen > 7m).
    // Rand-/Wandanschluss separat wie bei Bitumen/EPDM berechnet.
    // ==========================================================
    {
        category: "Ziegel",
        eindeckungsart: "Zink/Alu",
        material: "Zinkblech (Stehfalz)",
        faktor: 1.176, // m²/m² - Nutzerangabe: Bandbreite 500mm / Deckbreite (Sichtfläche) 425mm = 1,176 (Materialverbrauch durch beidseitige Kantung/Stehfalz)
        deckbreite_cm: 42.5, // Deckbreite = sichtbare Fläche pro Schar nach dem Falzen
        bandbreite_cm: 50, // Bandbreite = Rohblech-Breite vor dem Falzen
        randhochfuehrung_m: 0.2, // Hochführungshöhe an Wänden/Attika in m
        waste: 0.176,
        einheit: "m²"
    },
    {
        category: "Ziegel",
        eindeckungsart: "Zink/Alu",
        material: "Alublech/Aluzink (Stehfalz)",
        faktor: 1.176, // m²/m² - Bandbreite 500mm / Deckbreite 425mm = 1,176 (gleiches Format wie Zinkblech)
        deckbreite_cm: 42.5, // Deckbreite = sichtbare Fläche pro Schar nach dem Falzen
        bandbreite_cm: 50, // Bandbreite = Rohblech-Breite vor dem Falzen
        randhochfuehrung_m: 0.2, // Hochführungshöhe an Wänden/Attika in m
        waste: 0.176,
        einheit: "m²"
    }
];


/**
 * TEIL 2: Materialstamm für Längen und Zubehör
 * (First, Grat und Ortgang wurden entfernt! Sie sind jetzt in TEIL 1)
 */
export const labelBasedMaterials = {
    // --- Längen-basierte Materialien ---
    "Traufe": [
        { category: "Metall", material: "Tropfblech (Zuschnitt 25)", faktor: 1, einheit: "m" }
    ],
    "Kehle": [
        { category: "Metall", material: "Kehlblech (Zuschnitt 50)", faktor: 1, einheit: "m" }
    ],
    "Wandanschluss": [
        { category: "Metall", material: "Wandanschlussblech", faktor: 1, einheit: "m" }
    ],
    
    // --- Flächen-Materialien, die *ZUSÄTZLICH* zur Hauptdeckung anfallen ---
    "Zusatzflaeche_Dämmung": [
         { category: "Dämmung", material: "Aufsparrendämmung 160mm", faktor: 1.03, einheit: "m²" }
    ],
    "Zusatzflaeche_Unterspannbahn": [
         { category: "Dämmung", material: "Unterspannbahn (inkl. 5% Verschnitt)", faktor: 1.05, einheit: "m²" }
    ],

    // --- Stück-basierte Materialien (aus Zubehör) ---
    "Kamin": [
        { category: "Metall", material: "Einfassung Kamin", faktor: 1, einheit: "Stk" }
    ],
    "Lüfter": [
        { category: "Sonstiges", material: "Sanitärlüfter (DN 100)", faktor: 1, einheit: "Stk" }
    ],
    "Wohnraumfenster": [
        { category: "Metall", material: "Eindeckrahmen", faktor: 1, einheit: "Stk" }
    ]
};