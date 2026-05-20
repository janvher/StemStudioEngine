import {NextFunction, Request, Response} from "express";

// Disable cache middleware
export const disableCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0'); // Expire immediately
    next();
};
