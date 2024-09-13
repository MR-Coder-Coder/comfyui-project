// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAIZqeCKHP9rA2Ej5PcB_PO4cFFMs8OtaQ",
    authDomain: "comfyui-project.firebaseapp.com",
    projectId: "comfyui-project",
    storageBucket: "comfyui-project.appspot.com",
    messagingSenderId: "360956704287",
    appId: "1:360956704287:web:06914743c79c105061472a",
    measurementId: "G-PS1EM02M1X"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { app, auth, db };