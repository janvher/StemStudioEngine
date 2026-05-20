import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import raw from "vite-raw-plugin";
import * as dotEnv from "dotenv";
import * as fs from "node:fs";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import { imagetools } from "vite-imagetools";
import viteCompression from "vite-plugin-compression";
import { resolve } from "path";
import * as path from "node:path";
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import type {Plugin, UserConfig} from "vite";

const CESIUM_PUBLIC_PATH = "/cesium";
const CESIUM_BUILD_DIR = resolve(__dirname, "node_modules/cesium/Build/Cesium");
const CESIUM_OUTPUT_DIR = resolve(__dirname, "build/public/cesium");
const WEB_BUILD_PUBLIC_DIR = resolve(__dirname, "build/public");
const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".glb": "model/gltf-binary",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".xml": "application/xml; charset=utf-8",
};

function glsl() {
  return {
    name: "glsl",
    transform(src, id) {
      if (/\.glsl$/.test(id) === false) return;

      const transformedCode =
        "export default " +
        JSON.stringify(
          src
            .replace(/[ \t]*\/\/.*\n/g, "") // remove //
            .replace(/[ \t]*\/\*[\s\S]*?\*\//g, "") // remove /* */
            .replace(/\n{2,}/g, "\n"), // # \n+ to \n
        ) +
        ";";
      return {
        code: transformedCode,
        map: null,
      };
    },
  };
}

dotEnv.config({ path: __dirname + "/client/.env" });

const packageJson = JSON.parse(
  fs.readFileSync(resolve(__dirname, "package.json"), "utf8"),
) as { version?: string };

const buildTimestamp = new Date().toISOString();
const appVersion = process.env.REACT_APP_VERSION || packageJson.version || "0.0.0";
const appBuildId =
  process.env.REACT_APP_BUILD_ID ||
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  `${appVersion}-${buildTimestamp}`;

function emitAppVersionManifest() {
  return {
    name: "emit-app-version-manifest",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "app-version.json",
        source: JSON.stringify(
          {
            buildId: appBuildId,
            version: appVersion,
            builtAt: buildTimestamp,
          },
          null,
          2,
        ),
      });
    },
  };
}

function serveCesiumAsset(reqPath: string, res: any, next: () => void) {
  const pathname = decodeURIComponent((reqPath || "/").split("?")[0] || "/");
  const resolvedPath = path.resolve(CESIUM_BUILD_DIR, `.${pathname}`);

  if (!resolvedPath.startsWith(CESIUM_BUILD_DIR)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
    next();
    return;
  }

  const extension = path.extname(resolvedPath);
  const mimeType = MIME_TYPES[extension] || "application/octet-stream";
  res.setHeader("Content-Type", mimeType);
  res.end(fs.readFileSync(resolvedPath));
}

function cesiumAssetsPlugin() {
  return {
    name: "cesium-assets",
    configureServer(server: any) {
      server.middlewares.use(CESIUM_PUBLIC_PATH, (req: any, res: any, next: () => void) => {
        serveCesiumAsset(req.url || "/", res, next);
      });
    },
    writeBundle() {
      fs.rmSync(CESIUM_OUTPUT_DIR, { recursive: true, force: true });
      fs.cpSync(CESIUM_BUILD_DIR, CESIUM_OUTPUT_DIR, { recursive: true });
    },
  };
}

function normalizeHtmlEntrypointsPlugin() {
  return {
    name: "normalize-html-entrypoints",
    writeBundle() {
      const htmlCopies: Array<[string, string]> = [
        // Public landing / docs / playground SPA. Becomes the top-level
        // index.html on the static deploy; static-host rules route
        // `/dashboard`, `/create/project`, `/play` etc. to their own
        // shell HTML files (see client/packages/site/public/_redirects).
        ["packages/site/index.html", "index.html"],
        // App shell (PublicAppContainerLite — dashboard, project list,
        // OSS bootstrap modal). No longer the top-level index in this build.
        ["packages/marketing/index.html", "shell.html"],
        ["packages/editor/editor.html", "editor.html"],
        ["packages/play/play.html", "play.html"],
      ];

      for (const [sourceRelativePath, targetRelativePath] of htmlCopies) {
        const sourcePath = resolve(WEB_BUILD_PUBLIC_DIR, sourceRelativePath);
        const targetPath = resolve(WEB_BUILD_PUBLIC_DIR, targetRelativePath);
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, targetPath);
        }
      }
    },
  };
}

