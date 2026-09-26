// Uses the portfolio's existing public Firebase web-app configuration.
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {getAuth, signInAnonymously} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {getFirestore, collection, query, orderBy, limit, getDocsFromServer, doc, getDocFromServer, writeBatch, serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
const app = initializeApp({apiKey:'AIzaSyByl0rQEYKVbhsGBKILvgaBr8EFw0AqO0E',authDomain:'my-prompt-library-d15ff.firebaseapp.com',projectId:'my-prompt-library-d15ff',storageBucket:'my-prompt-library-d15ff.firebasestorage.app',messagingSenderId:'32943955220',appId:'1:32943955220:web:5d5ccc2ebf37bb4816b601'}, 'portfolio-games');
const db = getFirestore(app), auth = getAuth(app);
let signingIn;
async function player() {
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  if (!signingIn) signingIn = signInAnonymously(auth).then(v => v.user).finally(() => {signingIn = null;});
  return signingIn;
}
export async function leaderboard() {
  const snapshots = await getDocsFromServer(query(collection(db, 'game2048_scores'), orderBy('score', 'desc'), orderBy('createdAt', 'asc'), limit(20)));
  return snapshots.docs.map(v => ({id:v.id,...v.data(),date:v.data().createdAt?.toMillis() || 0}))
    .sort((a,b) => b.score-a.score || a.date-b.date || a.id.localeCompare(b.id)).slice(0,20);
}
export async function submit(record) {
  const user = await player();
  const scoreRef = doc(db, 'game2048_scores', record.id), playerRef = doc(db,'game2048_players',user.uid);
  // A lost success response must not create a duplicate on retry.
  const previous = await getDocFromServer(scoreRef);
  if (previous.exists()) {
    if (previous.data().uid !== user.uid) throw new Error('這筆紀錄無法重新送出，請開始新的一局。');
    return record.id;
  }
  const last = await getDocFromServer(playerRef);
  if (last.exists() && Date.now() - (last.data().lastSubmittedAt?.toMillis() || 0) < 30000) throw new Error('剛剛已送出一筆紀錄，請稍候 30 秒再試。');
  const batch = writeBatch(db);
  batch.set(scoreRef,{uid:user.uid,name:record.name,score:record.score,moves:record.moves,maxTile:record.maxTile,outcome:record.outcome,createdAt:serverTimestamp()});
  batch.set(playerRef,{lastSubmittedAt:serverTimestamp(),lastRunId:record.id});
  await batch.commit();
  return record.id;
}
