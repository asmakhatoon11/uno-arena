/**
 * Frontend Utility Helpers
 */

/**
 * Formats a room code to uppercase alphanumeric
 * @param {string} code 
 * @returns {string}
 */
export function formatRoomCode(code) {
  if (!code) return '';
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

/**
 * Returns color style token for a given card color
 * @param {string} color 
 * @returns {string}
 */
export function getCardColorVariable(color) {
  switch (color?.toLowerCase()) {
    case 'red':
      return 'var(--uno-red)';
    case 'blue':
      return 'var(--uno-blue)';
    case 'green':
      return 'var(--uno-green)';
    case 'yellow':
      return 'var(--uno-yellow)';
    default:
      return 'var(--color-primary)';
  }
}
