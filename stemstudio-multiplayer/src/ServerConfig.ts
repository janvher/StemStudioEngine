import { Server } from '@colyseus/core';
import { ServerOptions } from '@colyseus/core/build/Server';
import { Presence } from '@colyseus/core/build/presence/Presence';

import { LocalPresence, MatchMakerDriver, Transport } from "@colyseus/core";
import { RedisPresence } from "@colyseus/redis-presence";

import Redis, { Cluster, ClusterOptions, RedisOptions } from "ioredis";
import http from "http";
import * as core from "express-serve-static-core";
import { LocalDriver } from "@colyseus/core/build/matchmaker/driver/index.js";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { RedisDriver } from "colyseus";

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export default class ServerConfig {

    public static setTerminationHandlers(gameServer: Server) {
        // Add server-level shutdown logging
        gameServer.onShutdown(() => {
            console.warn("[SERVER_SHUTDOWN] Colyseus server is shutting down...");
        });

        // Track process signals for unexpected terminations
        process.on("SIGTERM", () => {
            console.warn("[PROCESS_TERMINATION] SIGTERM received, beginning graceful shutdown");
        });

        process.on("SIGINT", () => {
            console.warn("[PROCESS_TERMINATION] SIGINT received, beginning graceful shutdown");
        });
    }

    public static getTransport(app: core.Express) {
        const webServer = http.createServer(app);

        return new WebSocketTransport({
            server: webServer,
            pingInterval: 6000, // milliseconds
            pingMaxRetries: 4,
            maxPayload: 1024 * 1024 * 2, // 1MB Max Payload
        });
    }

    public static getServerConfig(transport: Transport): ServerOptions & { redisClient?: Redis | Cluster } {
        console.info(`Initializing Colyseus Server: REDIS_ENABLED=${process.env.REDIS_ENABLED} REDIS_CLUSTERNODES=${process.env.REDIS_CLUSTERNODES} REDIS_HOST=${process.env.REDIS_HOST} REDIS_PORT=${process.env.REDIS_PORT}`);

        let redisPresence: Presence = new LocalPresence();
        let redisDriver: MatchMakerDriver = new LocalDriver();
        let publicAddress = undefined;
        let redisClient: Redis | Cluster | undefined = undefined;

        if (process.env.REDIS_ENABLED === "true") {
            let redisClusterDeployment = false;
            const redisOptions : RedisOptions = {
                password: process.env.REDIS_PASSWORD,
                username: process.env.REDIS_USR,
                tls: undefined,
                db: 0,
                reconnectOnError: (err) => {
                    console.error("Redis reconnectOnError:", err);
                    return true; // Try to reconnect on all errors
                },
            };


            if (process.env.REDIS_CLUSTERNODES && process.env.REDIS_CLUSTERNODES !== "") {

                if (process.env.REDIS_HOST === process.env.REDIS_CLUSTERNODES) {
                    console.info(`Initializing Colyseus Server (Single Mode): ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
                    const singleHostRedisOptions = { host: process.env.REDIS_HOST, ...redisOptions };
                    redisPresence = new RedisPresence(singleHostRedisOptions);
                    redisDriver = new RedisDriver(singleHostRedisOptions);
                    redisClient = new Redis(singleHostRedisOptions);
                } else {
                    console.info(`Initializing Colyseus Server (Cluster Mode): ${process.env.REDIS_CLUSTERNODES}:${process.env.REDIS_PORT}`);
                    redisClusterDeployment = true;
                    const clusterOptions: ClusterOptions = {
                        slotsRefreshTimeout: 2000,
                        dnsLookup: (address, callback) => callback(null, address),
                        redisOptions,
                    };

                    const redisPort = parseInt(process.env.REDIS_PORT ?? "2567", 10);
                    const clusterNodes = process.env.REDIS_CLUSTERNODES.split(",").map(host => {
                        console.info(`Using Redis cluster node values: ${host}:${redisPort}`);
                        return { host, port: redisPort };
                    });

                    console.info("Creating Redis instances");
                    redisPresence = new RedisPresence(clusterNodes, clusterOptions);
                    redisDriver = new RedisDriver(clusterNodes, clusterOptions);
                    redisClient = new Redis.Cluster(clusterNodes, clusterOptions);
                }

                // Enhanced error and event handling
                [redisPresence, redisDriver].forEach((instance, idx) => {
                    const name = idx === 0 ? "Presence" : "Driver";

                    (instance as any).client?.on("error", (err: Error) => {
                        console.error(`Redis ${name} Error:`, err);
                    });
                    (instance as any).client?.on("connect", () => {
                        console.info(`Redis ${name} Connected`);
                    });

                    (instance as any).client?.on("ready", () => {
                        console.info(`Redis ${name} Ready`);
                    });
                    (instance as any).client?.on("close", () => {
                        console.warn(`Redis ${name} Connection Closed`);
                    });
                    (instance as any).client?.on("reconnecting", () => {
                        console.info(`Redis ${name} Reconnecting...`);
                    });
                    (instance as any).client?.on("end", () => {
                        console.warn(`Redis ${name} Connection Ended`);
                    });

                    if (redisClusterDeployment) {
                        (instance as any).client?.on("node error", (error: any, node: any) => {
                            console.error(`REDIS ${name} : Node ${node.options.host}:${node.options.port} error:`, error);
                        });

                        (instance as any).client?.on("+node", (node: any) => {
                            console.log(`REDIS ${name} : Node ${node.options.host}:${node.options.port} added`);
                        });

                        (instance as any).client?.on("-node", (node: any) => {
                            console.log(`REDIS ${name} : Node ${node.options.host}:${node.options.port} removed`);
                        });


                        // Optional: Monitor commands on all nodes
                        // Note: Use with caution in production
                        (instance as any).client?.nodes().forEach((node: Redis) => {
                            node.monitor().then((monitor: any) => {
                                monitor.on("monitor", (time: any, args: any) => {
                                    console.log(`REDIS ${name} : [Node ${node.options.host}:${node.options.port}] ${time}: ${args.join(", ")}`);
                                });
                            });
                        });
                    }
                });

                publicAddress = `${process.env.FQDN_HOSTNAME}`;
            }
        }

        console.info(`Public address: ${publicAddress}`);

        return {
            ...redisClient ? { redisClient } : {},
            transport,
            ...redisPresence ? { presence: redisPresence } : {},
            ...redisDriver ? { driver: redisDriver } : {},
            ...publicAddress ? { publicAddress } : {},
        } as ServerOptions;
    }
}
