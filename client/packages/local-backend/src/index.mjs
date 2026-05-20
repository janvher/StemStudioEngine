import {createLocalBackendServer} from "./server.mjs";

const port = Number(process.env.LOCAL_BACKEND_PORT || 3030);
const host = process.env.LOCAL_BACKEND_HOST || "127.0.0.1";
const dataFile = process.env.LOCAL_BACKEND_DATA_FILE || ".local-backend/scenes.json";

const server = createLocalBackendServer({port, host, dataFile});

server.listen().then(() => {
  console.log(`[local-backend] listening on http://${host}:${port}`);
  console.log(`[local-backend] persistence file: ${dataFile}`);
});
