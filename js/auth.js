/**
 * Authentication module for EPDK Süre Takip Platformu
 */

import { auth } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/**
 * Checks if the user is authenticated via Firebase
 * @param {Function} callback - Function to call with auth state
 */
export function checkAuthentication(callback) {
    onAuthStateChanged(auth, (user) => {
        if (callback) callback(user);
    });
}

/**
 * Authenticates the user with Firebase Email/Password
 * @param {string} email
 * @param {string} password
 * @param {boolean} remember - Whether to persist the session
 * @returns {Promise<{success: boolean, error?: Error}>}
 */
export async function authenticate(email, password, remember = true) {
    try {
        const persistence = remember ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);
        await signInWithEmailAndPassword(auth, email, password);
        return { success: true };
    } catch (error) {
        console.error('Auth Error:', error.code, error.message);
        return { success: false, error: error };
    }
}

/**
 * Logs out the user from Firebase
 */
export async function logout() {
    try {
        await signOut(auth);
        window.location.reload();
    } catch (error) {
        console.error('Logout Error:', error);
    }
}

/**
 * Adds shake animation styles to the document head
 */
export function initAuthStyles() {
    if (document.getElementById('authShakeStyles')) return;

    const shakeStyle = document.createElement('style');
    shakeStyle.id = 'authShakeStyles';
    shakeStyle.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(shakeStyle);
}
