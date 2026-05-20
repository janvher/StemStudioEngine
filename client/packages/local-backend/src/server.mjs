import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
};

const notFound = (res) => {
  res.writeHead(404, jsonHeaders);
  res.end(JSON.stringify({ error: "Not Found" }));
};

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const now = () => new Date().toISOString();

const makeDefaultSceneData = () => ({
  metadata: { version: 4.5, type: "Object" },
  geometries: [],
  materials: [],
  textures: [],
  images: [],
  object: {
    uuid: "scene-root",
    type: "Scene",
    name: "Scene",
    layers: 1,
    matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    up: [0, 1, 0],
    children: [],
    userData: {},
  },
});

const normalizePayload = (payload) => {
  if (!payload) return makeDefaultSceneData();
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return makeDefaultSceneData();
    }
  }
  return payload;
};

const createLocalStore = (dataFile) => {
  const dbPath = resolve(
    process.cwd(),
    dataFile || ".local-backend/scenes.json",
  );
  mkdirSync(dirname(dbPath), { recursive: true });

  let state = {
    nextId: 1,
    scenes: {},
  };

  try {
    const saved = JSON.parse(readFileSync(dbPath, "utf8"));
    if (saved && typeof saved === "object") {
      state = {
        nextId: Number(saved.nextId) || 1,
        scenes: saved.scenes || {},
      };
    }
  } catch {
    // Fresh state
  }

  const persist = () => {
    writeFileSync(dbPath, JSON.stringify(state, null, 2));
  };

  const upsertScene = ({
    sceneId,
    name,
    alias,
    payload,
    metadata,
    sceneFields,
  }) => {
    const id = sceneId || `local-${state.nextId++}`;
    const existing = state.scenes[id];
    const revisionNumber = existing
      ? Number(existing.revisionNumber || 0) + 1
      : 1;
    const revisionId = `rev-${revisionNumber}`;
    const assetId = existing?.assetId || `asset-${id}`;

    const record = {
      id,
      name: name || existing?.name || "Untitled Scene",
      alias: alias || existing?.alias || id,
      payload: normalizePayload(payload),
      metadata: metadata || existing?.metadata || {},
      sceneFields: {
        ...(existing?.sceneFields || {}),
        ...(sceneFields || {}),
      },
      assetId,
      revisionId,
      revisionNumber,
      updatedAt: now(),
      createdAt: existing?.createdAt || now(),
    };

    state.scenes[id] = record;
    persist();
    return record;
  };

  const getScene = (sceneId) => state.scenes[sceneId] || null;

  const listScenes = () =>
    Object.values(state.scenes).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );

  return { upsertScene, getScene, listScenes };
};

const getMetadata = (record) => ({
  lockedItems: record.sceneFields.lockedItems || "",
  isMultiplayer: !!record.sceneFields.isMultiplayer,
  multiplayerAutoJoin: !!record.sceneFields.multiplayerAutoJoin,
  maxMultiplayerClientsPerRoom: Number(
    record.sceneFields.maxMultiplayerClientsPerRoom || 4,
  ),
  isSandbox: !!record.sceneFields.isSandbox,
  isCollaborative: !!record.sceneFields.isCollaborative,
  maxCollaboratorsInRoom: Number(
    record.sceneFields.maxCollaboratorsInRoom || 6,
  ),
  showHud: !!record.sceneFields.showHUD,
  showStats: !!record.sceneFields.showStats,
  showMemoryStats: !!record.sceneFields.showMemoryStats,
  useInstancing: !!record.sceneFields.useInstancing,
  voiceChatEnabled: !!record.sceneFields.voiceChatEnabled,
  rendering: record.sceneFields.rendering || {},
  useAvatar: !!record.sceneFields.useAvatar,
  vfxOnMobile: !!record.sceneFields.vfxOnMobile,
  allowAnonymousFirebase: !!record.sceneFields.allowAnonymousFirebase,
  dependencies: record.sceneFields.dependencies || {},
  logicalIdToAssetId: record.sceneFields.logicalIdToAssetId || {},
});

