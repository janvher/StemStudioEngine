import { type Transaction } from 'firebase-admin/firestore';
import { getFirestoreDb } from '../utils/firebase/firebase.js';

/**
 * 1 credit = 100 total tokens (input + output).
 * Users start with 1000 credits (100k tokens) refreshed weekly.
 */
const TOKENS_PER_CREDIT = 100;

export async function getUserAiCredits(uid: string): Promise<number | null> {
    try {
        const db = await getFirestoreDb();
        const snap = await db.collection('users').doc(uid).get();
        if (!snap.exists) return null;
        const data = snap.data();
        return typeof data?.aiCredits === 'number' ? data.aiCredits : null;
    } catch (e) {
        // Fail open — don't block the user if Firestore is temporarily unavailable
        console.error(`Failed to get AI credits for user ${uid}:`, e);
        return null;
    }
}

export async function decrementAiCredits(uid: string, inputTokens: number, outputTokens: number): Promise<void> {
    const totalTokens = inputTokens + outputTokens;
    const creditsToDecrement = Math.ceil(totalTokens / TOKENS_PER_CREDIT);
    console.log(`Calculated ${creditsToDecrement} credits to decrement for user ${uid} (${inputTokens} input tokens + ${outputTokens} output tokens = ${totalTokens} total tokens)`);
    if (creditsToDecrement <= 0) return;

    const db = await getFirestoreDb();
    const userRef = db.collection('users').doc(uid);

    await db.runTransaction(async (transaction: Transaction) => {
        const snap = await transaction.get(userRef);
        const current: number = snap.data()?.aiCredits ?? 0;
        const newValue = Math.max(0, current - creditsToDecrement);
        transaction.update(userRef, { aiCredits: newValue });
        console.log(`Decremented AI credits for user ${uid}: ${current} -> ${newValue} (${creditsToDecrement}). Tokens used: ${totalTokens}`);
    });
}
