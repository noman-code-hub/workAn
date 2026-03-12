import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentSingleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyB1LtzuqH1IT7eryd1oiFVKkxR578VdNCc",
    authDomain: "workan-fb4ef.firebaseapp.com",
    projectId: "workan-fb4ef",
    storageBucket: "workan-fb4ef.firebasestorage.app",
    messagingSenderId: "213795286088",
    appId: "1:213795286088:web:a3d3da3807e5811395fc7d",
    measurementId: "G-0PEXF8E43Y",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = (() => {
    try {
        return initializeFirestore(app, {
            // New Firestore cache configuration API replacing deprecated persistence helper.
            localCache: persistentLocalCache({
                tabManager: persistentSingleTabManager({}),
            }),
        });
    } catch (error) {
        console.warn("Firestore initialized without persistent cache:", error);
        return getFirestore(app);
    }
})();
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

let analytics: any = null;

if (import.meta.env.PROD) {
    import("firebase/analytics").then(({ getAnalytics }) => {
        try {
            analytics = getAnalytics(app);
            console.log("Analytics enabled (production mode)");
        } catch {
            console.log("Analytics blocked (ad blocker detected) - continuing without analytics");
        }
    });
} else {
    console.log("Analytics disabled (development mode)");
}

export { app, analytics, auth, db, storage, googleProvider, githubProvider };
