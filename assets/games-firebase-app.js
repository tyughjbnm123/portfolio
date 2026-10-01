// Shared public web configuration for the dedicated Games project.
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';

const firebaseConfig = {
  apiKey: 'AIzaSyA6kEdehsVQWs13xylDfihNggjxXba8N50',
  authDomain: 'games-a32c4.firebaseapp.com',
  projectId: 'games-a32c4',
  storageBucket: 'games-a32c4.firebasestorage.app',
  messagingSenderId: '401025776964',
  appId: '1:401025776964:web:1554530b608b77a103ab11',
  measurementId: 'G-CSMFPLGHTT'
};

// A project-specific app name keeps the original prompt library's session separate.
const appName = 'portfolio-games-' + firebaseConfig.projectId;
export const app = getApps().find(existing => existing.name === appName)
  || initializeApp(firebaseConfig, appName);
