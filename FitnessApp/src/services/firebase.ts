import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {

  apiKey: "AIzaSyB3_3ePNSvg_ZYnoWxLWRAqOWdYMRVbRGU",

  authDomain: "smart-workout-app-e0f97.firebaseapp.com",

  projectId: "smart-workout-app-e0f97",

  storageBucket: "smart-workout-app-e0f97.firebasestorage.app",

  messagingSenderId: "1049971222608",

  appId: "1:1049971222608:web:3991c271559b6c80cd8955"

};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);