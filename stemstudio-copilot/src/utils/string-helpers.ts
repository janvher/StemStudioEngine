/**
 * Deletes all characters in a string after the last '}'
 * Useful for cleaning up JSON strings with trailing data
 *
 * @param str - The input string
 * @returns The string truncated after the last '}'
 *
 * @example
 * trimAfterLastBrace('{"foo":"bar"}extra') // returns '{"foo":"bar"}'
 * trimAfterLastBrace('{"a":1}') // returns '{"a":1}'
 * trimAfterLastBrace('no braces') // returns ''
 */
export function trimAfterLastBrace(str: string): string {
  const lastBraceIndex = str.lastIndexOf('}');

  if (lastBraceIndex === -1) {
    return '';
  }

  return str.substring(0, lastBraceIndex + 1);
}
