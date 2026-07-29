// js/materialSuggestions.js
//
// Kuratierte Liste bekannter Dachziegel-/Materialmodelle mit recherchierten
// technischen Daten (aus Herstellerunterlagen). Wird im "Material bearbeiten"-
// Dialog genutzt, um beim Eintippen eines bekannten Namens (z.B. "Jacobi
// Walther Stylist") automatisch Kategorie, Faktor, Einheit sowie First-/
// Grat-/Ortgang-Werte vorzuschlagen – statt sie manuell nachschlagen und
// eintippen zu müssen.
//
// WICHTIG: Diese Werte stammen aus öffentlich zugänglichen Hersteller-
// Datenblättern zum Zeitpunkt der Recherche. Sie können je nach Serie,
// Charge oder Verlegeart leicht abweichen (z.B. Stückbedarf/m² wird von
// Herstellern oft als Spanne angegeben - hier wird ein Mittelwert genutzt).
// Vor dem endgültigen Einsatz in der Kalkulation bitte gegen das aktuelle
// Datenblatt des Herstellers prüfen.
//
// Neue Modelle können hier einfach nach demselben Muster ergänzt werden.
export const knownMaterialSuggestions = [
    // ==========================================================
    // Jacobi Walther – Tondachziegel (komplettes Modellprogramm)
    // Quelle: Jacobi Walther Dachziegel – Katalog_Dachziegel_092023.pdf
    // (Modellübersicht, S. 14), Werke Bilshausen & Langenzenn
    // ==========================================================
    {
        category: "Ziegel",
        material: "Jacobi J160",
        faktor: 12.3, // Herstellerangabe: 11,8 - 12,8 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 23.4,
        decklaenge_cm: "33,4 - 36,4",
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First/Ortgang: Kleine-Technik_technischeInfos_Verarbeitungshinweise-1.pdf",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi J160)", faktor: 2.7, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi J160)", faktor: 2.7, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Jacobi J160, links)", faktor: 2.7, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Jacobi J160, rechts)", faktor: 2.7, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Jacobi J11v",
        faktor: 11.65, // Herstellerangabe: 11,1 - 12,2 Stk/m² (Hagelwiderstandsklasse 5); zweite Formatvariante 23,6cm/11,7-12,8 Stk/m² ebenfalls verfügbar
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 24.6,
        decklaenge_cm: "33,3 - 36,5",
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First/Ortgang: Kleine-Technik_technischeInfos_Verarbeitungshinweise-1.pdf",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi J11v)", faktor: 2.7, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi J11v)", faktor: 2.7, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Jacobi J11v, links)", faktor: 2.7, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Jacobi J11v, rechts)", faktor: 2.7, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Jacobi J13v",
        faktor: 13.8, // Herstellerangabe: 13,2 - 14,4 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 21.3,
        decklaenge_cm: "32,6 - 35,6",
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First/Ortgang: Kleine-Technik_technischeInfos_Verarbeitungshinweise-1.pdf",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi J13v)", faktor: 2.8, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi J13v)", faktor: 2.8, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Jacobi J13v, links)", faktor: 2.8, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Jacobi J13v, rechts)", faktor: 2.8, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Jacobi Z5",
        faktor: 13.25, // Herstellerangabe: 12,9 - 13,6 Stk/m², Hohlfalzziegel
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 21.7,
        decklaenge_cm: "33,8 - 35,8",
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First/Ortgang: Kleine-Technik_technischeInfos_Verarbeitungshinweise-1.pdf",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi Z5)", faktor: 2.8, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi Z5)", faktor: 2.8, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Jacobi Z5, links)", faktor: 2.8, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Jacobi Z5, rechts)", faktor: 2.8, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Jacobi H1 (Hohlpfanne, Kurzschnitt)",
        faktor: 15.7, // Herstellerangabe: 15,2 - 16,2 Stk/m², Regeldachneigung ≥35°
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 20.5,
        decklaenge_cm: "30,0 - 32,0",
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First: Kleine-Technik_technischeInfos_Verarbeitungshinweise-1.pdf",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi H1)", faktor: 3.2, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi H1)", faktor: 3.2, einheit: "Stk" }
            // Ortgang-Wert für H1/H2 nicht separat ausgewiesen (nur Doppelwulst) - bitte ergänzen.
        }
    },
    {
        category: "Ziegel",
        material: "Jacobi H2 (Hohlpfanne, Langschnitt)",
        faktor: 15.2, // Herstellerangabe: ca. 15,2 Stk/m², Regeldachneigung ≥40°
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 20.5,
        decklaenge_cm: 32.0,
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First: Kleine-Technik_technischeInfos_Verarbeitungshinweise-1.pdf",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi H2)", faktor: 3.2, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi H2)", faktor: 3.2, einheit: "Stk" }
            // Ortgang-Wert für H1/H2 nicht separat ausgewiesen (nur Doppelwulst) - bitte ergänzen.
        }
    },
    {
        category: "Ziegel",
        material: "Jacobi K1 (Krempziegel)",
        faktor: 16.25, // Herstellerangabe: 15,8 - 16,7 Stk/m², Regeldachneigung ≥35°
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 23.5,
        decklaenge_cm: "25,5 - 27,0",
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First: Kleine-Technik_technischeInfos_Verarbeitungshinweise-1.pdf",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi K1)", faktor: 3.8, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi K1)", faktor: 3.8, einheit: "Stk" }
            // Ortgang-Wert nicht separat ausgewiesen (nur Doppelwulst) - bitte ergänzen.
        }
    },
    {
        category: "Ziegel",
        material: "Jacobi Z10 (Großfalzziegel)",
        faktor: 10.85, // Herstellerangabe: 9,9 - 11,8 Stk/m², Regeldachneigung ≥30°
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 26.5,
        decklaenge_cm: "35,5 - 38,0",
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First/Ortgang: Kleine-Technik_technischeInfos_Verarbeitungshinweise-1.pdf",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi Z10)", faktor: 2.6, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi Z10)", faktor: 2.6, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Jacobi Z10, links)", faktor: 2.6, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Jacobi Z10, rechts)", faktor: 2.6, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Jacobi Z7v (Standard-Falzziegel)",
        faktor: 16.7, // Herstellerangabe: 13,9 - 19,5 Stk/m² (ungewöhnlich große Spanne lt. Katalog), Regeldachneigung ≥30°
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 20.5,
        decklaenge_cm: "32,5 - 35,0",
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First/Ortgang: Kleine-Technik_technischeInfos_Verarbeitungshinweise-1.pdf",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi Z7v)", faktor: 2.9, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi Z7v)", faktor: 2.9, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Jacobi Z7v, links)", faktor: 2.9, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Jacobi Z7v, rechts)", faktor: 2.9, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Jacobi Z2 (Doppelmuldenziegel)",
        faktor: 13.9, // Herstellerangabe: 13,7 - 14,1 Stk/m², Regeldachneigung ≥25°
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 20.5,
        decklaenge_cm: "34,5 - 35,5",
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First/Ortgang: Kleine-Technik_technischeInfos_Verarbeitungshinweise-1.pdf",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi Z2)", faktor: 2.8, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi Z2)", faktor: 2.8, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Jacobi Z2, links)", faktor: 2.8, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Jacobi Z2, rechts)", faktor: 2.8, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Jacobi W6v",
        faktor: 13.3, // Herstellerangabe: 12,8 - 13,8 Stk/m², Hagelwiderstandsklasse 4
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 21.7,
        decklaenge_cm: "33,3 - 36,1",
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First/Ortgang: Kleine-Technik_technischeInfos_Verarbeitungshinweise-1.pdf",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi W6v)", faktor: 2.8, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi W6v)", faktor: 2.8, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Jacobi W6v, links)", faktor: 2.8, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Jacobi W6v, rechts)", faktor: 2.8, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Jacobi W4v",
        faktor: 14.7, // Herstellerangabe: 14,4 - 15,0 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 20.0,
        decklaenge_cm: "33,3 - 34,8",
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First/Ortgang: Kleine-Technik_technischeInfos_Verarbeitungshinweise-1.pdf",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi W4v)", faktor: 2.9, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi W4v)", faktor: 2.9, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Jacobi W4v, links)", faktor: 2.9, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Jacobi W4v, rechts)", faktor: 2.9, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Jacobi Marko (Romanische Pfanne)",
        faktor: 14.6, // Herstellerangabe: ca. 14,6 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 20.1,
        decklaenge_cm: 34.1,
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First/Ortgang: Kleine-Technik_technischeInfos_Verarbeitungshinweise-1.pdf",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi Marko)", faktor: 2.9, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi Marko)", faktor: 2.9, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Jacobi Marko, links)", faktor: 2.9, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Jacobi Marko, rechts)", faktor: 2.9, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Jacobi Walther Stylist",
        faktor: 12.55, // Herstellerangabe: 12,2 - 12,9 Stk/m² (Mittelwert)
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 23.1,
        decklaenge_cm: "33,6 - 35,6",
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First/Ortgang: Technische Informationen dachziegel.de, Stand 04/2024",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi Walther Stylist)", faktor: 2.8, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi Walther Stylist)", faktor: 2.8, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Jacobi Walther Stylist, links)", faktor: 2.8, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Jacobi Walther Stylist, rechts)", faktor: 2.8, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Jacobi WALTHER-tegula",
        faktor: 14.85, // Herstellerangabe: 12,4 - 17,3 Stk/m² (große Spanne, Reform-/Flachziegel-Mix), Regeldachneigung ≥30°
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 23.1,
        decklaenge_cm: "32,5 - 35,0",
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First/Ortgang: Kleine-Technik_technischeInfos_Verarbeitungshinweise-1.pdf",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi WALTHER-tegula)", faktor: 2.9, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi WALTHER-tegula)", faktor: 2.9, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Jacobi WALTHER-tegula, links)", faktor: 2.9, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Jacobi WALTHER-tegula, rechts)", faktor: 2.9, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Jacobi Z9 (Großflächenziegel)",
        faktor: 9.95, // Herstellerangabe: 9,4 - 10,5 Stk/m², Regeldachneigung ≥22°
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 26.4,
        decklaenge_cm: "36,1 - 40,3",
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First/Ortgang: Kleine-Technik_technischeInfos_Verarbeitungshinweise-1.pdf",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi Z9)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi Z9)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Jacobi Z9, links)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Jacobi Z9, rechts)", faktor: 2.5, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Jacobi Tradition 2021",
        faktor: 12.3, // Herstellerangabe: 11,8 - 12,8 Stk/m², Regeldachneigung ≥25°
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 23.3,
        decklaenge_cm: "33,5 - 36,4",
        source: "Jacobi Walther – Katalog_Dachziegel_092023.pdf; First/Ortgang: Kleine-Technik_technischeInfos_Verarbeitungshinweise-1.pdf",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Jacobi Tradition 2021)", faktor: 2.8, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Jacobi Tradition 2021)", faktor: 2.8, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Jacobi Tradition 2021, links)", faktor: 2.8, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Jacobi Tradition 2021, rechts)", faktor: 2.8, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Rapido",
        faktor: 8.45, // Herstellerangabe: 8,1 - 8,8 Stk/m² (Großformat-Doppelmuldenfalzziegel)
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 27.8,
        decklaenge_cm: "41,0 - 44,0",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Rapido)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Rapido)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Rapido, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Rapido, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },

    // ==========================================================
    // CREATON – Tondachziegel (komplettes Modellprogramm)
    // Quelle: "Technische Daten der CREATON Tondachziegelmodelle"
    // (Übersichtstabelle aller Flachdach-/Reform-/Falz-/Glattziegel)
    // Hinweis: Die Tabelle enthält zusätzlich First-/Ortgang-Werte
    // (Doppelwulst/Längshalber Stk. pro lfdm), diese ließen sich aus der
    // extrahierten Tabellenstruktur aber nicht mehr sicher den einzelnen
    // Spalten zuordnen - deshalb hier bewusst weggelassen statt geraten.
    // ==========================================================
    {
        category: "Ziegel",
        material: "Creaton Magnum",
        faktor: 8.45, // Herstellerangabe: 8,2 - 8,7 Stk/m², Flachdachziegel
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 29.6,
        decklaenge_cm: "39,0 - 41,1",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Magnum)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Magnum)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Magnum, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Magnum, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Balance",
        faktor: 8.7, // Herstellerangabe: 8,4 - 9,0 Stk/m², Flachdachziegel
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 27.5,
        decklaenge_cm: "40,6 - 43,1",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Balance)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Balance)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Balance, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Balance, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Titania",
        faktor: 9.55, // Herstellerangabe: 9,0 - 10,1 Stk/m², Flachdachziegel
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 26.1,
        decklaenge_cm: "38,2 - 42,5",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Titania)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Titania)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Titania, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Titania, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Futura",
        faktor: 11.35, // Herstellerangabe: 10,8 - 11,9 Stk/m², Reformziegel
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 23.7,
        decklaenge_cm: "36,0 - 38,8",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Futura)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Futura)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Futura, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Futura, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Premion",
        faktor: 12.2, // Herstellerangabe: 11,6 - 12,8 Stk/m², Reformziegel
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 22.4,
        decklaenge_cm: "35,5 - 37,9",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Premion)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Premion)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Premion, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Premion, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Viva",
        faktor: 13.05, // Herstellerangabe: 12,7 - 13,4 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 22.0,
        decklaenge_cm: "34,2 - 35,5",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Viva)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Viva)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Viva, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Viva, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton MZ3",
        faktor: 14.05, // Herstellerangabe: 13,6 - 14,5 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 20.5,
        decklaenge_cm: "34,3 - 35,8",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton MZ3)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton MZ3)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton MZ3, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton MZ3, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Harmonie",
        faktor: 14.9, // Herstellerangabe: 14,2 - 15,6 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 19.8,
        decklaenge_cm: "32,8 - 35,2",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Harmonie)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Harmonie)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Harmonie, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Harmonie, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Gratus",
        faktor: 12.6, // Herstellerangabe: 11,9 - 13,3 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 23.5,
        decklaenge_cm: "32,0 - 35,5",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Gratus)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Gratus)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Gratus, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Gratus, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Optima",
        faktor: 12.85, // Herstellerangabe: 11,9 - 13,8 Stk/m² (Ortgang muss ausgeklinkt werden!)
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 22.0,
        decklaenge_cm: "33,0 - 38,0",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Optima)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Optima)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Optima, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Optima, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Eleganz",
        faktor: 14.1, // Herstellerangabe: 13,7 - 14,5 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 20.5,
        decklaenge_cm: "33,7 - 35,0",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Eleganz)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Eleganz)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Eleganz, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Eleganz, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Mikado",
        faktor: 12.25, // Herstellerangabe: 11,7 - 12,8 Stk/m², Doppelmuldenfalzziegel
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 22.9,
        decklaenge_cm: "34,3 - 37,1",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Mikado)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Mikado)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Mikado, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Mikado, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Domino",
        faktor: 12.75, // Herstellerangabe: 12,4 - 13,1 Stk/m², Glattziegel
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 22.5,
        decklaenge_cm: "34,3 - 35,4",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Domino)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Domino)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Domino, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Domino, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Ratio",
        faktor: 12.15, // Herstellerangabe: 11,6 - 12,7 Stk/m², Falzziegel
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 22.3,
        decklaenge_cm: "35,7 - 38,0",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Ratio)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Ratio)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Ratio, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Ratio, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Rustico",
        faktor: 15.0, // Herstellerangabe: 14,5 - 15,5 Stk/m², Hohlfalzziegel
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 19.9,
        decklaenge_cm: "32,8 - 34,8",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Rustico)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Rustico)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Rustico, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Rustico, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Sinfonie",
        faktor: 11.55, // Herstellerangabe: 10,9 - 12,2 Stk/m², Großflächenverschiebeziegel
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 23.0,
        decklaenge_cm: "36,1 - 38,9",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Sinfonie)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Sinfonie)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Sinfonie, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Sinfonie, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Melodie",
        faktor: 14.5, // Herstellerangabe: 13,7 - 15,3 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 20.9,
        decklaenge_cm: "31,4 - 34,8",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Melodie)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Melodie)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Melodie, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Melodie, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Maxima",
        faktor: 10.15, // Herstellerangabe: 9,5 - 10,8 Stk/m², Sonderform
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 30.0,
        decklaenge_cm: "31,0 - 35,0",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Maxima)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Maxima)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Maxima, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Maxima, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Romano",
        faktor: 14.5, // Herstellerangabe: 14,3 - 14,7 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 20.0,
        decklaenge_cm: "34,4 - 34,8",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Romano)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Romano)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Romano, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Romano, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Antico",
        faktor: 14.25, // Herstellerangabe: 13,9 - 14,6 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 19.9,
        decklaenge_cm: "34,9 - 35,9",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Antico)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Antico)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Antico, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Antico, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Creaton Herzziegel",
        faktor: 14.1, // Herstellerangabe: 13,7 - 14,5 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 20.5,
        decklaenge_cm: "33,7 - 35,0",
        source: "CREATON – Technische Daten Tondachziegelmodelle",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Creaton Herzziegel)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Creaton Herzziegel)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Creaton Herzziegel, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Creaton Herzziegel, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },

    // ==========================================================
    // Röben – Tondachziegel
    // Hinweis: "BAG" (Bayerische Aktien-Ziegelei-Gesellschaft / auch als
    // Markenname für Bari/Rheinland bekannt) ist ein ausgelaufener/
    // historischer Markenname. Diese Modelle werden heute unter Röben
    // Tonbaustoffe GmbH weitergeführt - siehe auch die älteren, fest im
    // Programm hinterlegten Einträge "BAG Bari" / "BAG Rheinland" in
    // materialDatabase.js, deren Werte von den aktuellen Röben-Angaben
    // abweichen (dort 10,5 bzw. 11,5 Stk/m² - ggf. veraltet).
    // ==========================================================
    {
        category: "Ziegel",
        material: "Röben Bari",
        faktor: 12.65, // Herstellerangabe: 12,1 - 13,2 Stk/m² (Nachfolgemodell von "BAG Bari")
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 22.7,
        decklaenge_cm: "33,5 - 36,5",
        trauflattmass_cm: "35,5 - 37,5",
        firstlattmass_cm: 4.0,
        source: "Röben Tonbaustoffe GmbH – Technische Daten Bari (roeben.com); Lattmaße: Nutzerangabe (Tabelle)",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Röben Bari)", faktor: 3.0, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Röben Bari)", faktor: 3.0, einheit: "Stk" }
            // Ortgang-Wert nicht recherchiert - bitte ergänzen.
        }
        // LAF/FLA laut Röben-Technikblatt sind zusätzlich dachneigungsabhängige
        // Tabellen (kein reiner Einzelwert), z.B. bei 30° (Lattung 30x50mm):
        // LAF ca. 44mm, FLA ca. 120mm.
    },
    {
        category: "Ziegel",
        material: "Röben Rheinland",
        faktor: 14.2, // Herstellerangabe: 13,9 - 14,5 Stk/m² (mit GOZ/Standardeindeckung; ohne GOZ Extremspanne 13,9-17,9), Nachfolgemodell von "BAG Rheinland"
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 20.3,
        decklaenge_cm: "27,5 - 35,5",
        trauflattmass_cm: "32,0 - 34,0",
        firstlattmass_cm: 4.0,
        source: "Röben Tonbaustoffe GmbH – Technische Daten Rheinland (roeben.com); Lattmaße: Nutzerangabe (Tabelle)",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Röben Rheinland)", faktor: 3.0, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Röben Rheinland)", faktor: 3.0, einheit: "Stk" }
            // Ortgang-Wert nicht recherchiert - bitte ergänzen.
        }
        // LAF/FLA laut Röben-Technikblatt sind zusätzlich dachneigungsabhängige
        // Tabellen (kein reiner Einzelwert), z.B. bei 30° (Lattung 30x50mm):
        // LAF ca. 54mm, FLA ca. 104mm.
    },
    {
        category: "Ziegel",
        material: "Röben Bergamo",
        faktor: 12.45, // Herstellerangabe: 12,1 - 12,8 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 23.6,
        decklaenge_cm: "33,0 - 35,0",
        trauflattmass_cm: "33,0 - 36,0",
        firstlattmass_cm: 4.0,
        source: "Nutzerangabe (Tabelle)",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Röben Bergamo)", faktor: 3.0, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Röben Bergamo)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Röben Eifel",
        faktor: 14.25, // Herstellerangabe: 13,8 - 14,7 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 21.9,
        decklaenge_cm: "31,0 - 33,0",
        trauflattmass_cm: "32,0 - 34,0",
        firstlattmass_cm: 4.0,
        source: "Nutzerangabe (Tabelle)",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Röben Eifel)", faktor: 3.0, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Röben Eifel)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Röben Elsass",
        faktor: 13.15, // Herstellerangabe: 12,8 - 13,5 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 20.7,
        decklaenge_cm: "35,5 - 37,5",
        trauflattmass_cm: "35,0 - 37,0",
        firstlattmass_cm: 4.0,
        source: "Nutzerangabe (Tabelle)",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Röben Elsass)", faktor: 3.0, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Röben Elsass)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Röben Flandern",
        faktor: 13.15, // Herstellerangabe: 12,8 - 13,5 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 20.7,
        decklaenge_cm: "35,5 - 37,5",
        trauflattmass_cm: "35,0 - 37,0",
        firstlattmass_cm: 4.0,
        source: "Nutzerangabe (Tabelle)",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Röben Flandern)", faktor: 3.0, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Röben Flandern)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Röben Flandern Plus",
        faktor: 12.05, // Herstellerangabe: 11,7 - 12,4 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 22.5,
        decklaenge_cm: "36,0 - 38,0",
        trauflattmass_cm: "36,0 - 38,0",
        firstlattmass_cm: 4.0,
        source: "Nutzerangabe (Tabelle)",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Röben Flandern Plus)", faktor: 3.0, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Röben Flandern Plus)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Röben Limburg",
        faktor: 12.05, // Herstellerangabe: 11,7 - 12,4 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 22.5,
        decklaenge_cm: "36,0 - 38,0",
        trauflattmass_cm: "36,0 - 38,0",
        firstlattmass_cm: 4.0,
        source: "Nutzerangabe (Tabelle)",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Röben Limburg)", faktor: 3.0, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Röben Limburg)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Röben Milano",
        faktor: 10.1, // Herstellerangabe: 9,6 - 10,6 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 25.6,
        decklaenge_cm: "36,5 - 40,5",
        trauflattmass_cm: "35,0 - 37,0",
        firstlattmass_cm: 4.0,
        source: "Nutzerangabe (Tabelle)",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Röben Milano)", faktor: 3.0, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Röben Milano)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Röben Monza Plus",
        faktor: 9.95, // Herstellerangabe: 9,7 - 10,2 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 24.5,
        decklaenge_cm: "38,5 - 40,5",
        trauflattmass_cm: "36,0 - 38,0",
        firstlattmass_cm: 4.0,
        source: "Nutzerangabe (Tabelle)",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Röben Monza Plus)", faktor: 3.0, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Röben Monza Plus)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "Röben Piemont",
        faktor: 11.1, // Herstellerangabe: 10,7 - 11,5 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 24.3,
        decklaenge_cm: "36,0 - 38,5",
        trauflattmass_cm: "35,5 - 38,0",
        firstlattmass_cm: 4.0,
        source: "Nutzerangabe (Tabelle)",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (Röben Piemont)", faktor: 3.0, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (Röben Piemont)", faktor: 3.0, einheit: "Stk" }
        }
    },

    // ==========================================================
    // BRAAS / BMI – Betondachsteine (profilierte + ebene Dachsteine)
    // Quelle: BMI Deutschland, "Dachsteine – Verlegeanleitung",
    // BMI 1102, Stand 01/2026 (Technische Daten/Übersicht, Seite 3)
    // ==========================================================
    {
        category: "Ziegel",
        material: "BRAAS Tegalit Aerlox",
        faktor: 10.2, // Herstellerangabe: 9,8 - 10,7 Stk/m² (dachneigungsabhängig), ebener Dachstein 10er-Format
        einheit: "Stk",
        waste: 0.08,
        source: "BMI/BRAAS – Dachsteine Verlegeanleitung BMI 1102, Stand 01/2026",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Tegalit Aerlox)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Tegalit Aerlox)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Tegalit Aerlox, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Tegalit Aerlox, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Frankfurter Pfanne",
        faktor: 10.2, // Herstellerangabe: 9,7 - 10,7 Stk/m², meistverkaufter Betondachstein Deutschlands
        einheit: "Stk",
        waste: 0.08,
        source: "BMI/BRAAS – Dachsteine Verlegeanleitung BMI 1102, Stand 01/2026",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Frankfurter Pfanne)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Frankfurter Pfanne)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Frankfurter Pfanne, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Frankfurter Pfanne, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Taunus Pfanne",
        faktor: 10.2, // Herstellerangabe: 9,7 - 10,7 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        source: "BMI/BRAAS – Dachsteine Verlegeanleitung BMI 1102, Stand 01/2026",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Taunus Pfanne)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Taunus Pfanne)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Taunus Pfanne, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Taunus Pfanne, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Doppel-S",
        faktor: 10.2, // Herstellerangabe: 9,7 - 10,7 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        source: "BMI/BRAAS – Dachsteine Verlegeanleitung BMI 1102, Stand 01/2026",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Doppel-S)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Doppel-S)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Doppel-S, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Doppel-S, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Harzer Pfanne",
        faktor: 10.2, // Herstellerangabe: 9,7 - 10,7 Stk/m² (10er-Format)
        einheit: "Stk",
        waste: 0.08,
        source: "BMI/BRAAS – Dachsteine Verlegeanleitung BMI 1102, Stand 01/2026",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Harzer Pfanne)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Harzer Pfanne)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Harzer Pfanne, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Harzer Pfanne, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Harzer Pfanne 7",
        faktor: 7.85, // Herstellerangabe: 7,5 - 8,2 Stk/m² (7er-Großformat)
        einheit: "Stk",
        waste: 0.08,
        source: "BMI/BRAAS – Dachsteine Verlegeanleitung BMI 1102, Stand 01/2026",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Harzer Pfanne 7)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Harzer Pfanne 7)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Harzer Pfanne 7, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Harzer Pfanne 7, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Harzer Pfanne F+",
        faktor: 8.2, // Herstellerangabe, Spezialvariante für sehr flache Dachneigungen (7°-12°)
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS/BMI – Produktdatenblatt Harzer Pfanne F+ (7Grad Dach)",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Harzer Pfanne F+)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Harzer Pfanne F+)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Harzer Pfanne F+, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Harzer Pfanne F+, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },

    // ==========================================================
    // BRAAS / BMI – Tondachziegel
    // Quelle: Braas Dachziegel Verlegeanleitung, GD 323, Stand 11/2014
    // (Technische Daten/Übersicht, Seite 5-6)
    // ==========================================================
    {
        category: "Ziegel",
        material: "BRAAS Rubin 9V",
        faktor: 9.75, // Herstellerangabe: 9,4 - 10,1 Stk/m², Flachdachziegel
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Rubin 9V)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Rubin 9V)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Rubin 9V, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Rubin 9V, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Rubin 11V",
        faktor: 12.1, // Herstellerangabe: 11,5 - 12,7 Stk/m² (Heisterholzer/Hainstädter Variante)
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Rubin 11V)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Rubin 11V)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Rubin 11V, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Rubin 11V, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Rubin 13V",
        faktor: 12.9, // Herstellerangabe: 12,3 - 13,5 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Rubin 13V)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Rubin 13V)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Rubin 13V, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Rubin 13V, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Rubin 15",
        faktor: 14.55, // Herstellerangabe: 14,4 - 14,7 Stk/m² (Karund)
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Rubin 15)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Rubin 15)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Rubin 15, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Rubin 15, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Achat 10V",
        faktor: 10.65, // Herstellerangabe: 10,2 - 11,1 Stk/m², Hohlfalzziegel
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Achat 10V)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Achat 10V)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Achat 10V, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Achat 10V, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Achat 12V",
        faktor: 12.7, // Herstellerangabe: 12,2 - 13,2 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Achat 12V)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Achat 12V)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Achat 12V, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Achat 12V, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Achat 14 Geradschnitt",
        faktor: 13.7, // Herstellerangabe: 13,3 - 14,1 Stk/m² (Hanseat)
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Achat 14 Geradschnitt)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Achat 14 Geradschnitt)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Achat 14 Geradschnitt, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Achat 14 Geradschnitt, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Granat 11V",
        faktor: 12.15, // Herstellerangabe: 11,4 - 12,9 Stk/m², Doppelmuldenfalzziegel
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Granat 11V)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Granat 11V)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Granat 11V, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Granat 11V, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Granat 13V",
        faktor: 13.6, // Herstellerangabe: 13,0 - 14,2 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Granat 13V)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Granat 13V)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Granat 13V, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Granat 13V, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Granat 15",
        faktor: 14.15, // Herstellerangabe: 13,9 - 14,4 Stk/m² (Weserland)
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Granat 15)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Granat 15)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Granat 15, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Granat 15, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Neuer Topas 11V",
        faktor: 12.5, // Herstellerangabe: 11,5 - 13,5 Stk/m², Reformziegel
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Neuer Topas 11V)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Neuer Topas 11V)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Neuer Topas 11V, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Neuer Topas 11V, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Topas 13V",
        faktor: 13.7, // Herstellerangabe: 12,9 - 14,5 Stk/m²
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Topas 13V)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Topas 13V)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Topas 13V, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Topas 13V, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Topas 15V",
        faktor: 14.65, // Herstellerangabe: 14,0 - 15,3 Stk/m² (Standard)
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Topas 15V)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Topas 15V)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Topas 15V, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Topas 15V, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Smaragd",
        faktor: 13.25, // Herstellerangabe: 12,5 - 14,0 Stk/m², Rautenziegel
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Smaragd)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Smaragd)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Smaragd, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Smaragd, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Turmalin",
        faktor: 11.35, // Herstellerangabe: 11,0 - 11,7 Stk/m², Flachziegel
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Turmalin)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Turmalin)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Turmalin, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Turmalin, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Saphir",
        faktor: 14.35, // Herstellerangabe: 14,1 - 14,6 Stk/m², kombinierter Mönch-/Nonnenziegel (Karthago)
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Saphir)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Saphir)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Saphir, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Saphir, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Opal Standard (Biberschwanz)",
        faktor: 36.0, // Herstellerangabe: 33,7 - 38,3 Stk/m² (Doppeldeckung); deutlich höher als Flächenziegel, da Biberschwanz-Kleinformat
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Opal Standard (Biberschwanz))", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Opal Standard (Biberschwanz))", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Opal Standard (Biberschwanz), links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Opal Standard (Biberschwanz), rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Opal Berliner Biber",
        faktor: 41.8, // Herstellerangabe: 39,1 - 44,5 Stk/m² (Doppeldeckung)
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Opal Berliner Biber)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Opal Berliner Biber)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Opal Berliner Biber, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Opal Berliner Biber, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },
    {
        category: "Ziegel",
        material: "BRAAS Opal Turmbiber",
        faktor: 71.2, // Herstellerangabe: 64,4 - 78,0 Stk/m² (Doppeldeckung), sehr kleines Format
        einheit: "Stk",
        waste: 0.08,
        source: "BRAAS – Dachziegel Verlegeanleitung GD 323, Stand 11/2014",
        relatedFactorsEstimated: true, // Faustregel (ZVDH/Branchenwert), keine herstellerspezifische Angabe - bitte vor Verwendung prüfen
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel (BRAAS Opal Turmbiber)", faktor: 2.5, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel (BRAAS Opal Turmbiber)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (BRAAS Opal Turmbiber, links)", faktor: 3.0, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (BRAAS Opal Turmbiber, rechts)", faktor: 3.0, einheit: "Stk" }
        }
    },

    // ==========================================================
    // Nelskamp / NIBRA – Tondachziegel
    // Quelle: NEL-002_04_09_Datenblätter_A5_DACHSTEIN_F10PRO.pdf
    // (offizielles Nelskamp-Datenblatt NIBRA-Flachdachziegel F 10 PRO)
    // ==========================================================
    {
        category: "Ziegel",
        material: "Nelskamp F10 PRO",
        faktor: 10.0, // Herstellerangabe: 9,6 - 10,4 Stk/m² (je nach Lattmaß)
        einheit: "Stk",
        waste: 0.08,
        deckbreite_cm: 25.4,
        decklaenge_cm: "38,0 - 41,0",
        firstlattmass_cm: 3.0, // Abstand oberste Traglatte zum Firstscheitelpunkt bei DN ≤30°
        source: "Nelskamp – Datenblatt NIBRA-Flachdachziegel F 10 PRO",
        relatedFactors: {
            "First": { category: "Ziegel", material: "Firstziegel Standard (NIBRA, F10 PRO)", faktor: 2.7, einheit: "Stk" },
            "Grat": { category: "Ziegel", material: "Firstziegel Standard (NIBRA, F10 PRO)", faktor: 2.7, einheit: "Stk" },
            "Ortgang (links)": { category: "Ziegel", material: "Ortgang (Nelskamp F10 PRO, links)", faktor: 2.5, einheit: "Stk" },
            "Ortgang (rechts)": { category: "Ziegel", material: "Ortgang (Nelskamp F10 PRO, rechts)", faktor: 2.5, einheit: "Stk" }
        }
    }

    // Hinweis: First-/Grat-/Ortgang-Werte (Stk pro lfdm) sind für die meisten
    // BRAAS-Modelle in den Herstellerunterlagen nur als Lattenabstands-/
    // Schnürabstands-Tabellen (mm) angegeben, nicht als einfacher "Stk/lfdm"-
    // Wert wie bei Jacobi Stylist. Sie wurden daher bewusst leer gelassen,
    // statt sie unsicher umzurechnen - bitte bei Bedarf im jeweiligen
    // Datenblatt nachschlagen und im Material-Dialog manuell ergänzen.
];

/**
 * Sucht einen bekannten Vorschlag anhand des (case-insensitiven) Namens.
 * @param {string} name
 * @returns {object|null}
 */
export function findMaterialSuggestion(name) {
    if (!name) return null;
    const normalized = name.trim().toLowerCase();
    return knownMaterialSuggestions.find(m => m.material.toLowerCase() === normalized) || null;
}