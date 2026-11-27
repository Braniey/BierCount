import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getDatabase, ref, get, set, update, push, onValue, increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { firebaseConfig } from "../config/firebase-config.js";

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
const auth = getAuth(app);

// Jedes Handy bekommt unsichtbar eine eigene Kennung (uid). Sie bleibt im
// Browser gespeichert; ist schon jemand angemeldet, kommt dieselbe zurück.
export async function signIn() {
    const { user } = await signInAnonymously(auth);
    return user.uid;
}

export { ref, get, set, update, push, onValue, increment };
