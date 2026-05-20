import { NextFunction, Request, Response } from "express";
import basicAuth from "express-basic-auth";
import { IS_PRODUCTION } from "../ServerConfig.js";

export default class PasswordProtection {

    public static createBasicPasswordProtectionMiddleware(password: string) {
        if (!IS_PRODUCTION) {
            return (req: Request, res: Response, next: NextFunction) => { next(); }
        }
        return basicAuth({
            users: {
                "admin": password,
            },
            challenge: true,
        });
    }
}