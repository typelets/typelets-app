/**
 * Base Cryptographic Utilities
 * Conversion and encoding helpers
 */

export function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}
