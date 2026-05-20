// Stub for @stemstudio/validators (provided by stemstudio-importer in
// integrated builds). OSS builds don't ship the importer, so this no-op
// keeps Monaco's behavior editor working without the importer's pattern
// checks. Monaco's built-in TypeScript service still surfaces syntax
// errors.

export function validateCode() {
    return [];
}

export default { validateCode };
