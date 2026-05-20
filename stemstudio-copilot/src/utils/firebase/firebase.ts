import type { App } from 'firebase-admin/app';
import { readFileSync } from 'fs';

let firebaseApp: App | null = null;
let firebaseAdminModule: typeof import('firebase-admin') | null = null;

export function isFirebaseConfigured(): boolean {
    return !!process.env.FIREBASE_CREDENTIALS_PATH;
}

async function loadFirebaseAdmin(): Promise<typeof import('firebase-admin') | null> {
    if (firebaseAdminModule) return firebaseAdminModule;
    try {
        const mod = await import('firebase-admin');
        firebaseAdminModule = (mod as unknown as { default?: typeof import('firebase-admin') }).default
            ?? (mod as unknown as typeof import('firebase-admin'));
        return firebaseAdminModule;
    } catch {
        return null;
    }
}

function formatUnknownError(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object') {
        try {
            return JSON.stringify(err);
        } catch {
            return '[unserializable error object]';
        }
    }
    return String(err);
}

async function getFirebaseApp(): Promise<App | null> {
    if (firebaseApp) return firebaseApp;

    const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH;
    if (!credentialsPath) return null;

    const admin = await loadFirebaseAdmin();
    if (!admin) {
        console.warn(
            'firebase-admin module not installed — token verification disabled. ' +
            'Install it with `bun add firebase-admin` to enable Firebase auth.'
        );
        return null;
    }

    let serviceAccount: object;
    try {
        serviceAccount = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
    } catch (err) {
        const message = formatUnknownError(err);
        console.error(`Failed to read Firebase credentials at "${credentialsPath}": ${message}`);
        return null;
    }

    try {
        const apps = admin.apps;
        firebaseApp = apps.length > 0 && apps[0]
            ? apps[0]
            : admin.initializeApp({ credential: admin.credential.cert(serviceAccount as any) });
    } catch (err) {
        const message = formatUnknownError(err);
        console.error(`Failed to initialize Firebase app: ${message}`);
        return null;
    }

    return firebaseApp;
}

export async function verifyIdToken(token: string) {
    const app = await getFirebaseApp();
    if (!app) {
        throw new Error('Firebase is not configured (FIREBASE_CREDENTIALS_PATH unset).');
    }
    const admin = await loadFirebaseAdmin();
    if (!admin) {
        throw new Error('firebase-admin module unavailable.');
    }
    return admin.auth(app).verifyIdToken(token);
}

export async function getFirestoreDb() {
    const app = await getFirebaseApp();
    if (!app) {
        throw new Error('Firebase is not configured (FIREBASE_CREDENTIALS_PATH unset).');
    }
    const admin = await loadFirebaseAdmin();
    if (!admin) {
        throw new Error('firebase-admin module unavailable.');
    }
    return admin.firestore(app);
}
