import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  deleteUser,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Inicialização da instância Firebase
const app = initializeApp(firebaseConfig);

// Conexão Firestore obrigatória com o database ID especificado na configuração
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Teste de conexão na inicialização conforme diretrizes do skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline ou aguardando conexão com a internet.');
    }
  }
}
testConnection();

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Autenticação com Google (popup)
 */
export async function loginComGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Registra ou atualiza perfil no Firestore
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Estudante',
        photoURL: user.photoURL || '',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return user;
  } catch (error) {
    console.error('Erro no login com Google:', error);
    throw error;
  }
}

/**
 * Logout do Firebase Auth
 */
export async function logoutFirebase() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Erro ao sair do Firebase:', error);
    throw error;
  }
}

/**
 * Exclui permanentemente a conta do usuário e todos os seus dados no Firestore (LGPD e Google Play Compliance)
 */
export async function excluirContaUsuario() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Nenhum usuário autenticado para exclusão.');
  }

  const userId = user.uid;

  // 1. Exclui o documento de estado de estudos sincronizado no Firestore
  const studyPath = `users/${userId}/study/current`;
  try {
    const studyDocRef = doc(db, 'users', userId, 'study', 'current');
    await deleteDoc(studyDocRef);
  } catch (error) {
    // Se o documento não existir, prossegue; caso contrário reporta
    console.warn('Erro ao remover documento de estudos na exclusão:', error);
  }

  // 2. Exclui o documento de perfil do usuário no Firestore
  const userPath = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, userPath);
  }

  // 3. Exclui a conta de autenticação no Firebase Auth
  try {
    await deleteUser(user);
  } catch (authError) {
    console.error('Erro ao excluir usuário no Firebase Auth:', authError);
    if (authError && authError.code === 'auth/requires-recent-login') {
      throw new Error(
        'Por motivos de segurança do Google, faça login novamente antes de confirmar a exclusão da sua conta.'
      );
    }
    throw authError;
  }

  return { success: true };
}

