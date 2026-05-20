import { monitor } from "@colyseus/monitor";
import { Server } from "@colyseus/core";
import { firebaseService } from "./firebase/firebase.service.js";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import ServerConfig from "./ServerConfig.js";
import GameRegistration from "./GameRegistration.js";
import MatchMaker from "./rooms/MatchMaker.js";
import PrivateMatchMaker from "./rooms/PrivateMatchMaker.js";
import { PrivateRoomController } from "./controllers/PrivateRoomController.js";
import console from "node:console";
import PasswordProtection from "./utils/PasswordProtection.js";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sup3rS3cur3';

let gameServerInstance: any = null;
let gameRegistration: GameRegistration | null = null;
let privateRoomController: PrivateRoomController | null = null;

export const catchAllErrors = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(`API error: ${req.path}\n ${JSON.stringify(err)}`, next);
    res.status(500).json({
        message: err.message
    });
};

export const initColyseus = async () => {
    console.info("Initializing express");
    const app = express();

    const transport = ServerConfig.getTransport(app);
    const gameServerOptions = ServerConfig.getServerConfig(transport);

    MatchMaker.init(gameServerOptions.redisClient ?? null);
    PrivateMatchMaker.init(gameServerOptions.redisClient ?? null);

    gameServerInstance = new Server(gameServerOptions);
    ServerConfig.setTerminationHandlers(gameServerInstance);

    //init matchmaker
    MatchMaker.init(gameServerOptions.redisClient ?? null);

    //start room registration
    gameRegistration = new GameRegistration(gameServerInstance);
    privateRoomController = new PrivateRoomController();

    // Make checkAndRegisterScene function available globally for room creation
    //(gameServerInstance as any).checkAndRegisterScene = checkAndRegisterScene.bind(null, gameServerInstance);

    // Optional: Still load existing multiplayer scenes on startup (more efficient than interval)
    gameRegistration.startPeriodicCheck();

    // Default middlewares
    app.use(cors());
    app.use(express.json());

    // Disable cache middleware
    const disableCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0'); // Expire immediately
        next();
    };
    app.use(disableCacheMiddleware);
    app.disable('etag');

    // Colyseus monitor for debugging
    app.use("/colyseus", PasswordProtection.createBasicPasswordProtectionMiddleware(ADMIN_PASSWORD), monitor());

    // Regular matchmaking routes
    app.use('/mp/api/match/scenes', MatchMaker.getRouter());

    // Private room routes
    app.use('/mp/api/private-rooms', privateRoomController.getRouter());
    app.use('/mp/api/private-match', PrivateMatchMaker.getRouter());

    app.get('/health', (req: Request, res: Response) => {
        res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.get('/ready', (req: Request, res: Response) => {
        res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
    });

    //must be the last middleware
    app.use(catchAllErrors);

    try {
        await firebaseService.initialize();
    } catch (error) {
        console.error("Failed to initialize Firebase:", error);
    }

    gameServerInstance.listen(parseInt(process.env.PORT ?? "2567"));
};
