import {app} from './games-firebase-app.js?v=20261002-games1';
import {getAuth,signInAnonymously} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {getFirestore,collection,query,orderBy,limit,getDocsFromServer,doc,getDocFromServer,writeBatch,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
const db=getFirestore(app),auth=getAuth(app);let signingIn;
async function player(){await auth.authStateReady();if(auth.currentUser)return auth.currentUser;return signingIn ||= signInAnonymously(auth).then(v=>v.user).finally(()=>{signingIn=null;});}
export async function leaderboard(){
  const result=await getDocsFromServer(query(collection(db,'reaction_scores'),orderBy('averageMs','asc'),orderBy('createdAt','asc'),limit(20)));
  return result.docs.map(s=>({id:s.id,...s.data()}));
}
export async function submit(record){
  const user=await player(),scoreRef=doc(db,'reaction_scores',record.id),playerRef=doc(db,'reaction_players',user.uid);
  const previous=await getDocFromServer(scoreRef);
  if(previous.exists()){if(previous.data().uid!==user.uid)throw new Error('different-player');return record.id;}
  const last=await getDocFromServer(playerRef);
  if(last.exists()&&Date.now()-(last.data().lastSubmittedAt?.toMillis()||0)<30000)throw new Error('cooldown');
  const batch=writeBatch(db);
  batch.set(scoreRef,{uid:user.uid,name:record.name,rounds:record.rounds,totalMs:record.totalMs,averageMs:record.averageMs,falseStarts:record.falseStarts,createdAt:serverTimestamp()});
  batch.set(playerRef,{lastSubmittedAt:serverTimestamp(),lastRunId:record.id});
  await batch.commit();return record.id;
}
