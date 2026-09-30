/**
 * Socket.IO Handler
 * Real-time event handling for UNO Arena (Phases 1 - 5)
 */

import { SOCKET_EVENTS } from '../../../shared/constants/socketEvents.js';
import { logger } from '../utils/logger.js';
import { roomManager } from '../rooms/roomManager.js';
import {
  initializeGame,
  executeCardPlay,
  executePlayerDraw,
  drawCardsFromRoomDeck,
  calculateRoundScore,
} from '../game/index.js';

// Allowed emotes for Phase 5
const ALLOWED_EMOTES = new Set(['😂', '😎', '🔥', '😱', '👏', '😈', '🤯', '💀', '❤️', '👀']);

// Chat rate limiting map: socketId -> Array<timestamps>
export const chatRateLimits = new Map();

/**
 * Checks if a socket is spamming chat
 * Rate limit: max 5 messages per 5 seconds
 */
function isRateLimited(socketId) {
  const now = Date.now();
  const timestamps = chatRateLimits.get(socketId) || [];
  const recentTimestamps = timestamps.filter((t) => now - t < 5000);

  if (recentTimestamps.length >= 5) {
    return true;
  }

  recentTimestamps.push(now);
  chatRateLimits.set(socketId, recentTimestamps);
  return false;
}

/**
 * Broadcasts secure, sanitized room state to all connected players in the room.
 * Each player receives only their own private hand while public state is shared.
 * @param {import('socket.io').Server} io 
 * @param {string} roomCode 
 */
export function broadcastRoomState(io, roomCode) {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;

  for (const player of room.players) {
    const socket = io.sockets.sockets.get(player.id);
    if (socket && player.connected) {
      const sanitized = roomManager.getSanitizedRoomState(roomCode, player.id);
      socket.emit(SOCKET_EVENTS.ROOM_STATE, sanitized);
    }
  }
}

/**
 * Starts or restarts authoritative turn timer for a room.
 * Default 30s. Automatically draws card and advances turn on expiration.
 * @param {import('socket.io').Server} io 
 * @param {Object} room 
 */
export function startTurnTimer(io, room) {
  if (!room) return;

  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }

  // If timer disabled (0 or 'off')
  if (!room.turnDuration || room.turnDuration <= 0) {
    room.turnStartedAt = null;
    room.turnExpiresAt = null;
    return;
  }

  const durationMs = room.turnDuration;
  room.turnStartedAt = Date.now();
  room.turnExpiresAt = Date.now() + durationMs;

  room.turnTimer = setTimeout(() => {
    handleTurnTimeout(io, room.roomCode);
  }, durationMs);
}

/**
 * Authoritative handler for turn timeout
 * Automatically draws a card and passes turn to next player
 * @param {import('socket.io').Server} io 
 * @param {string} roomCode 
 */
export function handleTurnTimeout(io, roomCode) {
  const room = roomManager.getRoom(roomCode);
  if (!room || room.status !== 'playing') return;

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (!currentPlayer) return;

  logger.game(`Turn timed out for ${currentPlayer.name} in room ${roomCode}`);

  // Penalty / auto-draw for timeout
  const drawResult = executePlayerDraw(room, currentPlayer.id);

  room.gameLog.push({
    text: `⏳ ${currentPlayer.name} ran out of time! Auto-drew a card.`,
    type: 'timeout',
    timestamp: Date.now(),
  });

  io.to(roomCode).emit(SOCKET_EVENTS.TURN_TIMER_EXPIRED, {
    playerId: currentPlayer.id,
    playerName: currentPlayer.name,
  });

  broadcastRoomState(io, roomCode);
  startTurnTimer(io, room);
}

