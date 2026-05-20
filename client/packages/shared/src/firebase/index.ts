// Written by scripts/export-oss.ts. The editor uses a dummy auth token
// ("stemstudio-token") and the ai-server bypass middleware accepts it.
// The Firebase SDK is replaced by this null-shaped stub so Vite
// tree-shakes firebase/app, firebase/auth, firebase/firestore, and
// firebase/analytics out of the bundle.
import type {Auth} from "firebase/auth";
import type {Firestore} from "firebase/firestore";
import type {Analytics} from "firebase/analytics";

export const firebaseConfig = {} as const;
export const analytics: Analytics | null = null;
export const auth: Auth | null = null;
export const db: Firestore | null = null;
export default null;
