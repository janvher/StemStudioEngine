import { expect } from "chai";
import { InviteCodeGenerator } from "../src/utils/InviteCodeGenerator.js";

describe("InviteCodeGenerator", () => {
    describe("generate", () => {
        it("should generate a code of default length (6)", () => {
            const code = InviteCodeGenerator.generate();
            expect(code).to.have.length(6);
        });

        it("should generate a code of specified length", () => {
            const code = InviteCodeGenerator.generate(8);
            expect(code).to.have.length(8);
        });

        it("should only contain valid characters", () => {
            const code = InviteCodeGenerator.generate(10);
            const validChars = InviteCodeGenerator.getValidCharacters();

            for (const char of code) {
                expect(validChars).to.include(char);
            }
        });

        it("should generate different codes on multiple calls", () => {
            const codes = new Set();
            for (let i = 0; i < 100; i++) {
                codes.add(InviteCodeGenerator.generate());
            }
            // With 6 characters and 32 possible characters, we should get unique codes
            expect(codes.size).to.be.greaterThan(95);
        });
    });

    describe("validate", () => {
        it("should validate correctly formatted codes", () => {
            const validCodes = ["ABC234", "XYZ789", "DEFG23", "HJKL89"];

            for (const code of validCodes) {
                expect(InviteCodeGenerator.validate(code), `Code ${code} should be valid`).to.be.true;
            }
        });

        it("should reject codes with invalid characters", () => {
            const invalidCodes = ["ABC12O", "XYZ7I9", "HELLO1", "WORLD0"];

            for (const code of invalidCodes) {
                expect(InviteCodeGenerator.validate(code)).to.be.false;
            }
        });

        it("should reject codes with wrong length", () => {
            expect(InviteCodeGenerator.validate("ABC12")).to.be.false;
            expect(InviteCodeGenerator.validate("ABC1234")).to.be.false;
            expect(InviteCodeGenerator.validate("")).to.be.false;
        });

        it("should reject null or undefined codes", () => {
            expect(InviteCodeGenerator.validate(null as any)).to.be.false;
            expect(InviteCodeGenerator.validate(undefined as any)).to.be.false;
        });

        it("should validate custom length codes", () => {
            expect(InviteCodeGenerator.validate("ABC", 3)).to.be.true;
            expect(InviteCodeGenerator.validate("ABCDEFGH", 8)).to.be.true;
            expect(InviteCodeGenerator.validate("ABC", 6)).to.be.false;
        });
    });

    describe("normalize", () => {
        it("should convert lowercase to uppercase", () => {
            expect(InviteCodeGenerator.normalize("abc234")).to.equal("ABC234");
        });

        it("should trim whitespace", () => {
            expect(InviteCodeGenerator.normalize("  ABC234  ")).to.equal("ABC234");
        });

        it("should return null for invalid codes", () => {
            expect(InviteCodeGenerator.normalize("ABC12O")).to.be.null;
            expect(InviteCodeGenerator.normalize("ABC")).to.be.null;
            expect(InviteCodeGenerator.normalize("")).to.be.null;
        });

        it("should handle mixed case and spacing", () => {
            expect(InviteCodeGenerator.normalize(" aBc234 ")).to.equal("ABC234");
        });
    });

    describe("generateUnique", () => {
        it("should generate unique codes with collision checking", async () => {
            const existingCodes = new Set(["ABC123", "XYZ789"]);

            const checkUniqueness = async (code: string) => !existingCodes.has(code);

            const code = await InviteCodeGenerator.generateUnique(checkUniqueness);
            expect(code).to.have.length(6);
            expect(existingCodes.has(code)).to.be.false;
        });

        it("should retry when collisions occur", async () => {
            const existingCodes = new Set<string>();
            let attempts = 0;

            const checkUniqueness = async (code: string) => {
                attempts++;
                if (attempts <= 3) {
                    existingCodes.add(code); // Simulate collision for first few attempts
                    return false;
                }
                return true;
            };

            const code = await InviteCodeGenerator.generateUnique(checkUniqueness);
            expect(code).to.have.length(6);
            expect(attempts).to.be.greaterThan(3);
        });

        it("should throw error after max retries", async () => {
            const checkUniqueness = async (code: string) => false; // Always collision

            try {
                await InviteCodeGenerator.generateUnique(checkUniqueness);
                expect.fail("Should have thrown an error");
            } catch (error: any) {
                expect(error.message).to.include("Failed to generate unique invite code");
            }
        });
    });

    describe("generateBatch", () => {
        it("should generate multiple unique codes", async () => {
            const existingCodes = new Set<string>();

            const checkUniqueness = async (codes: string[]) => {
                return codes.filter(code => !existingCodes.has(code));
            };

            const codes = await InviteCodeGenerator.generateBatch(5, checkUniqueness);
            expect(codes).to.have.length(5);

            // All codes should be unique
            const uniqueCodes = new Set(codes);
            expect(uniqueCodes.size).to.equal(5);
        });

        it("should handle batch with some collisions", async () => {
            const existingCodes = new Set(["ABC123", "XYZ789"]);

            const checkUniqueness = async (codes: string[]) => {
                return codes.filter(code => !existingCodes.has(code));
            };

            const codes = await InviteCodeGenerator.generateBatch(3, checkUniqueness);
            expect(codes).to.have.length(3);

            for (const code of codes) {
                expect(existingCodes.has(code)).to.be.false;
            }
        });
    });

    describe("utility methods", () => {
        it("should return valid characters", () => {
            const chars = InviteCodeGenerator.getValidCharacters();
            expect(chars).to.be.a("string");
            expect(chars).to.have.length.greaterThan(0);
            expect(chars).to.not.include("0");
            expect(chars).to.not.include("O");
            expect(chars).to.not.include("1");
            expect(chars).to.not.include("I");
            expect(chars).to.not.include("l");
        });

        it("should return default length", () => {
            expect(InviteCodeGenerator.getDefaultLength()).to.equal(6);
        });

        it("should calculate possible combinations", () => {
            const combinations6 = InviteCodeGenerator.getPossibleCombinations(6);
            const combinations8 = InviteCodeGenerator.getPossibleCombinations(8);

            expect(combinations6).to.be.a("number");
            expect(combinations8).to.be.greaterThan(combinations6);
        });

        it("should calculate collision probability", () => {
            const prob1 = InviteCodeGenerator.getCollisionProbability(0);
            const prob2 = InviteCodeGenerator.getCollisionProbability(100);
            const prob3 = InviteCodeGenerator.getCollisionProbability(10000);

            expect(prob1).to.equal(0);
            expect(prob2).to.be.greaterThan(0);
            expect(prob3).to.be.greaterThan(prob2);
            expect(prob3).to.be.lessThan(1);
        });
    });
});