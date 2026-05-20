/**
 * ESLint Configuration for TypeScript Projects
 *
 * This configuration enforces code quality standards, TypeScript best practices,
 * and cross-platform compatibility by ensuring relative import paths.
 */

// Core ESLint functionality
import eslint from '@eslint/js';
// TypeScript-specific ESLint rules and parser
import * as tseslint from 'typescript-eslint';
// Global variables definitions for different environments
import globals from 'globals';
// Plugin for import/export statement validation
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
    {
        // Target all TypeScript files in the project
        files: ['**/*.ts'],

        // Extend recommended configurations
        extends: [
            eslint.configs.recommended,        // Base ESLint recommended rules
            ...tseslint.configs.recommended,   // TypeScript-specific recommended rules
        ],

        // Register plugins for additional rule sets
        plugins: {
            import: importPlugin, // Enables import/export validation rules
        },

        // Exclude directories from linting
        ignores: [
            'node_modules/**', // Third-party dependencies
            'build/**',         // Compiled output directory
            'src/assets/**'
        ],

        // Language and parser configuration
        languageOptions: {
            parser: tseslint.parser, // Use TypeScript parser for .ts files
            parserOptions: {
                project: './tsconfig.json',           // TypeScript project configuration
                tsconfigRootDir: import.meta.dirname, // Root directory for tsconfig resolution
            },
            globals: {
                ...globals.node,    // Node.js global variables (process, __dirname, etc.)
                ...globals.console, // Console API globals
                NodeJS: true,       // NodeJS namespace types
            },
        },

        // Linting rules configuration
        rules: {
            // === CODE QUALITY RULES ===

            // Enforce strict equality to prevent type coercion bugs
            // ✅ value === null  ❌ value == null
            'eqeqeq': 'error',

            // Warn about trailing commas for consistency
            // ⚠️ { a: 1, b: 2, } should be { a: 1, b: 2 }
            'comma-dangle': 'warn',

            // === DEBUGGING RULES ===

            // Allow console statements (useful for Node.js applications)
            // ✅ console.log('debug info') is permitted
            'no-console': 'off',

            // Allow debugger statements during development
            // ✅ debugger; is permitted (remove before production)
            'no-debugger': 'off',

            // === SYNTAX AND FORMATTING RULES ===

            // Warn about unnecessary semicolons
            // ⚠️ const x = 1;; has extra semicolon
            'no-extra-semi': 'off',

            // Warn about unnecessary parentheses
            // ⚠️ if ((condition)) should be if (condition)
            'no-extra-parens': 'warn',

            // Warn about irregular whitespace characters
            // ⚠️ Non-breaking spaces and other invisible characters
            'no-irregular-whitespace': 'warn',

            // Warn about undefined variables
            // ⚠️ Using variables that haven't been declared
            'no-undef': 'warn',

            // Enforce semicolon usage
            // ⚠️ const x = 1 should be const x = 1;
            'semi': ['warn', 'always', { 'omitLastInOneLineBlock': true }],

            // Enforce consistent spacing around semicolons
            // ⚠️ const x = 1 ; should be const x = 1;
            'semi-spacing': 'warn',

            // === TYPESCRIPT RULES ===

            // Allow explicit 'any' type usage
            // ✅ function process(data: any) is permitted
            '@typescript-eslint/no-explicit-any': 'off',

            // Allow unused variables if they start with underscore
            // ✅ function process(_unused: string) is permitted
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    'argsIgnorePattern': '^_',
                    'varsIgnorePattern': '^_'
                }
            ],

            // === IMPORT/EXPORT RULES FOR CROSS-PLATFORM COMPATIBILITY ===

            // Additional safety rules
            'import/no-absolute-path': 'error',
            'import/no-useless-path-segments': 'error',
        },
    },
);
