/**
 * Firebase Configuration and Initialization
 */

// These will be replaced by the user with actual config from Firebase Console
// For now, these are placeholders for initialization
const firebaseConfig = {
    apiKey: "AIzaSyD2X_ccHXMwLw9gcnHHt9d1zNGyrHzhGKM",
    authDomain: "sure-takip.firebaseapp.com",
    projectId: "sure-takip",
    storageBucket: "sure-takip.firebasestorage.app",
    messagingSenderId: "973425573379",
    appId: "1:973425573379:web:0d8209ee73930793ed9836",
    measurementId: "G-FHBB7XYVP2"
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
