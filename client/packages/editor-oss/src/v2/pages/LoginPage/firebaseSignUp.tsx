/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {getAuthProvider, type IAuthUser} from "../../../auth";
import {getRemoteDocStore} from "../../../data";
import {IForm} from "../RegisterPage/RegisterPage";

type SignInResult =
    | {status: "logged_in"; user: IAuthUser}
    | {status: "verification_required"; user: IAuthUser}
    | {status: "error"; message: string; code?: string};

/**
 * Sign in with an email/password pair. Returns a discriminated result
 * the caller can switch on without poking at Firebase error codes
 * directly.
 *
 * Note: emailVerified status is treated as "logged in" here — the
 * verification gate is enforced server-side. If you need stricter
 * verification flow, gate it at the caller.
 */
export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
    try {
        const user = await getAuthProvider().signInWithEmailAndPassword(email, password);
        return {
            status: "logged_in",
            user,
        };
    } catch (error: unknown) {
        console.error("signInWithEmail", error);
        const firebaseError = error as {code?: string; message?: string};
        const code = firebaseError.code;
        let message = firebaseError.message ?? "Authentication error";
        switch (code) {
            case "auth/invalid-credential":
                message = "Invalid credentials or account uses a different sign-in method";
                break;
            case "auth/user-not-found":
                message = "User not found";
                break;
            case "auth/wrong-password":
                message = "Wrong password";
                break;
            case "auth/too-many-requests":
                message = "Too many attempts. Try again later";
                break;
            default:
                message = "Authentication error";
        }
        return {
            status: "error",
            message,
            code,
        };
    }
}

type SignUpResult =
    | {status: "verification_required"; user: IAuthUser}
    | {status: "error"; message: string; code?: string};

/**
 * Register a new account with email/password. On success, also sends the
 * email verification message and writes a `pendingUsersForm/{uid}` record
 * to the integrated Firestore (Firestore call is no-op in OSS where `db`
 * is null).
 */
export async function signUpWithEmail(form: IForm, password: string): Promise<SignUpResult> {
    try {
        const provider = getAuthProvider();
        const user = await provider.createUserWithEmailAndPassword(form.email, password);

        // Email verification and remote registration are best-effort.
        // Integrated builds need both; OSS no-ops both because the
        // NullAuthProvider rejects sendEmailVerification and the
        // NullRemoteDocStore silently drops the write.
        try {
            await provider.sendEmailVerification();
        } catch (e) {
            console.debug("sendEmailVerification skipped:", e);
        }
        await getRemoteDocStore().setDoc("pendingUsersForm", user.uid, {
            ...form,
            email: form.email,
            createdAt: Date.now(),
        });

        return {
            status: "verification_required",
            user,
        };
    } catch (error: any) {
        return {
            status: "error",
            message: error.message as string,
            code: error.code as string,
        };
    }
}

/** Trigger a password-reset email. */
export async function resetPassword(email: string) {
    try {
        await getAuthProvider().sendPasswordResetEmail(email);
        return {
            status: "success",
            message: "Password reset email sent",
        };
    } catch (error: any) {
        return {
            status: "error",
            message: error.message as string,
            code: error.code as string,
        };
    }
}
