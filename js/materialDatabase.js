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
        material: "Aufsparrendämmung",
        faktor: 1.1, // m²/m² (inkl. ca. 10% Verschnitt für Zuschnitt an Rändern/Durchdringungen)
        deckbreite_cm: 100, // Plattenbreite
        decklaenge_cm: 238, // Plattenlänge (Standardformat 1,00m × 2,38m)
        waste: 0.1,
        einheit: "m²"
    },
    {
        category: "Dämmung",
        material: "Zwischensparrendämmung",
        // m²/m² - Die Dämmung liegt NUR im Gefach zwischen den Sparren, nicht
        // über dem Sparren selbst (Klemmfilz wird laut Isover mit 0,5-1cm
        // Übermaß auf den Sparrenabstand zugeschnitten und geklemmt). Bei
        // angenommenen 8cm Sparrenbreite und 60cm Sparrenabstand (Nutzerangabe):
        // Faktor = (60cm - 8cm) / 60cm = 0,867. Braucht also WENIGER Material
        // als die reine Dachfläche, nicht mehr! Bitte bei abweichender
        // Sparrenbreite/-abstand über "Materialien verwalten" anpassen.
        faktor: 0.867,
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
    // Traufblech/Rinne/Tropfblech werden automatisch über die Länge der
    // "Traufe"-Beschriftung berechnet (basedOnLabel + traufeFaktor, 1:1 zur
    // Traufe-Länge - dieselbe Zuordnung wie beim automatischen Tropfblech/
    // Kehlblech/Wandanschlussblech der Hauptdeckung). "faktor" bleibt als
    // Fallback erhalten (grobe Fläche/m²-Näherung), falls eine Skizze keine
    // "Traufe"-Beschriftung hat.
    // ==========================================================
    {
        // Traufblech: einfaches Kästchen (wie Rinne/Tropfblech) - keine
        // Traufe/Ortgang-Auswahl mehr, Menge wird immer über die
        // "Traufe"-Beschriftung berechnet.
        category: "Metall",
        material: "Traufblech",
        basedOnLabel: "Traufe",
        traufeFaktor: 0.2, // m² Traufblech pro lfm Traufe
        faktor: 0.1, // Fallback: m²/m² Dachfläche, falls keine "Traufe"-Beschriftung vorhanden ist
        waste: 0.05,
        einheit: "m²"
    },
    {
        // Vorher zwei getrennte Positionen ("Rinne (Kunststoff)"/"Rinne
        // (Metall)") - auf Wunsch zu einer einzigen, einfachen Position
        // zusammengefasst (ein Kästchen wie bei Traufblech/Tropfblech).
        category: "Metall",
        material: "Rinne",
        basedOnLabel: "Traufe",
        traufeFaktor: 1,
        faktor: 0.1,
        waste: 0.05,
        einheit: "m"
    },
    {
        category: "Metall",
        material: "Tropfblech",
        basedOnLabel: "Traufe",
        traufeFaktor: 0.1, // m² Tropfblech pro lfm Traufe
        faktor: 0.1,
        waste: 0.05,
        einheit: "m²"
    },
    {
        // Traufabschluss: einfaches Kästchen, Menge = Traufe-Länge x 0,25m
        // Zuschnittbreite (analog Rinne/Tropfblech/Traufblech).
        category: "Metall",
        material: "Traufabschluss",
        basedOnLabel: "Traufe",
        traufeFaktor: 0.25, // m² Traufabschluss pro lfm Traufe (Zuschnitt 0,25m)
        faktor: 0.1,
        waste: 0.05,
        einheit: "m²"
    },
    {
        // Ortgangblech: einfaches Kästchen, Menge = (Ortgang links+rechts
        // gemittelt + "Pult"-Beschriftung) x 0,25m Zuschnittbreite.
        // basedOnLabel: "Ortgang" ist ein Sonderwert (kein direkter
        // globalTotals-Schlüssel) - siehe Dispatch in aufmassManager.js
        // (renderMaterialPage / metallGroups.forEach), der zusätzlich zur
        // Ortgang-Länge auch die "Pult"-Beschriftung mitzählt (Pultdach-
        // Kante, deckungsgleich zum Ortgang bei einem Sparrendach).
        category: "Metall",
        material: "Ortgangblech",
        basedOnLabel: "Ortgang",
        traufeFaktor: 0.25, // m² Ortgangblech pro lfm Ortgang/Pult (Zuschnitt 0,25m)
        faktor: 0.1,
        waste: 0.05,
        einheit: "m²"
    },
    {
        // Scharen Zuschnitt: statt fixer Zuschnittgrößen wird beim Anhaken
        // im Metall-Auswahl-Modal per Abfrage Deckbreite (42,5cm oder
        // 52,5cm) und Decklänge (25/33/40/50cm) abgefragt und daraus die
        // Position berechnet (siehe openMetallChoiceModal() in
        // aufmassManager.js). "configurable" markiert diesen Eintrag als
        // reinen Auswahl-Auslöser, nicht als direkt zuweisbares Material.
        category: "Metall",
        material: "Scharen Zuschnitt",
        configurable: true,
        deckbreiteOptions_cm: [42.5, 52.5],
        decklaengeOptions_cm: [25, 33, 40, 50],
        einheit: "m²"
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
    // Schareneindeckung – flächige Eindeckung mit Metall-Scharen (ersetzt
    // Zink/Alu-Stehfalz). Deckbreite wählbar: 42,5cm oder 52,5cm - dieselben
    // Größen wie bei den einzelnen Scharen-Zuschnitten in den
    // Metall-Positionen. Bandbreite (Rohblech-Breite vor dem Zuschnitt) =
    // Deckbreite + 7,5cm Überdeckung (gleiche Zugabe wie dort).
    // Rand-/Wandanschluss separat wie bei Bitumen/EPDM berechnet.
    // ==========================================================
    {
        category: "Ziegel",
        eindeckungsart: "Schareneindeckung",
        material: "Schareneindeckung (Deckbreite 42,5cm)",
        faktor: 1.176, // m²/m² - Bandbreite 50cm / Deckbreite 42,5cm
        deckbreite_cm: 42.5,
        bandbreite_cm: 50,
        randhochfuehrung_m: 0.2, // Hochführungshöhe an Wänden/Attika in m
        waste: 0.176,
        einheit: "m²"
    },
    {
        category: "Ziegel",
        eindeckungsart: "Schareneindeckung",
        material: "Schareneindeckung (Deckbreite 52,5cm)",
        faktor: 1.143, // m²/m² - Bandbreite 60cm / Deckbreite 52,5cm
        deckbreite_cm: 52.5,
        bandbreite_cm: 60,
        randhochfuehrung_m: 0.2, // Hochführungshöhe an Wänden/Attika in m
        waste: 0.143,
        einheit: "m²"
    },

    // ==========================================================
    // Sandwichpaneele – Deckbreite fest 1,00m, Decklänge wird NICHT als feste
    // Katalog-Größe geführt, sondern individuell auf die tatsächliche
    // Ortganglänge (Dachlänge Traufe->First) zugeschnitten (siehe
    // "sandwichpanel"-Sonderberechnung in aufmassManager.js). Bei
    // unterschiedlich langer Traufe/First (z.B. Trapez-/Walmdach) wird die
    // Paneelanzahl nach der breiteren der beiden Kanten bemessen, damit auf
    // der schmaleren Seite ein Paneel passend zugeschnitten werden kann.
    // ==========================================================
    {
        category: "Ziegel",
        eindeckungsart: "Sandwichpaneele",
        material: "Sandwichpaneele",
        sandwichpanel: true,
        deckbreite_cm: 100,
        faktor: 1.08, // Fallback: m²/m² Dachfläche, falls weder Traufe/First noch Ortgang-Beschriftung vorhanden ist
        waste: 0.08,
        einheit: "m²"
    }
];


/**
 * TEIL 2: Materialstamm für Längen und Zubehör
 * (First, Grat und Ortgang wurden entfernt! Sie sind jetzt in TEIL 1)
 */
export const labelBasedMaterials = {
    // --- Längen-basierte Materialien ---
    // "Traufe" -> Tropfblech wird NICHT mehr automatisch bei jeder Ziegel-
    // Hauptdeckung mitgezählt, da Tropfblech (wie Rinne/Traufblech) bereits
    // separat und bewusst über "Metall wählen" (Metall-Positionen) pro
    // Skizze ausgewählt werden kann - eine automatische Zusatzposition würde
    // sich sonst mit der manuellen Auswahl doppeln.
    "Kehle": [
        { category: "Metall", material: "Kehlblech (Zuschnitt 50)", faktor: 1, einheit: "m" }
    ],
    "Wandanschluss": [
        { category: "Metall", material: "Wandanschlussblech", faktor: 1, einheit: "m" }
    ],
    
    // --- Flächen-Materialien, die *ZUSÄTZLICH* zur Hauptdeckung anfallen ---
    "Zusatzflaeche_Dämmung": [
         { category: "Dämmung", material: "Aufsparrendämmung", faktor: 1.03, einheit: "m²" }
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