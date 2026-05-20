import { removeDebuggerStatements, countDebuggerStatements, shouldFilterDebuggers } from './DebuggerUtils';

describe('DebuggerUtils', () => {
    describe('removeDebuggerStatements', () => {
        it('should remove standalone debugger statements', () => {
            const code = `function test() {
    console.log('before');
    debugger;
    console.log('after');
}`;
            const result = removeDebuggerStatements(code);
            expect(result).not.toContain('debugger');
            expect(result).toContain('console.log');
        });

        it('should remove debugger statements with semicolons', () => {
            const code = 'debugger;';
            const result = removeDebuggerStatements(code);
            expect(result.trim()).toBe('');
        });

        it('should remove inline debugger statements', () => {
            const code = 'if (condition) debugger; else doSomething();';
            const result = removeDebuggerStatements(code);
            expect(result).toBe('if (condition) ; else doSomething();');
        });

        it('should handle multiple debugger statements', () => {
            const code = `debugger;
function test() {
    debugger;
    const x = 1;
}`;
            const result = removeDebuggerStatements(code);
            expect(result).not.toContain('debugger');
            expect(result).toContain('const x = 1');
        });

        it('should handle basic cases without breaking valid code', () => {
            const code = `
function update() {
    const speed = 5;
    debugger;
    player.move(speed);
}`;
            const result = removeDebuggerStatements(code);
            expect(result).not.toContain('debugger');
            expect(result).toContain('player.move(speed)');
            expect(result).toContain('const speed = 5');
        });

        it('should handle empty code', () => {
            expect(removeDebuggerStatements('')).toBe('');
        });
    });

    describe('countDebuggerStatements', () => {
        it('should count debugger statements correctly', () => {
            const code = `
debugger;
function test() {
    debugger;
    if (true) debugger;
}
            `;
            expect(countDebuggerStatements(code)).toBe(3);
        });

        it('should return 0 for code without debugger statements', () => {
            const code = `
function test() {
    console.log('no statements here');
}
            `;
            expect(countDebuggerStatements(code)).toBe(0);
        });

        it('should handle empty code', () => {
            expect(countDebuggerStatements('')).toBe(0);
        });
    });

    describe('shouldFilterDebuggers', () => {
        it('should return true when productionMode is true', () => {
            expect(shouldFilterDebuggers({ productionMode: true })).toBe(true);
        });

        it('should return false when productionMode is false', () => {
            expect(shouldFilterDebuggers({ productionMode: false })).toBe(false);
        });

        it('should return false when productionMode is undefined', () => {
            expect(shouldFilterDebuggers({ })).toBe(false);
        });

        it('should return false when gameSettings is undefined', () => {
            expect(shouldFilterDebuggers()).toBe(false);
        });

        it('should return false when gameSettings is null', () => {
            expect(shouldFilterDebuggers(null as any)).toBe(false);
        });
    });
});