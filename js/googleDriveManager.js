// js/googleDriveManager.js
//
// Google Drive Integration: Lädt PDF- und JSON-Exporte automatisch in
// einen festen Google-Drive-Ordner hoch (statt/zusätzlich zum normalen
// Browser-Download).
//
// Technik: Google Identity Services (GIS) für die Anmeldung (OAuth 2.0,
// Token-Flow im Browser, kein eigener Server nötig) + Google Drive REST
// API v3 für den eigentlichen Datei-Upload.
//
// WICHTIG: Die Client-ID ist bewusst öffentlich im Code sichtbar - das ist
// bei Google OAuth so vorgesehen (anders als ein geheimer API-Key) und
// unproblematisch, da jede Anmeldung ohnehin die explizite Erlaubnis des
// Nutzers erfordert.

const CLIENT_ID = '828377954207-dcusgj00hgoi2euusdm0p9mr9t4b4qmq.apps.googleusercontent.com';
const DRIVE_FOLDER_ID = '1vr92gr8R_I-eKi1rG1jmu7QAmxG2Fhym';
const SCOPES = 'https://www.googleapis.com/auth/drive';

let tokenClient = null;
let accessToken = null;
let tokenExpiresAt = 0;

function ensureTokenClient() {
    if (tokenClient) return tokenClient;
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        throw new Error('Google Identity Services ist noch nicht geladen. Bitte Seite neu laden und kurz warten.');
    }
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: () => {} // wird pro Aufruf in requestAccessToken() überschrieben
    });
    return tokenClient;
}

/**
 * Fordert ein neues Access Token an (zeigt bei Bedarf den Google-Anmelde-
 * /Berechtigungs-Dialog). Löst mit dem Token auf.
 */
function requestAccessToken(interactive) {
    return new Promise((resolve, reject) => {
        try {
            const client = ensureTokenClient();
            client.callback = (response) => {
                if (response.error) {
                    reject(response);
                    return;
                }
                accessToken = response.access_token;
                // 1 Minute Sicherheitspuffer vor dem tatsächlichen Ablauf
                tokenExpiresAt = Date.now() + (response.expires_in * 1000) - 60000;
                resolve(accessToken);
            };
            client.requestAccessToken({ prompt: interactive ? 'consent' : '' });
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Stellt sicher, dass ein gültiges Access Token vorliegt. Fragt nur dann
 * aktiv nach einer neuen Anmeldung, wenn wirklich keins (mehr) vorhanden ist.
 */
async function getValidAccessToken() {
    if (accessToken && Date.now() < tokenExpiresAt) {
        return accessToken;
    }
    return requestAccessToken(true);
}

/**
 * Verbindet die App explizit mit Google (z.B. über einen "Mit Google
 * verbinden"-Button). Danach laufen Uploads ohne erneuten Anmelde-Dialog,
 * solange das Token gültig ist (typischerweise ~1 Stunde).
 */
export async function connectGoogleDrive() {
    await requestAccessToken(true);
    return true;
}

export function isGoogleDriveConnected() {
    return !!accessToken && Date.now() < tokenExpiresAt;
}

/**
 * Lädt eine Datei (Blob) in den festgelegten Google-Drive-Ordner hoch.
 * @param {Blob} blob
 * @param {string} filename
 * @param {string} mimeType
 * @returns {Promise<object>} Die von der Drive API zurückgegebenen Datei-Metadaten
 */
export async function uploadToGoogleDrive(blob, filename, mimeType) {
    const token = await getValidAccessToken();

    const metadata = {
        name: filename,
        parents: [DRIVE_FOLDER_ID]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob, filename);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google Drive Upload fehlgeschlagen (Status ${response.status}): ${errText}`);
    }

    return response.json();
}