const sceneResponse = (record, origin) => ({
  id: record.id,
  name: record.name,
  alias: record.alias,
  thumbnail: record.sceneFields.thumbnail || "",
  description: record.sceneFields.description || "",
  tags: record.sceneFields.tags || "[]",
  userId: "local-user",
  isPublished: true,
  isPublic: true,
  isCloneable: true,
  isAssetPack: !!record.sceneFields.isAssetPack,
  isTopPick: !!record.sceneFields.isTopPick,
  isCollaborative: !!record.sceneFields.isCollaborative,
  isSandbox: !!record.sceneFields.isSandbox,
  allowAnonymousFirebase: !!record.sceneFields.allowAnonymousFirebase,
  assetsCount: Number(record.sceneFields.assetsCount || 0),
  contentRating: record.sceneFields.contentRating || "Unrated",
  majorVersion: 1,
  minorVersion: record.revisionNumber,
  createTime: record.createdAt,
  updateTime: record.updatedAt,
  asset: {
    id: record.assetId,
    revision: {
      id: record.revisionId,
      metadata: getMetadata(record),
      derivatives: [],
      dataUrl: `${origin}/api/local-backend/scene/${record.id}/payload`,
      expiresAt: "2099-01-01T00:00:00.000Z",
    },
  },
});

