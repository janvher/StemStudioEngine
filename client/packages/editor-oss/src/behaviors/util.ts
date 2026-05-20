/**
 * Indicates whether the behavior is a legacy behavior.
 * 
 * @remarks
 * Legacy behaviors are those created before the introduction of the new asset
 * management system. All new behaviors have an ID that is a MongoDB ObjectID,
 * which is a 24 character hex string.
 * 
 * Legacy behaviors have human-readable IDs such as "user.behavior".
 * 
 * @param id - The ID of the behavior
 * @returns true if the behavior is a legacy behavior, false otherwise.
 */
export const isLegacyBehaviorId = (id: string) => !/^[a-fA-F0-9]{24}$/.test(id);
