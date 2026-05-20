import axios from "axios";
import * as fs from "fs";
import * as path from "path";

type DecodedIdToken = { uid: string; email?: string; [k: string]: unknown };
type UserRecord = { uid: string; email?: string; [k: string]: unknown };

type FirebaseAdmin = typeof import("firebase-admin");

class FirebaseService {
  private admin: FirebaseAdmin | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const firebaseConfigPath = process.env.FIREBASE_CONFIG_PATH;
    if (!firebaseConfigPath) {
      console.warn(
        'FIREBASE_CONFIG_PATH not set — skipping Firebase Admin initialization. ' +
        'Identity verification will be unavailable; single-machine / local-dev deployments can ignore this.'
      );
      return;
    }

    let admin: FirebaseAdmin;
    try {
      admin = (await import("firebase-admin")) as unknown as FirebaseAdmin;
    } catch {
      console.warn(
        'firebase-admin module not installed — skipping Firebase Admin initialization. ' +
        'Install it with `npm install firebase-admin` to enable token verification.'
      );
      return;
    }

    try {
      if (admin.apps?.length > 0) {
        this.admin = admin;
        this.initialized = true;
        return;
      }
      const serviceAccountPath = path.join(process.cwd(), firebaseConfigPath);
      if (!fs.existsSync(serviceAccountPath)) {
        console.warn('Firebase service account file not found at:', serviceAccountPath);
        return;
      }
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      this.admin = admin;
      this.initialized = true;
      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
    }
  }

  async verifyIdToken(idToken: string): Promise<DecodedIdToken | null> {
    if (!this.initialized || !this.admin) return null;
    try {
      return await this.admin.auth().verifyIdToken(idToken) as DecodedIdToken;
    } catch (error) {
      console.error('Firebase token verification failed:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    if (!this.initialized || !this.admin) return null;
    try {
      return await this.admin.auth().getUserByEmail(email) as unknown as UserRecord;
    } catch (error) {
      console.error('Failed to get user by email:', error);
      return null;
    }
  }

  async getUserByUid(uid: string): Promise<UserRecord | null> {
    if (!this.initialized || !this.admin) return null;
    try {
      return await this.admin.auth().getUser(uid) as unknown as UserRecord;
    } catch (error) {
      console.error('Failed to get user by UID:', error);
      return null;
    }
  }

  async createCustomToken(uid: string): Promise<string | null> {
    if (!this.initialized || !this.admin) {
      console.error('Cannot create custom token: Firebase not initialized');
      return null;
    }
    try {
      return await this.admin.auth().createCustomToken(uid);
    } catch (error) {
      console.error('Failed to create custom token:', error);
      return null;
    }
  }

  async signInWithCustomToken(customToken: string): Promise<string | null> {
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) {
      console.error('Cannot exchange custom token: FIREBASE_WEB_API_KEY not set');
      return null;
    }
    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
        { token: customToken, returnSecureToken: true },
        { timeout: 10000 }
      );
      return response.data.idToken as string;
    } catch (error) {
      console.error('Failed to exchange custom token for ID token:', error);
      return null;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const firebaseService = new FirebaseService();
