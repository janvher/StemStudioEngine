import { Request, Response, NextFunction } from 'express';
import WebSocket from 'ws';
import { isFirebaseConfigured, verifyIdToken } from '../utils/firebase/firebase.js';

type GuestClaim = { uid: string; email?: string; guest: true };

function extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    return token.length > 0 ? token : null;
}

function guestClaim(): GuestClaim {
    return { uid: 'guest', guest: true };
}

export async function verifyFirebaseToken(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    if (!isFirebaseConfigured()) {
        res.locals.firebaseUser = guestClaim();
        next();
        return;
    }

    const token = extractBearerToken(req.headers['authorization']);

    if (!token) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Authorization header with Bearer token is required',
        });
        return;
    }

    try {
        res.locals.firebaseUser = await verifyIdToken(token);
        next();
    } catch {
        res.status(403).json({
            error: 'Forbidden',
            message: 'Firebase ID token is invalid or expired',
        });
    }
}

export async function verifyFirebaseTokenWs(
    ws: WebSocket,
    req: Request,
): Promise<{ uid: string; email?: string } | null> {
    if (!isFirebaseConfigured()) {
        return guestClaim();
    }

    const token = extractBearerToken(req.headers['authorization'])
        ?? (req.query.token as string | undefined)
        ?? null;

    if (!token) {
        ws.close(4001, 'Unauthorized: Bearer token required');
        return null;
    }

    try {
        return await verifyIdToken(token);
    } catch {
        ws.close(4001, 'Forbidden: Firebase ID token invalid or expired');
        return null;
    }
}
