import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import defaultFirebaseConfig from '../../firebase-applet-config.json';
import { FirebaseAppletConfig } from '../services/firebaseConfigParser';

export const CUSTOM_FIREBASE_CONFIG_KEY = 'pet_store_custom_firebase_config_v1';

export function getActiveFirebaseConfig(): FirebaseAppletConfig {
  try {
    const custom = localStorage.getItem(CUSTOM_FIREBASE_CONFIG_KEY);
    if (custom) {
      const parsed = JSON.parse(custom);
      if (parsed.projectId && parsed.apiKey) {
        return parsed;
      }
    }
  } catch {}
  return defaultFirebaseConfig as FirebaseAppletConfig;
}

export function isUsingCustomFirebaseConfig(): boolean {
  try {
    const custom = localStorage.getItem(CUSTOM_FIREBASE_CONFIG_KEY);
    return !!custom;
  } catch {
    return false;
  }
}

export function saveActiveFirebaseConfig(config: FirebaseAppletConfig) {
  localStorage.setItem(CUSTOM_FIREBASE_CONFIG_KEY, JSON.stringify(config, null, 2));
}

export function resetToDefaultFirebaseConfig() {
  localStorage.removeItem(CUSTOM_FIREBASE_CONFIG_KEY);
}

const activeConfig = getActiveFirebaseConfig();
const app = getApps().length === 0 ? initializeApp(activeConfig) : getApps()[0];

// CRITICAL: If custom database has '(default)' or empty, use standard default DB; otherwise use custom ID
const dbId = activeConfig.firestoreDatabaseId && activeConfig.firestoreDatabaseId !== '(default)'
  ? activeConfig.firestoreDatabaseId
  : undefined;

export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Silent catch so it never interrupts the app or triggers reload
  }
}
