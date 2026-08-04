import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Inicialização única do Admin SDK (server-only — nunca importado por
 * código que roda no browser). Lê credenciais de variáveis de ambiente
 * padrão; em produção (Cloud Functions, Cloud Run) usa Application Default
 * Credentials automaticamente quando `FIREBASE_PRIVATE_KEY` não está setada.
 */
function buildApp(): App {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  return initializeApp();
}

let firestoreInstance: Firestore | null = null;

export function getAdminFirestore(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(buildApp());
  }
  return firestoreInstance;
}
