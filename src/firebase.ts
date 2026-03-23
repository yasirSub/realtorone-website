import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: 'AIzaSyDmr-QmgYbPjxco3k36WXfF3K1_3fuU13Y',
    authDomain: 'realtor-one.firebaseapp.com',
    projectId: 'realtor-one',
    storageBucket: 'realtor-one.firebasestorage.app',
    messagingSenderId: '790178174861',
    appId: '1:790178174861:web:1d948b292b078b9d7ccfc4',
    measurementId: 'G-0EDM1TZWPW',
};

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);

/** Analytics only when the browser supports it (avoids SSR / unsupported env errors). */
export async function initFirebaseAnalytics(): Promise<Analytics | null> {
    try {
        if (await isSupported()) {
            return getAnalytics(firebaseApp);
        }
    } catch {
        /* ignore */
    }
    return null;
}
