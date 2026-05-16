// --- Firebase Initialization ---
const firebaseConfig = {
    apiKey: "AIzaSyDZSLkUnbpm4Xeszia20I2FEBRvrcnQdsg",
    authDomain: "bus-defect-logger-app.firebaseapp.com",
    projectId: "bus-defect-logger-app",
    storageBucket: "bus-defect-logger-app.firebasestorage.app",
    messagingSenderId: "521037668302",
    appId: "1:521037668302:web:35b950b4980f15c7d3559f",
    measurementId: "G-YYGKDCKPRT"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();
const defectFunctions = typeof firebase.functions === 'function' ? firebase.app().functions('us-central1') : null;
window.defectFunctions = defectFunctions;

// --- Admin User IDs ---
// Reverted to a single list of admins with full permissions.
const ADMIN_UIDS = [
    'rU4JIIljCmTwKyga9m3siHWVFYZ2',
    'mEuORhJLRXeN5GEXguuqhtOmwbq2',
    'oIUna4EtjVQWSOqbytp0pZnnhHG3'
];

// --- Core Authentication and Page Setup ---
document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menuBtn');
    const closeBtn = document.getElementById('closeBtn');
    const sideNav = document.getElementById('sideNav');
    const logoutBtn = document.getElementById('logoutBtn');
    const currentUserNameSpan = document.getElementById('currentUserName');

    if (menuBtn && closeBtn && sideNav) {
        menuBtn.addEventListener('click', () => { sideNav.style.width = '250px'; });
        closeBtn.addEventListener('click', () => { sideNav.style.width = '0'; });
    }

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            const displayName = userDoc.exists ? userDoc.data().displayName : 'User';
            if (currentUserNameSpan) {
                currentUserNameSpan.textContent = displayName;
            }
        } else {
            redirectToLogin();
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
                redirectToLogin();
            } catch (error) {
                console.error("Logout Error:", error);
            }
        });
    }
});

function redirectToLogin() {
    window.location.href = './login.html';
}

async function getDisplayNameForUser(uid) {
    if (!uid) return 'N/A';
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            return userDoc.data().displayName || 'Anonymous';
        }
    } catch (error) {
        console.error(`Error fetching display name for UID ${uid}:`, error);
    }
    return 'Anonymous';
}