function nodePolyfillsWithoutDeprecatedEsbuild(): Plugin {
  const plugin = nodePolyfills() as Plugin;
  const originalConfig = plugin.config;

  if (!originalConfig) return plugin;

  plugin.config = async function patchedConfig(config, env) {
    const resolved = await originalConfig.call(this, config, env);
    if (!resolved || typeof resolved !== "object") return resolved;

    // Vite 8 deprecates `esbuild` in plugin config in favor of `oxc`.
    // Keep node polyfill aliases/injection behavior, but drop the deprecated key
    // to avoid noisy startup warnings until upstream migrates.
    const {esbuild, ...rest} = resolved as UserConfig & {esbuild?: unknown};
    void esbuild;
    return rest;
  };

  return plugin;
}

export default async ({ mode }) => {
  const isProduction = mode === "production";
  const isOssBuild =
    process.env.BUILD_MODE === "oss" || process.env.VITE_BUILD_MODE === "oss";

  const visualizerPlugin = isProduction
    ? (await import("rollup-plugin-visualizer")).visualizer({
        filename: "build/bundle-analysis.html",
        open: false,
        gzipSize: true,
        brotliSize: true,
      })
    : null;
  const compressionPlugins = isProduction
    ? [
        viteCompression({
          algorithm: "brotliCompress",
          ext: ".br",
        }),
        viteCompression({
          algorithm: "gzip",
          ext: ".gz",
        }),
      ]
    : [];

  return defineConfig({
    root: "client",
    envPrefix: ["REACT_APP_", "REACT_ENGINE_", "NODE_ENV", "CORS_", "OLD_BUILD_SYSTEM", "USE_WORKER_PHYSICS", "PRODUCTION_BUILD"],
    assetsInclude: ["assets/**", "**/*.glb"],
    build: {
      target: "esnext",
      chunkSizeWarningLimit: 16000,
      commonjsOptions: {
        exclude: ["assets/**"],
      },
      rolldownOptions: {
        onwarn(warning, defaultHandler) {
          // three-mesh-bvh: PURE annotation in a position Rollup can't interpret (node_modules, can't fix)
          if (warning.code === "INVALID_ANNOTATION" && warning.id?.includes("three-mesh-bvh")) return;
          // LoaderSupport.js: legacy code uses eval for worker support (can't remove without rewrite)
          if (warning.code === "EVAL" && warning.id?.includes("LoaderSupport.js")) return;
          // ammo.wasm.js ships a UMD/CommonJS compatibility tail in an ESM file.
          // This warning is expected for this vendored third-party asset.
          if (warning.code === "COMMONJS_VARIABLE_IN_ESM" && warning.id?.includes("client/assets/js/ammo/ammo.wasm.js")) return;
          // import.meta.glob modules that are also statically imported elsewhere (by design)
          if (warning.code === "PLUGIN_WARNING" && warning.message?.includes("dynamic import will not move module into another chunk")) return;
          defaultHandler(warning);
        },
        input: {
          // Public marketing/docs/playground SPA (buildwithstem.com).
          main: resolve(__dirname, "client/packages/site/index.html"),
          // App shell — dashboard, project list. Reachable at /dashboard.
          shell: resolve(__dirname, "client/packages/marketing/index.html"),
          editor: resolve(__dirname, "client/packages/editor/editor.html"),
          play: resolve(__dirname, "client/packages/play/play.html"),
        },
        output: {
          codeSplitting: {
            groups: [
              {
                name: "vendor",
                test: /\/node_modules\/(react|react-dom)\//,
              },
            ],
          },
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
      sourcemap: process.env.PRODUCTION_BUILD !== "true",
      outDir: "../build/public", // This is the default output directory for Create React AppContainer
    },
    optimizeDeps: {
      exclude: ["@stemstudio/validators", "cesium", "threejs-gif-texture"],
    },
    server: {
      allowedHosts: true,
      port: parseInt(process.env.REACT_APP_PORT || "5173"),
      open: true, // Automatically open the app in the browser on server start
      proxy: {
        "/api": {
          // Fall back to the OSS ai-server's default port so the dev proxy
          // works without requiring the user to first run `cp .env.example .env`.
          // In integrated mode REACT_APP_SERVER_HOST is set to the storage
          // server, so this fallback only kicks in for fresh OSS exports.
          target: process.env.REACT_APP_SERVER_HOST || "http://localhost:8081",
          ws: true,
          secure: process.env.REACT_APP_SECURE_WEB_SOCKET === "true",
          changeOrigin: true,
        },
        "/Upload": {
          target: process.env.REACT_APP_SERVER_HOST,
          changeOrigin: true,
        },
        "/uploads": {
          target: process.env.REACT_APP_SERVER_HOST,
          changeOrigin: true,
        },
        // Local proxy for testing Discord-style asset proxying.
        // Simulates the proxy that Discord provides in its sandboxed iframe.
        // Strips auth and internal headers to mimic Discord's reverse proxy.
        // To test using this, you'll need to set the following environment
        // variables:
        //
        // REACT_APP_ASSET_GET_PROXY_BASE=/.proxy/stem-assets
        // REACT_APP_ASSET_PUT_PROXY_BASE=/.proxy/stem-uploads
        "/.proxy/stem-assets": {
          target: "http://minio:9000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/.proxy\/stem-assets/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.removeHeader("authorization");
              proxyReq.removeHeader("x-asset-get-proxy-base");
              proxyReq.removeHeader("x-asset-put-proxy-base");
              proxyReq.removeHeader("x-scene-id");
            });
          },
        },
        "/.proxy/stem-uploads": {
          target: "http://minio:9000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/.proxy\/stem-uploads/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.removeHeader("authorization");
              proxyReq.removeHeader("x-asset-get-proxy-base");
              proxyReq.removeHeader("x-asset-put-proxy-base");
              proxyReq.removeHeader("x-scene-id");
            });
          },
        },
      },
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },
    },
    resolve: {
      alias: [
        // OSS-only: redirect Firebase SDK imports to local stubs so Vite
        // tree-shakes the SDK out of OSS bundles. Editor-oss code paths
        // that reach Firebase are already runtime-gated by IS_OSS and by
        // AuthorizationContext short-circuits, so the stubs never execute
        // in practice. MUST be listed first so it wins over node_modules
        // resolution. Skipped entirely in integrated builds.
        ...(isOssBuild
          ? [
              {
                find: /^firebase\/app$/,
                replacement: path.resolve(__dirname, "./client/oss-stubs/firebase-app.ts"),
              },
              {
                find: /^firebase\/auth$/,
                replacement: path.resolve(__dirname, "./client/oss-stubs/firebase-auth.ts"),
              },
              {
                find: /^firebase\/firestore$/,
                replacement: path.resolve(__dirname, "./client/oss-stubs/firebase-firestore.ts"),
              },
              {
                find: /^firebase\/analytics$/,
                replacement: path.resolve(__dirname, "./client/oss-stubs/firebase-analytics.ts"),
              },
            ]
          : []),
        // {find: /^three$/, replacement: 'three/webgpu'},
        // Force @three.ez/batched-mesh-extensions to use the prebuilt WebGPU bundle
        {
          find: "@three.ez/batched-mesh-extensions",
          replacement: resolve(
            __dirname,
            "node_modules/@three.ez/batched-mesh-extensions/build/webgpu.js",
          ),
        },
        { find: "ammo", replacement: "/assets/js/ammo/ammo.wasm.js" },
        {
          // MUST come before the bare @web-shared alias so the api/ subpath
          // resolves to the new remote-go adapter location (alias matching is
          // first-match-wins).
          find: /^@web-shared\/api\/(.*)$/,
          replacement: path.resolve(__dirname, "./client/packages/network/src/adapters/remote-go/$1"),
        },
        {
          find: "@web-shared",
          replacement: path.resolve(__dirname, "./client/packages/shared/src"),
        },
        {
          find: "@web-dashboard",
          replacement: path.resolve(__dirname, "./client/packages/dashboard/src"),
        },
        {
          find: /^@stem\/network$/,
          replacement: path.resolve(__dirname, "./client/packages/network/src/index.ts"),
        },
        {
          find: /^@stem\/network\/api\/(.*)$/,
          replacement: path.resolve(__dirname, "./client/packages/network/src/adapters/remote-go/$1"),
        },
        {
          find: /^@stem\/network\/(.*)$/,
          replacement: path.resolve(__dirname, "./client/packages/network/src/$1"),
        },
        {
          // Deprecated: legacy alias kept until consumers migrate to @stem/network.
          find: "@web-backend",
          replacement: path.resolve(__dirname, "./client/packages/network/src"),
        },
        {
          find: /^@stem\/copilot-stemstudio$/,
          replacement: path.resolve(__dirname, "./client/packages/copilot-stemstudio/src/index.ts"),
        },
        {
          find: /^@stem\/copilot-stemstudio\/(.*)$/,
          replacement: path.resolve(__dirname, "./client/packages/copilot-stemstudio/src/$1"),
        },
        // `@stem/auth-firebase` is the Firebase-backed auth provider used by
        // integrated builds. In OSS mode we alias it to a no-op stub so the
        // Firebase Auth SDK is never reached and the editor-oss factory's
        // NullAuthProvider default stays in place.
        {
          find: /^@stem\/auth-firebase$/,
          replacement: isOssBuild
            ? path.resolve(__dirname, "./client/oss-stubs/auth-firebase.ts")
            : path.resolve(__dirname, "./client/packages/auth-firebase/src/index.ts"),
        },
        {
          find: /^@stem\/auth-firebase\/(.*)$/,
          replacement: isOssBuild
            ? path.resolve(__dirname, "./client/oss-stubs/auth-firebase.ts")
            : path.resolve(__dirname, "./client/packages/auth-firebase/src/$1"),
        },
        {
          find: /^@stem\/editor-oss$/,
          replacement: path.resolve(__dirname, "./client/packages/editor-oss/src/index.ts"),
        },
        {
          find: /^@stem\/editor-oss\/(.*)$/,
          replacement: path.resolve(__dirname, "./client/packages/editor-oss/src/$1"),
        },
        {
          find: /^@stem\/copilot$/,
          replacement: path.resolve(__dirname, "./client/packages/copilot/src/index.ts"),
        },
        {
          find: /^@stem\/copilot\/(.*)$/,
          replacement: path.resolve(__dirname, "./client/packages/copilot/src/$1"),
        },
        {
          find: "autolod",
          replacement: path.resolve(
            __dirname,
            "./client/packages/shared/src/package/autolod/packages/core/src",
          ),
        },
        {
          find: "@stemstudio/validators",
          replacement: isOssBuild
            ? resolve(__dirname, "client/oss-stubs/validators.js")
            : resolve(__dirname, "stemstudio-importer/tools/lib/validate-code.js"),
        },
      ],
    },
    test: {
      globals: true, // For describe, it, expect, etc.
      environment: "jsdom", // Simulate browser environment
      setupFiles: "./test/setupTests.ts",
      include: ["packages/**/*.test.{ts,tsx}"], // Explicitly include only our test files (relative to root: "client")
      exclude: [
        "**/node_modules/**", // Exclude all node_modules (including nested ones)
        "**/dist/**",
        "**/build/**",
      ],
      pool: "forks", // Use forked processes to prevent memory leaks
      isolate: true, // Isolate each test file in separate environment
      alias: [
        // Force ESM source builds to avoid circular CJS self-require in UMD bundles.
        // three-mesh-bvh's UMD does require('three-mesh-bvh') causing BVH to be undefined.
        {
          find: "three-mesh-bvh",
          replacement: resolve(__dirname, "node_modules/three-mesh-bvh/src/index.js"),
        },
        {
          find: "three-bvh-csg",
          replacement: resolve(__dirname, "node_modules/three-bvh-csg/src/index.js"),
        },
      ],
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_BUILD_ID__: JSON.stringify(appBuildId),
      __APP_BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
      __BUILD_MODE__: JSON.stringify(
        process.env.BUILD_MODE === "oss" || process.env.VITE_BUILD_MODE === "oss"
          ? "oss"
          : "integrated",
      ),
      "process.browser": "true",
      "process.env": (() => {
        // Only expose env vars with allowed prefixes to avoid leaking system vars (PATH, HOME, secrets, etc.)
        const allowedPrefixes = ["REACT_APP_", "REACT_ENGINE_", "CORS_", "OLD_BUILD_SYSTEM", "USE_WORKER_PHYSICS", "PRODUCTION_BUILD"];
        const allowedExact = ["NODE_ENV", "SHOW_DEV_PROPERTIES", "ACP_SESSION_DIR"];
        const filtered = Object.fromEntries(
          Object.entries(process.env).filter(([key]) =>
            allowedPrefixes.some((prefix) => key.startsWith(prefix)) || allowedExact.includes(key),
          ),
        );
        filtered.REACT_APP_SERVER_HOST =
          mode === "development"
            ? `http://localhost:${process.env.REACT_APP_PORT}`
            : process.env.REACT_APP_SERVER_HOST;
        return filtered;
      })(),
    },
    worker: {
      format: "es",
      plugins: () => [
        // Redirect ktx2-encoder Node entry to browser entry so Vite never
        // encounters the Node.js `import('module')` in basis_encoder.js.
        {
          name: "redirect-ktx2-node-to-web",
          enforce: "pre" as const,
          resolveId(source, importer) {
            if (
              source === "../node/index.js" &&
              importer?.includes("ktx2-encoder")
            ) {
              return this.resolve("../client/index.js", importer);
            }
          },
        },
      ],
      rolldownOptions: {
        output: {
          entryFileNames: "assets/worker-[name]-[hash].js",
        },
      },
    },
    plugins: [
      // Dev-server URL rewrites for the multi-HTML entry layout.
      //
      // Production routes some URL prefixes to dedicated HTML entries via
      // the static server (nginx / vercel / cf-pages):
      //   /play/*                  → packages/play/play.html (creates EngineRuntime in play-mode, mounts Player UI via init())
      //   /create/project/*        → packages/editor/editor.html (creates the full editor EngineRuntime, mounts AppContainer)
      //   /stem-editor/*           → packages/editor/editor.html (same — script-only stem editor view)
      // everything else            → packages/marketing/index.html (PublicAppContainerLite, no engine)
      //
      // Vite dev has no notion of these rewrites — without this plugin every
      // URL falls through to index.html, which mounts PublicAppContainerLite.
      // That works for `/dashboard` and similar marketing-shell routes, but
      // breaks any route whose React subtree expects an EngineRuntime or the
      // AppContainer provider stack (SceneAssetResolutionProvider, etc.).
      // Symptoms observed: hung loader on `/play/<id>` (no engine), and
      // "useAssetResolution must be used inside AssetResolutionProvider" on
      // `/create/project/<id>` (no provider). This middleware mirrors the
      // production routing so dev hits the right HTML entry for each URL
      // family.
      {
        name: "stemstudio-dev-html-routing",
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            const url = req.url ?? "";
            const pathname = url.split("?")[0] ?? "";
            // Accept-header guard so we only rewrite the document fetch,
            // not JS / CSS / asset requests that happen to live under
            // the same prefix (none today, but future-proofing).
            const accepts = (req.headers["accept"] ?? "").toString();
            if (!accepts.includes("text/html")) {
              next();
              return;
            }
            if (pathname.startsWith("/play/")) {
              req.url = "/packages/play/play.html";
            } else if (
                pathname === "/create/project" ||
                pathname.startsWith("/create/project/") ||
                pathname.startsWith("/stem-editor/")
            ) {
                req.url = "/packages/editor/editor.html";
            } else if (
                pathname === "/" ||
                pathname === "/docs" ||
                pathname.startsWith("/docs/") ||
                pathname === "/playground" ||
                pathname.startsWith("/playground/")
            ) {
                // Public site (landing / docs / playground iframe wrapper).
                req.url = "/packages/site/index.html";
            } else {
                // Everything else is an app-shell route (dashboard, login,
                // settings, browse, etc.) and continues to be served by
                // the marketing/PublicAppContainerLite entry.
                req.url = "/packages/marketing/index.html";
            }
            next();
          });
        },
      },
      // Redirect ktx2-encoder Node entry to browser entry so Vite never
      // encounters the Node.js `import('module')` in basis_encoder.js.
      nodePolyfillsWithoutDeprecatedEsbuild(),
      imagetools(),
      glsl(),
      react(),
      raw({
        fileRegex: /.(txt|fs|vs)$/,
      }),
      emitAppVersionManifest(),
      cesiumAssetsPlugin(),
      normalizeHtmlEntrypointsPlugin(),
      ...compressionPlugins,
      // Bundle analyzer (production only)
      visualizerPlugin,
      ViteImageOptimizer({
        test: /\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
        // This GIF exceeds Sharp's pixel limits and fails optimization.
        // Skip it while keeping optimization for other assets.
        exclude: /asset_library.*\.gif$/i,
        include: undefined,
        includePublic: true,
        logStats: true,
        ansiColors: true,
        svg: {
          multipass: true,
          plugins: [
            {
              name: "preset-default",
              params: {
                overrides: {
                  cleanupNumericValues: false,
                  removeViewBox: false,
                },
              },
            },
            "removeViewBox",
            "sortAttrs",
            {
              name: "addAttributesToSVGElement",
              params: {
                attributes: [{ xmlns: "http://www.w3.org/2000/svg" }],
              },
            },
          ],
        },
        png: {
          // https://sharp.pixelplumbing.com/api-output#png
          quality: 90, // More aggressive compression for large PNGs
          compressionLevel: 9, // Maximum compression
        },
        jpeg: {
          // https://sharp.pixelplumbing.com/api-output#jpeg
          quality: 80, // More aggressive for large images
          progressive: true,
        },
        jpg: {
          // https://sharp.pixelplumbing.com/api-output#jpeg
          quality: 80, // More aggressive for large images
          progressive: true,
        },
        tiff: {
          // https://sharp.pixelplumbing.com/api-output#tiff
          quality: 90,
        },
        // gif does not support lossless compression
        // https://sharp.pixelplumbing.com/api-output#gif
        gif: {},
        webp: {
          // https://sharp.pixelplumbing.com/api-output#webp
          lossless: true,
        },
        avif: {
          // https://sharp.pixelplumbing.com/api-output#avif
          lossless: true,
        },
        cache: true,
        // Live inside ./build/ so the cache doesn't clutter the repo root and
        // is gitignored along with the rest of build output.
        cacheLocation: "./build/imageCache",
      }),
    ].filter(Boolean), // Remove falsy plugins
  });
};
