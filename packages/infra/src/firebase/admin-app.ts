import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * `FIREBASE_PRIVATE_KEY` (PEM multilinha com `\n` escapado) é um formato
 * frágil pra colar em painéis de variáveis de ambiente — editores de texto
 * costumam "corrigir" as quebras de linha sozinhos, corrompendo a chave em
 * silêncio. `FIREBASE_PRIVATE_KEY_BASE64` (o PEM inteiro em base64, uma
 * linha só, sem caracteres especiais) é imune a esse problema e tem
 * prioridade quando presente.
 */
function resolvePrivateKey(): string | undefined {
  const base64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;
  if (base64) {
    return Buffer.from(base64, 'base64').toString('utf8');
  }
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
}

/**
 * Inicialização única do Admin SDK (server-only — nunca importado por
 * código que roda no browser). Lê credenciais de variáveis de ambiente
 * padrão; em produção (Cloud Functions, Cloud Run) usa Application Default
 * Credentials automaticamente quando nenhuma chave privada está setada.
 */
function buildApp(): App {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = resolvePrivateKey();

  if (projectId && clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  return initializeApp();
}

let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export function getAdminFirestore(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(buildApp());
  }
  return firestoreInstance;
}

export function getAdminAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(buildApp());
  }
  return authInstance;
}