export function setupSocketHandlers(io) {
  io.on(SOCKET_EVENTS.CONNECT, (socket) => {
    console.log(`Player connected: ${socket.id}`);
    logger.socket(`Player connected: ${socket.id}`);

    socket.emit(SOCKET_EVENTS.CONNECTION_ACK, {
      status: 'connected',
      socketId: socket.id,
      timestamp: Date.now(),
      message: 'Connected to UNO Arena Server',
    });

    socket.on(SOCKET_EVENTS.PING, () => {
      socket.emit(SOCKET_EVENTS.PONG, { timestamp: Date.now() });
    });

    // ==========================================
    // PHASE 2: ROOM MANAGEMENT & RECONNECTION EVENTS
    // ==========================================

    socket.on(SOCKET_EVENTS.CREATE_ROOM, (payload, callback) => {
      try {
        const { playerName, avatar, playerId, sessionToken, turnDuration } = payload || {};
        const room = roomManager.createRoom(socket.id, playerName, avatar, playerId, sessionToken, turnDuration);

        socket.join(room.roomCode);
        logger.room(`Room ${room.roomCode} created by ${socket.id} (${playerName || 'Host'})`);

        const state = roomManager.getSanitizedRoomState(room.roomCode, socket.id);
        socket.emit(SOCKET_EVENTS.ROOM_CREATED, state);

        const hostPlayer = room.players.find((p) => p.id === socket.id);
        if (typeof callback === 'function') {
          callback({
            success: true,
            roomCode: room.roomCode,
            room: state,
            playerId: hostPlayer?.playerId,
            sessionToken: hostPlayer?.sessionToken,
          });
        }
      } catch (err) {
        logger.error(`Error creating room: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Failed to create room.' });
        }
      }
    });

    socket.on(SOCKET_EVENTS.JOIN_ROOM, (payload, callback) => {
      try {
        const { roomCode, playerName, avatar, playerId, sessionToken } = payload || {};
        if (!roomCode || typeof roomCode !== 'string') {
          const err = 'Please provide a valid room code.';
          socket.emit(SOCKET_EVENTS.ERROR, { message: err });
          if (typeof callback === 'function') callback({ success: false, error: err });
          return;
        }

        const joinResult = roomManager.joinRoom(roomCode, socket.id, playerName, avatar, playerId, sessionToken);
        if (!joinResult.success) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: joinResult.error });
          if (typeof callback === 'function') callback({ success: false, error: joinResult.error });
          return;
        }

        socket.join(joinResult.room.roomCode);

        if (joinResult.reconnected) {
          logger.room(`Player ${socket.id} (${joinResult.player?.name}) reconnected to room ${joinResult.room.roomCode}`);
          io.to(joinResult.room.roomCode).emit(SOCKET_EVENTS.PLAYER_RECONNECTED, {
            playerId: joinResult.player?.playerId,
            playerName: joinResult.player?.name,
          });
        } else {
          logger.room(`Player ${socket.id} (${playerName}) joined room ${joinResult.room.roomCode}`);
          socket.to(joinResult.room.roomCode).emit(SOCKET_EVENTS.PLAYER_JOINED, {
            id: socket.id,
            name: playerName,
            avatar: avatar || '🦊',
          });
        }

        broadcastRoomState(io, joinResult.room.roomCode);

        const playerObj = joinResult.player || joinResult.room.players.find((p) => p.id === socket.id);
        if (typeof callback === 'function') {
          callback({
            success: true,
            roomCode: joinResult.room.roomCode,
            room: roomManager.getSanitizedRoomState(joinResult.room.roomCode, socket.id),
            playerId: playerObj?.playerId,
            sessionToken: playerObj?.sessionToken,
            reconnected: !!joinResult.reconnected,
          });
        }
      } catch (err) {
        logger.error(`Error joining room: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Internal server error joining room.' });
        }
      }
    });

    socket.on(SOCKET_EVENTS.RECONNECT_PLAYER, (payload, callback) => {
      try {
        const { roomCode, playerId, sessionToken } = payload || {};
        if (!roomCode || !playerId) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Missing roomCode or playerId.' });
          }
          return;
        }

        const result = roomManager.reconnectPlayer(roomCode, socket.id, playerId, sessionToken);
        if (!result.success) {
          if (typeof callback === 'function') {
            callback({ success: false, error: result.error });
          }
          return;
        }

        socket.join(result.room.roomCode);
        logger.room(
          `Player ${result.player.name} (${playerId}) reconnected via socket ${socket.id} to room ${result.room.roomCode}`
        );

        io.to(result.room.roomCode).emit(SOCKET_EVENTS.PLAYER_RECONNECTED, {
          playerId: result.player.playerId,
          playerName: result.player.name,
        });

        broadcastRoomState(io, result.room.roomCode);

        const state = roomManager.getSanitizedRoomState(result.room.roomCode, socket.id);
        if (typeof callback === 'function') {
          callback({
            success: true,
            roomCode: result.room.roomCode,
            room: state,
            playerId: result.player.playerId,
            sessionToken: result.player.sessionToken,
            reconnected: true,
          });
        }
      } catch (err) {
        logger.error(`Error in reconnectPlayer handler: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Failed to reconnect player.' });
        }
      }
    });

    socket.on(SOCKET_EVENTS.SET_READY, (payload, callback) => {
      try {
        const { roomCode } = payload || {};
        const result = roomManager.toggleReady(roomCode, socket.id);

        if (!result.success) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: result.error });
          if (typeof callback === 'function') callback({ success: false, error: result.error });
          return;
        }

        logger.room(`Player ${socket.id} ready set to ${result.player.ready} in room ${roomCode}`);

        io.to(roomCode.toUpperCase()).emit(SOCKET_EVENTS.PLAYER_READY, {
          playerId: socket.id,
          ready: result.player.ready,
        });

        broadcastRoomState(io, roomCode);

        if (typeof callback === 'function') {
          callback({ success: true, ready: result.player.ready });
        }
      } catch (err) {
        logger.error(`Error setting ready: ${err.message}`);
      }
    });

    socket.on(SOCKET_EVENTS.LEAVE_ROOM, (payload, callback) => {
      try {
        const roomCode = payload?.roomCode || roomManager.findRoomByPlayer(socket.id);
        if (!roomCode) return;

        const result = roomManager.leaveRoom(roomCode, socket.id);
        socket.leave(roomCode.toUpperCase());

        if (result.success && result.room) {
          io.to(roomCode.toUpperCase()).emit(SOCKET_EVENTS.PLAYER_LEFT, {
            playerId: socket.id,
          });

          if (result.hostChanged) {
            io.to(roomCode.toUpperCase()).emit(SOCKET_EVENTS.HOST_CHANGED, {
              newHostId: result.newHostId,
            });
          }

          broadcastRoomState(io, roomCode);
        }

        if (typeof callback === 'function') callback({ success: true });
      } catch (err) {
        logger.error(`Error leaving room: ${err.message}`);
      }
    });

    // ==========================================
    // PHASE 3 & 4: AUTHORITATIVE GAME ENGINE
    // ==========================================

    /**
     * Start Game (Host only)
     */
    socket.on(SOCKET_EVENTS.START_GAME, (payload, callback) => {
      try {
        const { roomCode } = payload || {};
        const room = roomManager.getRoom(roomCode);
        if (!room) {
          const err = 'Room not found.';
          socket.emit(SOCKET_EVENTS.ERROR, { message: err });
          if (typeof callback === 'function') callback({ success: false, error: err });
          return;
        }

        if (room.hostId !== socket.id) {
          const err = 'Only the room host can launch the match.';
          socket.emit(SOCKET_EVENTS.ERROR, { message: err });
          if (typeof callback === 'function') callback({ success: false, error: err });
          return;
        }

        const canStart = roomManager.canStartGame(roomCode);
        if (!canStart.canStart) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: canStart.reason });
          if (typeof callback === 'function') callback({ success: false, error: canStart.reason });
          return;
        }

        // Initialize authoritative game state
        initializeGame(room);
        logger.game(`Game started in room ${room.roomCode} with ${room.players.length} contenders.`);

        // Start turn timer
        startTurnTimer(io, room);

        // Broadcast game start and individual hands
        io.to(room.roomCode).emit(SOCKET_EVENTS.GAME_STARTED, { roomCode: room.roomCode });
        broadcastRoomState(io, room.roomCode);

        if (typeof callback === 'function') callback({ success: true });
      } catch (err) {
        logger.error(`Error starting game: ${err.message}`);
        if (typeof callback === 'function') callback({ success: false, error: 'Failed to start game.' });
      }
    });

    /**
     * Play Card
     * Payload: { roomCode: string, cardId: string, chosenColor?: string }
     */
    socket.on(SOCKET_EVENTS.PLAY_CARD, (payload, callback) => {
      try {
        const { roomCode, cardId, chosenColor } = payload || {};
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        const playResult = executeCardPlay(room, socket.id, cardId, chosenColor);
        if (!playResult.success) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: playResult.error });
          if (typeof callback === 'function') callback({ success: false, error: playResult.error });
          return;
        }

        logger.game(`Card played in ${roomCode} by ${socket.id}`);

        // Broadcast card play animation event
        io.to(roomCode).emit(SOCKET_EVENTS.CARD_PLAYED, {
          playerId: socket.id,
          playedCard: playResult.playedCard,
          specialAction: playResult.specialAction,
          currentColor: room.currentColor,
        });

        // Check if player won
        if (playResult.isWinner) {
          if (room.turnTimer) clearTimeout(room.turnTimer);

          // Calculate round score
          const roundScore = calculateRoundScore(room.players, socket.id);
          const winnerPlayer = room.players.find((p) => p.id === socket.id);
          if (winnerPlayer) {
            winnerPlayer.score += roundScore;
          }

          // Build scoreboard
          const scoreboard = room.players
            .map((p) => ({
              id: p.id,
              name: p.name,
              avatar: p.avatar,
              isWinner: p.id === socket.id,
              roundScore: p.id === socket.id ? roundScore : 0,
              totalScore: p.score,
              cardsRemaining: p.hand ? p.hand.length : 0,
            }))
            .sort((a, b) => b.totalScore - a.totalScore);

          const resultPayload = {
            winner: room.winner,
            roundScore,
            scoreboard,
          };

          io.to(roomCode).emit(SOCKET_EVENTS.ROUND_ENDED, resultPayload);
          io.to(roomCode).emit(SOCKET_EVENTS.WINNER_ANNOUNCEMENT, resultPayload);
        } else {
          // Restart turn timer for next player
          startTurnTimer(io, room);
        }

        broadcastRoomState(io, roomCode);

        if (typeof callback === 'function') {
          callback({ success: true, playResult });
        }
      } catch (err) {
        logger.error(`Error playing card: ${err.message}`);
      }
    });

    /**
     * Draw Card
     * Payload: { roomCode: string }
     */
    socket.on(SOCKET_EVENTS.DRAW_CARD, (payload, callback) => {
      try {
        const { roomCode } = payload || {};
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        const drawResult = executePlayerDraw(room, socket.id);
        if (!drawResult.success) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: drawResult.error });
          if (typeof callback === 'function') callback({ success: false, error: drawResult.error });
          return;
        }

        logger.game(`Card drawn in ${roomCode} by ${socket.id}`);

        io.to(roomCode).emit(SOCKET_EVENTS.CARD_DRAWN, {
          playerId: socket.id,
        });

        startTurnTimer(io, room);
        broadcastRoomState(io, roomCode);

        if (typeof callback === 'function') {
          callback({ success: true, drawnCard: drawResult.drawnCard });
        }
      } catch (err) {
        logger.error(`Error drawing card: ${err.message}`);
      }
    });

    /**
     * Call UNO
     * Payload: { roomCode: string }
     */
    socket.on(SOCKET_EVENTS.CALL_UNO, (payload, callback) => {
      try {
        const { roomCode } = payload || {};
        const room = roomManager.getRoom(roomCode);
        if (!room || room.status !== 'playing') return;

        const player = room.players.find((p) => p.id === socket.id);
        if (!player) return;

        // Player must have exactly 1 card to legally call UNO
        if (player.hand && player.hand.length === 1) {
          player.calledUno = true;
          logger.game(`${player.name} shouted UNO in room ${roomCode}!`);

          room.gameLog.push({
            text: `🔥 ${player.name} SHOUTED UNO! 🔥`,
            type: 'uno',
            playerId: player.id,
            timestamp: Date.now(),
          });

          io.to(roomCode).emit(SOCKET_EVENTS.UNO_CALLED, {
            playerId: player.id,
            playerName: player.name,
          });

          broadcastRoomState(io, roomCode);
          if (typeof callback === 'function') callback({ success: true });
        } else {
          // False UNO shout penalty!
          const penaltyCards = drawCardsFromRoomDeck(room, 2);
          player.hand.push(...penaltyCards);
          player.calledUno = false;

          room.gameLog.push({
            text: `⚠️ ${player.name} made a false UNO call! Drew 2 penalty cards.`,
            type: 'penalty',
            playerId: player.id,
            timestamp: Date.now(),
          });

          io.to(roomCode).emit(SOCKET_EVENTS.UNO_PENALTY, {
            playerId: player.id,
            playerName: player.name,
            reason: 'False UNO Call',
          });

          broadcastRoomState(io, roomCode);
          if (typeof callback === 'function') callback({ success: false, error: 'False UNO call! 2 card penalty applied.' });
        }
      } catch (err) {
        logger.error(`Error calling UNO: ${err.message}`);
      }
    });

    /**
     * Catch UNO Penalty
     * Another player calls penalty on someone who has 1 card without calling UNO!
     * Payload: { roomCode: string, targetPlayerId: string }
     */
    socket.on(SOCKET_EVENTS.UNO_PENALTY, (payload, callback) => {
      try {
        const { roomCode, targetPlayerId } = payload || {};
        const room = roomManager.getRoom(roomCode);
        if (!room || room.status !== 'playing') return;

        const victim = room.players.find((p) => p.id === targetPlayerId);
        const caller = room.players.find((p) => p.id === socket.id);

        if (victim && victim.hand.length === 1 && !victim.calledUno) {
          const penaltyCards = drawCardsFromRoomDeck(room, 2);
          victim.hand.push(...penaltyCards);
          victim.calledUno = false;

          room.gameLog.push({
            text: `🚨 ${caller?.name || 'Someone'} caught ${victim.name} not calling UNO! +2 cards penalty!`,
            type: 'penalty',
            playerId: victim.id,
            timestamp: Date.now(),
          });

          io.to(roomCode).emit(SOCKET_EVENTS.UNO_PENALTY, {
            playerId: victim.id,
            playerName: victim.name,
            callerName: caller?.name,
            reason: 'Caught without calling UNO',
          });

          broadcastRoomState(io, roomCode);
          if (typeof callback === 'function') callback({ success: true });
        } else {
          if (typeof callback === 'function') callback({ success: false, error: 'Player cannot be penalized.' });
        }
      } catch (err) {
        logger.error(`Error in UNO penalty: ${err.message}`);
      }
    });

    /**
     * Rematch Request
     * Payload: { roomCode: string }
     */
    socket.on(SOCKET_EVENTS.REMATCH_REQUEST, (payload, callback) => {
      try {
        const { roomCode } = payload || {};
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        const player = room.players.find((p) => p.id === socket.id);
        if (player) {
          player.ready = true;
          io.to(roomCode).emit(SOCKET_EVENTS.REMATCH_READY, { playerId: player.id });

          // If all active players ready, host can launch rematch or auto-start
          const allReady = room.players.every((p) => p.ready);
          if (allReady && room.players.length >= 2) {
            initializeGame(room);
            logger.game(`Rematch started in room ${roomCode}`);
            startTurnTimer(io, room);
            io.to(roomCode).emit(SOCKET_EVENTS.REMATCH_STARTED, { roomCode });
            broadcastRoomState(io, roomCode);
          } else {
            broadcastRoomState(io, roomCode);
          }
        }

        if (typeof callback === 'function') callback({ success: true });
      } catch (err) {
        logger.error(`Error in rematch: ${err.message}`);
      }
    });

    /**
     * Return to Lobby
     * Payload: { roomCode: string }
     */
    socket.on(SOCKET_EVENTS.RETURN_TO_LOBBY, (payload, callback) => {
      try {
        const { roomCode } = payload || {};
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        if (room.turnTimer) clearTimeout(room.turnTimer);
        room.status = 'waiting';
        room.winner = null;
        room.players.forEach((p) => {
          p.ready = p.isHost; // host ready by default
          p.hand = [];
          p.calledUno = false;
        });

        io.to(roomCode).emit(SOCKET_EVENTS.ROOM_STATE, roomManager.getSanitizedRoomState(roomCode, socket.id));
        broadcastRoomState(io, roomCode);

        if (typeof callback === 'function') callback({ success: true });
      } catch (err) {
        logger.error(`Error returning to lobby: ${err.message}`);
      }
    });

    // ==========================================
    // PHASE 5: CHAT & EMOTES
    // ==========================================

    socket.on(SOCKET_EVENTS.SEND_CHAT_MESSAGE, (payload, callback) => {
      try {
        const { roomCode, message } = payload || {};
        if (!message || typeof message !== 'string') return;

        if (isRateLimited(socket.id)) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Chat rate limit exceeded. Please wait a moment.' });
          if (typeof callback === 'function') callback({ success: false, error: 'Rate limited.' });
          return;
        }

        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        const player = room.players.find((p) => p.id === socket.id);
        if (!player) return;

        // Sanitize message: strip HTML and trim to max 200 chars
        const sanitized = message.replace(/<[^>]*>?/gm, '').trim().slice(0, 200);
        if (!sanitized) return;

        const chatItem = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          senderId: player.id,
          senderName: player.name,
          senderAvatar: player.avatar,
          message: sanitized,
          timestamp: Date.now(),
        };

        if (!room.chatMessages) room.chatMessages = [];
        room.chatMessages.push(chatItem);
        if (room.chatMessages.length > 50) room.chatMessages.shift();

        io.to(roomCode).emit(SOCKET_EVENTS.CHAT_MESSAGE, chatItem);

        if (typeof callback === 'function') callback({ success: true, message: chatItem });
      } catch (err) {
        logger.error(`Error sending chat message: ${err.message}`);
      }
    });

    socket.on(SOCKET_EVENTS.SEND_EMOTE, (payload) => {
      try {
        const { roomCode, emote } = payload || {};
        if (!ALLOWED_EMOTES.has(emote)) return;

        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        const player = room.players.find((p) => p.id === socket.id);
        if (!player) return;

        io.to(roomCode).emit(SOCKET_EVENTS.PLAYER_EMOTE, {
          playerId: player.id,
          playerName: player.name,
          emote,
          timestamp: Date.now(),
        });
      } catch (err) {
        logger.error(`Error sending emote: ${err.message}`);
      }
    });

    // ==========================================
    // DISCONNECT & RECONNECTION
    // ==========================================

    socket.on(SOCKET_EVENTS.REQUEST_ROOM_STATE, (payload, callback) => {
      const roomCode = payload?.roomCode || roomManager.findRoomByPlayer(socket.id);
      if (roomCode) {
        const state = roomManager.getSanitizedRoomState(roomCode, socket.id);
        if (state) {
          socket.emit(SOCKET_EVENTS.ROOM_STATE, state);
          if (typeof callback === 'function') callback({ success: true, room: state });
          return;
        }
      }
      if (typeof callback === 'function') callback({ success: false, error: 'Room not found.' });
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log(`Player disconnected: ${socket.id}`);
      logger.socket(`Player disconnected: ${socket.id} (Reason: ${reason})`);

      // Clean up chat rate limiting entry for disconnected socket
      chatRateLimits.delete(socket.id);

      const roomCode = roomManager.findRoomByPlayer(socket.id);
      if (!roomCode) return;

      const room = roomManager.getRoom(roomCode);
      if (!room) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      // In an active match, if host disconnects, transfer host immediately to active contender so match isn't stranded
      if (room.status === 'playing' && player.isHost) {
        const connectedPlayers = room.players.filter((p) => p.connected && p.id !== socket.id);
        if (connectedPlayers.length > 0) {
          const newHost = connectedPlayers.reduce(
            (earliest, p) => (p.joinedAt < earliest.joinedAt ? p : earliest),
            connectedPlayers[0]
          );
          player.isHost = false;
          newHost.isHost = true;
          room.hostId = newHost.id;
          io.to(roomCode).emit(SOCKET_EVENTS.HOST_CHANGED, { newHostId: newHost.id });
          logger.room(`Host transferred to ${newHost.name} (${newHost.id}) during match in room ${roomCode}`);
        }
      }

      // Mark player as temporarily disconnected and start 45-second grace period for reconnection
      roomManager.setPlayerDisconnected(roomCode, socket.id, (expiredRoomCode, expiredPlayerId) => {
        logger.room(`Grace period expired for player ${expiredPlayerId} in room ${expiredRoomCode}`);
        const cleanupResult = roomManager.handleGracePeriodExpired(expiredRoomCode, expiredPlayerId);
        if (!cleanupResult) return;

        if (cleanupResult.roomDeleted) {
          logger.room(`Room ${expiredRoomCode} automatically closed after all players disconnected.`);
        } else if (cleanupResult.room) {
          io.to(expiredRoomCode).emit(SOCKET_EVENTS.PLAYER_LEFT, { playerId: cleanupResult.removedPlayerId });
          if (cleanupResult.hostChanged) {
            io.to(expiredRoomCode).emit(SOCKET_EVENTS.HOST_CHANGED, { newHostId: cleanupResult.newHostId });
          }

          // If during match in progress and only 1 player remains connected
          if (cleanupResult.room.status === 'playing') {
            const activeContenders = cleanupResult.room.players.filter((p) => p.connected);
            if (activeContenders.length === 1) {
              const loneWinner = activeContenders[0];
              cleanupResult.room.status = 'finished';
              cleanupResult.room.winner = loneWinner;
              io.to(expiredRoomCode).emit(SOCKET_EVENTS.ROUND_ENDED, {
                winner: loneWinner,
                roundScore: 50,
                roomState: roomManager.getSanitizedRoomState(expiredRoomCode, loneWinner.id),
              });
            }
          }

          broadcastRoomState(io, expiredRoomCode);
        }
      });

      // Broadcast room state so contenders see the player marked as temporarily disconnected
      broadcastRoomState(io, roomCode);
    });
  });
}
