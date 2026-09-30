/**
 * Socket.IO Event Constants for UNO Arena
 * Standardized across all 7 phases
 */

export const SOCKET_EVENTS = Object.freeze({
  // Built-in Connection Events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  CONNECTION_ACK: 'connection:ack',

  // Room Lifecycle Events (Phase 2)
  CREATE_ROOM: 'createRoom',
  ROOM_CREATED: 'roomCreated',
  JOIN_ROOM: 'joinRoom',
  ROOM_JOINED: 'roomJoined',
  LEAVE_ROOM: 'leaveRoom',
  SET_READY: 'setReady',
  PLAYER_JOINED: 'playerJoined',
  PLAYER_LEFT: 'playerLeft',
  PLAYER_READY: 'playerReady',
  ROOM_STATE: 'roomState',
  HOST_CHANGED: 'hostChanged',

  // Game Flow Events (Phase 3 & 4)
  START_GAME: 'startGame',
  GAME_STARTED: 'gameStarted',
  GAME_STATE: 'gameState',
  PLAY_CARD: 'playCard',
  CARD_PLAYED: 'cardPlayed',
  DRAW_CARD: 'drawCard',
  CARD_DRAWN: 'cardDrawn',
  CALL_UNO: 'callUno',
  UNO_CALLED: 'unoCalled',
  UNO_PENALTY: 'unoPenalty',
  ROUND_ENDED: 'roundEnded',
  SCORE_UPDATED: 'scoreUpdated',
  WINNER_ANNOUNCEMENT: 'winnerAnnouncement',
  REMATCH_REQUEST: 'rematchRequest',
  REMATCH_READY: 'rematchReady',
  REMATCH_STARTED: 'rematchStarted',
  RETURN_TO_LOBBY: 'returnToLobby',

  // Chat, Emote & Timer Events (Phase 5)
  SEND_CHAT_MESSAGE: 'sendChatMessage',
  CHAT_MESSAGE: 'chatMessage',
  CHAT_HISTORY: 'chatHistory',
  SEND_EMOTE: 'sendEmote',
  PLAYER_EMOTE: 'playerEmote',
  TURN_TIMER_TICK: 'turnTimerTick',
  TURN_TIMER_EXPIRED: 'turnTimerExpired',

  // Reconnection & Sync Events (Phase 4 & 5)
  RECONNECT_PLAYER: 'reconnectPlayer',
  PLAYER_RECONNECTED: 'playerReconnected',
  REQUEST_ROOM_STATE: 'requestRoomState',
  ROOM_STATE_SYNC: 'roomStateSync',

  // System & Diagnostics
  ERROR: 'system:error',
  PING: 'system:ping',
  PONG: 'system:pong',
});
