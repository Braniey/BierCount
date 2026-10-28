// ============================================================
// 🔧 FIREBASE CONFIG
// Hier die Werte aus der Firebase Console eintragen
// (Projekteinstellungen → Deine Apps → Web-App).
// ============================================================
export const firebaseConfig = {
    apiKey: "AIzaSyDB0c27YelVKV8IXSCXARdqV1I22-UOlIw",
    authDomain: "biercountlager26.firebaseapp.com",
    databaseURL: "https://biercountlager26-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "biercountlager26",
    storageBucket: "biercountlager26.firebasestorage.app",
    messagingSenderId: "998797920268",
    appId: "1:998797920268:web:6b82a432f02a4b9ed24629",
    measurementId: "G-527FPNG6Q6"
};

export const isConfigured = !firebaseConfig.apiKey.startsWith("DEIN_");
