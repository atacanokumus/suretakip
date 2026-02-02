/**
 * Authentication module for EPDK Süre Takip Platformu
 */

const APP_PASSWORD = 'Davinci*2026';
const AUTH_KEY = 'epdk_authenticated';

/**
 * Checks if the user is authenticated in the current session
 * @returns {boolean}
 */
export function checkAuthentication() {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
}

/**
 * Authenticates the user with the provided password
 * @param {string} password 
 * @returns {boolean}
 */
export function authenticate(password) {
    if (password === APP_PASSWORD) {
        sessionStorage.setItem(AUTH_KEY, 'true');
        return true;
    }
    return false;
}

/**
 * Logs out the user and clears authentication state
 */
export function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    window.location.reload();
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
