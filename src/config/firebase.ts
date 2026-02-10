// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB1LtzuqH1IT7eryd1oiFVKkxR578VdNCc",
    authDomain: "workan-fb4ef.firebaseapp.com",
    projectId: "workan-fb4ef",
    storageBucket: "workan-fb4ef.firebasestorage.app",
    messagingSenderId: "213795286088",
    appId: "1:213795286088:web:a3d3da3807e5811395fc7d",
    measurementId: "G-0PEXF8E43Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Analytics only in production (null in development)
// This prevents ERR_BLOCKED_BY_CLIENT errors from ad blockers during development
let analytics: any = null;

if (import.meta.env.PROD) {
    // Dynamically import and initialize analytics only in production
    import("firebase/analytics").then(({ getAnalytics }) => {
        try {
            analytics = getAnalytics(app);
            console.log('📊 Analytics enabled (production mode)');
        } catch (error) {
            console.log('📊 Analytics blocked (ad blocker detected) - continuing without analytics');
        }
    });
} else {
    console.log('🔧 Analytics disabled (development mode)');
}

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn('Firestore persistence not supported');
    }
});

// Export Firebase services
export { app, analytics, auth, db, storage, googleProvider };
