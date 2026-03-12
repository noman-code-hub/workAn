import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyB1LtzuqH1IT7eryd1oiFVKkxR578VdNCc",
    authDomain: "workshour.com",
    projectId: "workan-fb4ef",
    storageBucket: "workan-fb4ef.firebasestorage.app",
    messagingSenderId: "213795286088",
    appId: "1:213795286088:web:a3d3da3807e5811395fc7d",
    measurementId: "G-0PEXF8E43Y",
};

type FirebaseBundle = {
    app: FirebaseApp;
    auth: Auth;
    db: Firestore;
    storage: FirebaseStorage;
    googleProvider: InstanceType<typeof import('firebase/auth').GoogleAuthProvider>;
    githubProvider: InstanceType<typeof import('firebase/auth').GithubAuthProvider>;
    authModule: typeof import('firebase/auth');
};

let firebasePromise: Promise<FirebaseBundle> | null = null;

const initFirebase = async (): Promise<FirebaseBundle> => {
    const [{ initializeApp }, authModule, firestoreModule, storageModule] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
        import('firebase/storage'),
    ]);

    const app = initializeApp(firebaseConfig);
    const auth = authModule.getAuth(app);

    const db = (() => {
        try {
            return firestoreModule.initializeFirestore(app, {
                // New Firestore cache configuration API replacing deprecated persistence helper.
                localCache: firestoreModule.persistentLocalCache({
                    tabManager: firestoreModule.persistentSingleTabManager({}),
                }),
            });
        } catch (error) {
            console.warn("Firestore initialized without persistent cache:", error);
            return firestoreModule.getFirestore(app);
        }
    })();

    const storage = storageModule.getStorage(app);
    const googleProvider = new authModule.GoogleAuthProvider();
    const githubProvider = new authModule.GithubAuthProvider();

    if (import.meta.env.PROD) {
        import('firebase/analytics')
            .then(({ getAnalytics }) => {
                try {
                    getAnalytics(app);
                    console.log('Analytics enabled (production mode)');
                } catch {
                    console.log('Analytics blocked (ad blocker detected) - continuing without analytics');
                }
            })
            .catch(() => {
                console.log('Analytics blocked (ad blocker detected) - continuing without analytics');
            });
    } else {
        console.log('Analytics disabled (development mode)');
    }

    return { app, auth, db, storage, googleProvider, githubProvider, authModule };
};

export const getFirebase = async (): Promise<FirebaseBundle> => {
    if (!firebasePromise) {
        firebasePromise = initFirebase();
    }
    return firebasePromise;
};

export const getAuthClient = async () => {
    const { auth, googleProvider, githubProvider, authModule } = await getFirebase();
    return { auth, googleProvider, githubProvider, authModule };
};

export const getDb = async () => {
    const { db } = await getFirebase();
    return db;
};

export const getStorage = async () => {
    const { storage } = await getFirebase();
    return storage;
};
