// Stub written by scripts/export-oss.ts so OSS builds can resolve the
// lazy import in EditorComponent.tsx and MyAvatarsView.tsx. The import is
// gated on !IS_OSS at runtime and tree-shaken in OSS builds, but TS/Vite
// still need to resolve the path at compile time.
export const AvatarCreator = () => null;
export default AvatarCreator;
