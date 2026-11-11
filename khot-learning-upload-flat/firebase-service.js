/*
 * Firebase adapter for KHOT Learning.
 * Firebase SDK is loaded from Google's CDN so this vanilla HTML project can
 * run on Live Server and static hosting without a bundler or npm install.
 * The app remains usable in local demo mode if Firebase cannot initialize.
 */
import { firebaseConfig } from './firebase-config.js';

const configured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId &&
  firebaseConfig.databaseURL
);

let appSdk = null;
let authSdk = null;
let firestoreSdk = null;
let storageSdk = null;
let realtimeDatabaseSdk = null;
let analyticsSdk = null;
let auth = null;
let db = null;
let storage = null;
let realtimeDatabase = null;
let analytics = null;
let firebaseReady = false;

if (configured) {
  const sdkVersion = '10.14.1';
  const cdn = `https://www.gstatic.com/firebasejs/${sdkVersion}`;

  try {
    [appSdk, authSdk, firestoreSdk, storageSdk, realtimeDatabaseSdk] = await Promise.all([
      import(`${cdn}/firebase-app.js`),
      import(`${cdn}/firebase-auth.js`),
      import(`${cdn}/firebase-firestore.js`),
      import(`${cdn}/firebase-storage.js`),
      import(`${cdn}/firebase-database.js`)
    ]);

    const app = appSdk.initializeApp(firebaseConfig);
    auth = authSdk.getAuth(app);
    db = firestoreSdk.getFirestore(app);
    storage = storageSdk.getStorage(app);
    realtimeDatabase = realtimeDatabaseSdk.getDatabase(app);
    firebaseReady = true;

    // Analytics is optional. Failure to load it must not block core features.
    try {
      analyticsSdk = await import(`${cdn}/firebase-analytics.js`);
      if (await analyticsSdk.isSupported()) {
        analytics = analyticsSdk.getAnalytics(app);
      }
    } catch (error) {
      console.info('Firebase Analytics tidak tersedia pada lingkungan ini:', error?.message || error);
    }
  } catch (error) {
    console.error('Firebase gagal diinisialisasi. Aplikasi beralih ke mode demo lokal.', error);
    firebaseReady = false;
    auth = null;
    db = null;
    storage = null;
    realtimeDatabase = null;
    analytics = null;
  }
}

export const firebaseEnabled = firebaseReady;
export const authInstance = auth;
export const firestoreInstance = db;
export const storageInstance = storage;
export const realtimeDatabaseInstance = realtimeDatabase;
export const analyticsInstance = analytics;

export async function loginWithEmail(email, password) {
  if (!firebaseReady) throw new Error('Firebase belum dikonfigurasi. Gunakan mode demo.');
  const credential = await authSdk.signInWithEmailAndPassword(auth, email, password);
  const profileSnap = await firestoreSdk.getDoc(firestoreSdk.doc(db, 'users', credential.user.uid));
  if (!profileSnap.exists()) throw new Error('Profil pengguna belum dibuat oleh administrator.');
  return { user: credential.user, profile: profileSnap.data() };
}

export async function registerStudent({ name, email, password, classCode = '' }) {
  if (!firebaseReady) throw new Error('Firebase belum dikonfigurasi.');
  const credential = await authSdk.createUserWithEmailAndPassword(auth, email, password);
  const profile = {
    uid: credential.user.uid,
    name,
    email,
    role: 'student',
    classCode,
    classId: null,
    createdAt: firestoreSdk.serverTimestamp(),
    updatedAt: firestoreSdk.serverTimestamp()
  };
  await firestoreSdk.setDoc(firestoreSdk.doc(db, 'users', credential.user.uid), profile);
  return { user: credential.user, profile };
}

export async function sendPasswordReset(email) {
  if (!firebaseReady) throw new Error('Pemulihan password tersedia setelah Firebase dikonfigurasi.');
  return authSdk.sendPasswordResetEmail(auth, email);
}

export async function logoutFirebase() {
  if (firebaseReady && auth) await authSdk.signOut(auth);
}

export async function uploadArtwork(uid, dataUrl, fileName = 'karya.png') {
  if (!firebaseReady) return null;
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const fileRef = storageSdk.ref(storage, `artworks/${uid}/${Date.now()}-${fileName}`);
  await storageSdk.uploadBytes(fileRef, blob, { contentType: blob.type || 'image/png' });
  return storageSdk.getDownloadURL(fileRef);
}

export async function loadCloudSubmissions(uid, role = 'student', assignedClasses = []) {
  if (!firebaseReady) return [];
  const fs = firestoreSdk;
  const collectionRef = fs.collection(db, 'submissions');
  const queries = [];
  if (role === 'teacher') {
    for (let i = 0; i < assignedClasses.length; i += 10) {
      const group = assignedClasses.slice(i, i + 10);
      if (group.length) queries.push(fs.getDocs(fs.query(collectionRef, fs.where('classId', 'in', group))));
    }
  } else {
    queries.push(fs.getDocs(fs.query(collectionRef, fs.where('studentId', '==', uid))));
  }
  const snapshots = await Promise.all(queries);
  return snapshots.flatMap(snap => snap.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString?.() || docSnap.data().createdAt || ''
  })));
}

export async function loadCloudAssessments(submissionIds = []) {
  if (!firebaseReady || !submissionIds.length) return [];
  const fs = firestoreSdk;
  const snapshots = await Promise.all(submissionIds.map(id => fs.getDoc(fs.doc(db, 'assessments', id))));
  return snapshots.filter(snap => snap.exists()).map(snap => ({
    id: snap.id,
    ...snap.data(),
    createdAt: snap.data().createdAt?.toDate?.()?.toISOString?.() || snap.data().createdAt || ''
  }));
}

export async function saveCloudSubmission(uid, submission) {
  if (!firebaseReady) return null;
  const payload = {
    ...submission,
    studentId: uid,
    createdAt: firestoreSdk.serverTimestamp(),
    updatedAt: firestoreSdk.serverTimestamp()
  };
  const ref = await firestoreSdk.addDoc(firestoreSdk.collection(db, 'submissions'), payload);
  return ref.id;
}

export async function saveCloudAssessment(submissionId, assessment) {
  if (!firebaseReady) return null;
  const payload = {
    ...assessment,
    submissionId,
    updatedAt: firestoreSdk.serverTimestamp()
  };
  const ref = firestoreSdk.doc(db, 'assessments', submissionId);
  await firestoreSdk.setDoc(ref, payload, { merge: true });
  await firestoreSdk.updateDoc(firestoreSdk.doc(db, 'submissions', submissionId), {
    status: assessment.status,
    score: assessment.score,
    updatedAt: firestoreSdk.serverTimestamp()
  });
  return submissionId;
}
