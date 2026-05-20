import { initColyseus } from "./app.config.js";
import { connectMongo } from "./utils/mongo.js";
import { config as envConfig } from 'dotenv';

// Initialize environment variables
envConfig();

(async () => {
  await connectMongo();
  await initColyseus();
})();
