/**
 * Player Session Service
 * 
 * Manages client persistent identity and active game session state across
 * browser reloads, tab restores, and transient network drops.
 * 
 * Keys used in localStorage:
 * - uno_player_id: Unique persistent player ID for this browser
 * - uno_session_token: Cryptographic token verifying browser identity
 * - uno_active_session: Current room session { roomCode, playerName, avatar, savedAt }
 */

const PLAYER_ID_KEY = 'uno_player_id';
const SESSION_TOKEN_KEY = 'uno_session_token';
const ACTIVE_SESSION_KEY = 'uno_active_session';
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours max session persistence

/**
 * Generates a random alphanumeric token
 * @param {string} prefix 
 * @returns {string}
 */
function generateToken(prefix = 'p') {
  const randomPart1 = Math.random().toString(36).substring(2, 10);
  const randomPart2 = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${randomPart1}${randomPart2}_${Date.now()}`;
}

/**
 * Returns or generates the persistent player ID
 * @returns {string}
 */
export function getPlayerId() {
  try {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      id = generateToken('p');
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  } catch (err) {
    console.warn('[PlayerSession] Failed to access localStorage for playerId:', err);
    return generateToken('p_temp');
  }
}

/**
 * Returns or generates the persistent session security token
 * @returns {string}
 */
export function getSessionToken() {
  try {
    let token = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      token = generateToken('t');
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    }
    return token;
  } catch (err) {
    console.warn('[PlayerSession] Failed to access localStorage for sessionToken:', err);
    return generateToken('t_temp');
  }
}

/**
 * Stores active room session
 * @param {{ roomCode: string, playerName?: string, avatar?: string }} sessionData 
 */
export function saveActiveSession({ roomCode, playerName, avatar }) {
  if (!roomCode) return;
  try {
    const session = {
      roomCode: roomCode.toUpperCase().trim(),
      playerName: playerName || localStorage.getItem('uno_player_name') || 'Player',
      avatar: avatar || localStorage.getItem('uno_player_avatar') || '🦁',
      savedAt: Date.now(),
    };
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('[PlayerSession] Failed to save active session:', err);
  }
}

/**
 * Retrieves the currently active room session if not expired
 * @returns {{ roomCode: string, playerName: string, avatar: string, savedAt: number } | null}
 */
export function getActiveSession() {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw);
    if (!session || !session.roomCode) {
      clearActiveSession();
      return null;
    }

    // Check if session exceeded TTL
    if (Date.now() - session.savedAt > SESSION_TTL_MS) {
      clearActiveSession();
      return null;
    }

    return session;
  } catch (err) {
    console.warn('[PlayerSession] Failed to read active session:', err);
    clearActiveSession();
    return null;
  }
}

/**
 * Clears active room session upon deliberate room departure or expiration
 */
export function clearActiveSession() {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (err) {
    console.warn('[PlayerSession] Failed to remove active session:', err);
  }
}
