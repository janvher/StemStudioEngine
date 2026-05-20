/**
 * Invite Code Generator Utility
 *
 * Generates user-friendly invitation codes for private rooms. Codes are designed
 * to be easy to share verbally or in text while avoiding commonly confused characters.
 *
 * Features:
 * - Excludes ambiguous characters (0, O, 1, I, l) for clarity
 * - Collision detection with automatic retry logic
 * - Configurable code length with sensible defaults
 * - Batch generation for bulk operations
 * - Statistical analysis for collision probability estimation
 */
export class InviteCodeGenerator {
    private static readonly VALID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    private static readonly CODE_LENGTH = 6;
    private static readonly MAX_RETRIES = 10;

    /**
     * Generate a unique invite code
     * @param length Optional length of the code (default: 6)
     * @returns A random invite code string
     */
    static generate(length: number = InviteCodeGenerator.CODE_LENGTH): string {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += InviteCodeGenerator.VALID_CHARS.charAt(
                Math.floor(Math.random() * InviteCodeGenerator.VALID_CHARS.length)
            );
        }
        return result;
    }

    /**
     * Generate a unique invite code with collision checking
     * @param checkUniqueness Async function to check if code already exists
     * @param length Optional length of the code
     * @returns A unique invite code string
     */
    static async generateUnique(
        checkUniqueness: (code: string) => Promise<boolean>,
        length: number = InviteCodeGenerator.CODE_LENGTH
    ): Promise<string> {
        let retries = 0;

        while (retries < InviteCodeGenerator.MAX_RETRIES) {
            const code = InviteCodeGenerator.generate(length);
            const isUnique = await checkUniqueness(code);

            if (isUnique) {
                return code;
            }

            retries++;
        }

        throw new Error('Failed to generate unique invite code after maximum retries');
    }

    /**
     * Validate an invite code format
     * @param code The code to validate
     * @param length Expected length (default: 6)
     * @returns True if the code is valid
     */
    static validate(code: string, length: number = InviteCodeGenerator.CODE_LENGTH): boolean {
        if (!code || typeof code !== 'string') {
            return false;
        }

        // Check length
        if (code.length !== length) {
            return false;
        }

        // Check if all characters are valid
        const upperCode = code.toUpperCase();
        for (let i = 0; i < upperCode.length; i++) {
            if (InviteCodeGenerator.VALID_CHARS.indexOf(upperCode[i]) === -1) {
                return false;
            }
        }

        return true;
    }

    /**
     * Normalize an invite code (convert to uppercase, trim whitespace)
     * @param code The code to normalize
     * @returns Normalized code or null if invalid
     */
    public static normalize(code: string): string | null {
        if (!code || typeof code !== 'string') {
            return null;
        }

        const normalizedCode = code.trim().toUpperCase();
        return InviteCodeGenerator.validate(normalizedCode) ? normalizedCode : null;
    }

    /**
     * Generate a batch of unique codes
     * @param count Number of codes to generate
     * @param checkUniqueness Function to check uniqueness
     * @param length Code length
     * @returns Array of unique codes
     */
    static async generateBatch(
        count: number,
        checkUniqueness: (codes: string[]) => Promise<string[]>,
        length: number = InviteCodeGenerator.CODE_LENGTH
    ): Promise<string[]> {
        if (count <= 0) {
            return [];
        }

        const codes: string[] = [];
        const batchSize = Math.min(count * 2, 100); // Generate extra codes to account for collisions

        // Generate initial batch
        const candidateCodes = Array.from({ length: batchSize }, () =>
            InviteCodeGenerator.generate(length)
        );

        // Remove duplicates within the batch
        const uniqueCandidates = Array.from(new Set(candidateCodes));

        // Check which codes are already in use
        const availableCodes = await checkUniqueness(uniqueCandidates);

        // Take the required number of codes
        codes.push(...availableCodes.slice(0, count));

        // If we don't have enough codes, generate more recursively
        if (codes.length < count) {
            const remaining = count - codes.length;
            const additionalCodes = await InviteCodeGenerator.generateBatch(
                remaining,
                checkUniqueness,
                length
            );
            codes.push(...additionalCodes);
        }

        return codes.slice(0, count);
    }

    /**
     * Get the character set used for code generation
     * @returns String containing all valid characters
     */
    static getValidCharacters(): string {
        return InviteCodeGenerator.VALID_CHARS;
    }

    /**
     * Get the default code length
     * @returns Default code length
     */
    static getDefaultLength(): number {
        return InviteCodeGenerator.CODE_LENGTH;
    }

    /**
     * Estimate the number of possible codes for a given length
     * @param length Code length
     * @returns Number of possible combinations
     */
    static getPossibleCombinations(length: number = InviteCodeGenerator.CODE_LENGTH): number {
        return Math.pow(InviteCodeGenerator.VALID_CHARS.length, length);
    }

    /**
     * Calculate collision probability for a given number of codes
     * @param codeCount Number of existing codes
     * @param length Code length
     * @returns Collision probability as a decimal (0-1)
     */
    static getCollisionProbability(
        codeCount: number,
        length: number = InviteCodeGenerator.CODE_LENGTH
    ): number {
        const totalPossible = InviteCodeGenerator.getPossibleCombinations(length);

        if (codeCount >= totalPossible) {
            return 1;
        }

        // Using birthday paradox approximation: 1 - e^(-n²/2N)
        // where n is number of codes, N is total possible combinations
        const exponent = -(codeCount * codeCount) / (2 * totalPossible);
        return 1 - Math.exp(exponent);
    }
}