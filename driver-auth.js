const DRIVER_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDZSLkUnbpm4Xeszia20I2FEBRvrcnQdsg",
    authDomain: "bus-defect-logger-app.firebaseapp.com",
    projectId: "bus-defect-logger-app",
    storageBucket: "bus-defect-logger-app.firebasestorage.app",
    messagingSenderId: "521037668302",
    appId: "1:521037668302:web:35b950b4980f15c7d3559f",
    measurementId: "G-YYGKDCKPRT"
};

if (!firebase.apps.length) {
    firebase.initializeApp(DRIVER_FIREBASE_CONFIG);
}

const driverAuth = firebase.auth();
const driverDb = firebase.firestore();
const driverGoogleProvider = new firebase.auth.GoogleAuthProvider();
window.auth = driverAuth;
window.db = driverDb;

const DriverAccessState = Object.freeze({
    ALLOWED: 'allowed',
    PENDING: 'pending',
    REJECTED: 'rejected',
    DENIED: 'denied'
});

function normaliseDriverError(error) {
    switch (error?.code) {
        case 'auth/email-already-in-use':
            return 'That email address is already in use.';
        case 'auth/invalid-email':
            return 'That email address is not valid.';
        case 'auth/weak-password':
            return 'Password must be at least 6 characters long.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'The email or password was not recognised.';
        case 'auth/popup-closed-by-user':
            return 'Google sign-in was closed before it finished.';
        case 'auth/cancelled-popup-request':
            return 'A sign-in window is already open.';
        default:
            return error?.message || 'Something went wrong. Please try again.';
    }
}

function isLikelyMobileAppleBrowser() {
    const ua = navigator.userAgent || '';
    const isiOS = /iPhone|iPad|iPod/i.test(ua);
    const isSafariLike = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    return isiOS && isSafariLike;
}

async function getDriverUserRecord(uid) {
    if (!uid) return null;
    const snapshot = await driverDb.collection('users').doc(uid).get();
    return snapshot.exists ? snapshot.data() : null;
}

async function getDriverDisplayNameForUser(uid) {
    if (!uid) return 'N/A';
    try {
        const userDoc = await driverDb.collection('users').doc(uid).get();
        if (userDoc.exists) {
            return userDoc.data().displayName || 'Anonymous';
        }
    } catch (error) {
        console.error(`Error fetching display name for UID ${uid}:`, error);
    }
    return 'Anonymous';
}

window.getDisplayNameForUser = getDriverDisplayNameForUser;

function resolveDriverAccessState(userRecord) {
    if (!userRecord) return DriverAccessState.PENDING;
    if (userRecord.status === 'pending') return DriverAccessState.PENDING;
    if (userRecord.status === 'rejected') return DriverAccessState.REJECTED;
    if (userRecord.status !== 'approved') return DriverAccessState.DENIED;
    return userRecord.role === 'driver' || userRecord.role === 'admin'
        ? DriverAccessState.ALLOWED
        : DriverAccessState.DENIED;
}

document.addEventListener('DOMContentLoaded', async () => {
    const showLoginTabBtn = document.getElementById('showLoginTabBtn');
    const showSignupTabBtn = document.getElementById('showSignupTabBtn');
    const loginPanel = document.getElementById('loginPanel');
    const signupPanel = document.getElementById('signupPanel');
    const authStatusMessage = document.getElementById('authStatusMessage');
    const emailLoginBtn = document.getElementById('emailLoginBtn');
    const emailSignupBtn = document.getElementById('emailSignupBtn');
    const googleAuthBtn = document.getElementById('googleAuthBtn');

    if (!showLoginTabBtn || !showSignupTabBtn || !loginPanel || !signupPanel || !authStatusMessage || !emailLoginBtn || !emailSignupBtn || !googleAuthBtn) {
        return;
    }

    const setStatus = (message = '', type = '') => {
        authStatusMessage.textContent = message;
        authStatusMessage.className = `driver-auth-status ${type}`.trim();
    };

    const setBusy = (busy) => {
        [emailLoginBtn, emailSignupBtn, googleAuthBtn, showLoginTabBtn, showSignupTabBtn].forEach((button) => {
            button.disabled = busy;
        });
    };

    const showTab = (tabName) => {
        const showingLogin = tabName === 'login';
        loginPanel.hidden = !showingLogin;
        signupPanel.hidden = showingLogin;
        showLoginTabBtn.classList.toggle('active', showingLogin);
        showSignupTabBtn.classList.toggle('active', !showingLogin);
        showLoginTabBtn.setAttribute('aria-pressed', String(showingLogin));
        showSignupTabBtn.setAttribute('aria-pressed', String(!showingLogin));
        setStatus();
    };

    showLoginTabBtn.addEventListener('click', () => showTab('login'));
    showSignupTabBtn.addEventListener('click', () => showTab('signup'));

    driverAuth.onAuthStateChanged(async (user) => {
        if (!user) return;
        try {
            const userRecord = await getDriverUserRecord(user.uid);
            const accessState = resolveDriverAccessState(userRecord);
            if (accessState === DriverAccessState.ALLOWED || accessState === DriverAccessState.PENDING || accessState === DriverAccessState.REJECTED) {
                window.location.href = './driver.html';
                return;
            }
            await driverAuth.signOut();
            setStatus('This account is not authorised to use the driver web app.', 'error');
        } catch (error) {
            console.error('Error checking driver access state:', error);
            setStatus('Could not verify your account yet. Please try again.', 'error');
        }
    });

    try {
        const redirectResult = await driverAuth.getRedirectResult();
        if (redirectResult?.user) {
            setStatus('Google sign-in complete. Checking approval status...', 'success');
        }
    } catch (error) {
        console.error('Google redirect sign-in failed:', error);
        setStatus(normaliseDriverError(error), 'error');
    }

    emailLoginBtn.addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            setStatus('Enter both your email and password.', 'error');
            return;
        }

        setBusy(true);
        setStatus('Signing you in...', 'info');
        try {
            await driverAuth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            console.error('Driver email sign-in failed:', error);
            setStatus(normaliseDriverError(error), 'error');
        } finally {
            setBusy(false);
        }
    });

    emailSignupBtn.addEventListener('click', async () => {
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;

        if (!name || !email || !password) {
            setStatus('Enter your name, email, and password to create a driver account.', 'error');
            return;
        }

        if (password.length < 6) {
            setStatus('Password must be at least 6 characters long.', 'error');
            return;
        }

        setBusy(true);
        setStatus('Creating your driver account...', 'info');
        try {
            const credential = await driverAuth.createUserWithEmailAndPassword(email, password);
            if (credential.user) {
                await credential.user.updateProfile({ displayName: name });
            }
            setStatus('Account created. Your approval request is now waiting for an administrator.', 'success');
            window.location.href = './driver.html';
        } catch (error) {
            console.error('Driver email sign-up failed:', error);
            setStatus(normaliseDriverError(error), 'error');
        } finally {
            setBusy(false);
        }
    });

    googleAuthBtn.addEventListener('click', async () => {
        setBusy(true);
        setStatus('Opening Google sign-in...', 'info');

        try {
            if (isLikelyMobileAppleBrowser()) {
                await driverAuth.signInWithRedirect(driverGoogleProvider);
                return;
            }

            await driverAuth.signInWithPopup(driverGoogleProvider);
        } catch (error) {
            console.error('Driver Google sign-in failed:', error);
            setStatus(normaliseDriverError(error), 'error');
        } finally {
            setBusy(false);
        }
    });
});