export const createLocalBackendServer = ({
  port = 3030,
  host = "127.0.0.1",
  dataFile,
} = {}) => {
  const store = createLocalStore(dataFile);

  const server = createServer(async (req, res) => {
    if (!req.url) return notFound(res);

    if (req.method === "OPTIONS") {
      res.writeHead(204, jsonHeaders);
      res.end();
      return;
    }

    const origin = `http://${req.headers.host || `${host}:${port}`}`;
    const parsed = new URL(req.url, origin);
    const { pathname, searchParams } = parsed;

    if (pathname === "/health") {
      res.writeHead(200, jsonHeaders);
      res.end(JSON.stringify({ ok: true, mode: "local-backend" }));
      return;
    }

    if (pathname === "/api/scene" && req.method === "POST") {
      const body = await readBody(req);
      const scene = store.upsertScene({
        name: body.name,
        alias: body.alias,
        payload: makeDefaultSceneData(),
        metadata: {},
        sceneFields: body,
      });
      res.writeHead(201, jsonHeaders);
      res.end(JSON.stringify(sceneResponse(scene, origin)));
      return;
    }

    const sceneMatch = pathname.match(/^\/api\/scene\/([^/]+)$/);
    if (sceneMatch && req.method === "GET") {
      const sceneId = decodeURIComponent(sceneMatch[1]);
      const scene = store.getScene(sceneId);
      if (!scene) {
        res.writeHead(404, jsonHeaders);
        res.end(JSON.stringify({ error: "Scene not found" }));
        return;
      }
      res.writeHead(200, jsonHeaders);
      res.end(JSON.stringify(sceneResponse(scene, origin)));
      return;
    }

    if (sceneMatch && req.method === "PATCH") {
      const sceneId = decodeURIComponent(sceneMatch[1]);
      const scene = store.getScene(sceneId);
      if (!scene) {
        res.writeHead(404, jsonHeaders);
        res.end(JSON.stringify({ error: "Scene not found" }));
        return;
      }
      const body = await readBody(req);
      const updated = store.upsertScene({
        sceneId,
        name: body.name || scene.name,
        alias: scene.alias,
        payload: scene.payload,
        metadata: getMetadata(scene),
        sceneFields: body,
      });
      res.writeHead(200, jsonHeaders);
      res.end(JSON.stringify(sceneResponse(updated, origin)));
      return;
    }

    const revisionMatch = pathname.match(/^\/api\/scene\/([^/]+)\/revision$/);
    if (revisionMatch && req.method === "POST") {
      const sceneId = decodeURIComponent(revisionMatch[1]);
      const body = await readBody(req);
      const previous = store.getScene(sceneId);
      const updated = store.upsertScene({
        sceneId,
        name: previous?.name,
        alias: previous?.alias,
        payload: previous?.payload || makeDefaultSceneData(),
        metadata: body.metadata || {},
        sceneFields: body.metadata || {},
      });
      res.writeHead(200, jsonHeaders);
      res.end(JSON.stringify(sceneResponse(updated, origin)));
      return;
    }

    const payloadMatch = pathname.match(
      /^\/api\/local-backend\/scene\/([^/]+)\/payload$/,
    );
    if (payloadMatch && req.method === "GET") {
      const sceneId = decodeURIComponent(payloadMatch[1]);
      const scene = store.getScene(sceneId);
      if (!scene) {
        res.writeHead(404, jsonHeaders);
        res.end(JSON.stringify({ error: "Scene not found" }));
        return;
      }
      res.writeHead(200, jsonHeaders);
      res.end(JSON.stringify(scene.payload));
      return;
    }

    if (pathname === "/api/local-backend/scene" && req.method === "POST") {
      const body = await readBody(req);
      const scene = store.upsertScene({
        name: body.params?.name,
        alias: body.params?.alias,
        payload: body.data,
        metadata: body.params || {},
        sceneFields: body.params || {},
      });
      res.writeHead(200, jsonHeaders);
      res.end(JSON.stringify({ id: scene.id, alias: scene.alias }));
      return;
    }

    const localRevisionMatch = pathname.match(
      /^\/api\/local-backend\/scene\/([^/]+)\/revision$/,
    );
    if (localRevisionMatch && req.method === "POST") {
      const sceneId = decodeURIComponent(localRevisionMatch[1]);
      const body = await readBody(req);
      const previous = store.getScene(sceneId);
      if (!previous) {
        res.writeHead(404, jsonHeaders);
        res.end(JSON.stringify({ error: "Scene not found" }));
        return;
      }
      const scene = store.upsertScene({
        sceneId,
        name: previous.name,
        alias: previous.alias,
        payload: body.data,
        metadata: body.metadata || getMetadata(previous),
        sceneFields: body.metadata || previous.sceneFields,
      });
      res.writeHead(200, jsonHeaders);
      res.end(JSON.stringify({ id: scene.id, alias: scene.alias }));
      return;
    }

    if (pathname === "/api/Scene/Get" && req.method === "GET") {
      const sceneId = searchParams.get("ID") ?? "";
      const scene = store.getScene(sceneId);
      if (!scene) {
        res.writeHead(200, jsonHeaders);
        res.end(JSON.stringify({ Code: 404, Msg: "Scene not found" }));
        return;
      }
      res.writeHead(200, jsonHeaders);
      res.end(
        JSON.stringify({
          Code: 200,
          Data: {
            ID: scene.id,
            Name: scene.name,
            Alias: scene.alias,
            Description: scene.sceneFields.description || "",
            IsPublished: true,
            IsPublic: true,
            IsSandbox: !!scene.sceneFields.isSandbox,
            IsCollaborative: !!scene.sceneFields.isCollaborative,
            UserID: "local-user",
          },
        }),
      );
      return;
    }

    if (pathname === "/api/Server/Scene/Load" && req.method === "GET") {
      const sceneId = searchParams.get("ID") || "";
      const scene = store.getScene(sceneId);
      if (!scene) {
        res.writeHead(200, jsonHeaders);
        res.end(JSON.stringify({ Code: 404, Msg: "Scene not found" }));
        return;
      }
      res.writeHead(200, jsonHeaders);
      res.end(
        JSON.stringify({
          Code: 200,
          Data: scene.payload,
          Metadata: {
            Dependencies: scene.sceneFields.dependencies || {},
            LogicalIDToAssetID: scene.sceneFields.logicalIdToAssetId || {},
          },
        }),
      );
      return;
    }

    if (pathname === "/api/Scene/List" && req.method === "GET") {
      const list = store.listScenes().map((scene) => ({
        ID: scene.id,
        Name: scene.name,
        Alias: scene.alias,
        Thumbnail: scene.sceneFields.thumbnail || "",
        IsPublished: true,
        IsPublic: true,
        UpdatedAt: scene.updatedAt,
      }));
      res.writeHead(200, jsonHeaders);
      res.end(JSON.stringify({ Code: 200, Data: list }));
      return;
    }

    notFound(res);
  });

  return {
    listen() {
      return new Promise((resolve) => {
        server.listen(port, host, () => resolve({ host, port }));
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
};
