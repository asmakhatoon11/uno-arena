/**
 * Room Manager
 * Authoritative in-memory room management for UNO Arena
 */

import { MIN_PLAYERS_PER_ROOM, MAX_PLAYERS_PER_ROOM } from '../../../shared/constants/cardConstants.js';

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  /**
   * Generates a unique 6-character uppercase alphanumeric room code
   * Excludes ambiguous characters (0, O, 1, I)
   * @returns {string}
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Creates a new game room
   * @param {string} hostSocketId 
   * @param {string} hostSocketId 
   * @param {string} hostName 
   * @param {string} avatar 
   * @param {string} playerId
   * @param {string} sessionToken
   * @returns {Object} Newly created room object
   */
  createRoom(hostSocketId, hostName = 'Host', avatar = '🦁', playerId = null, sessionToken = null, requestedTurnDuration = 30) {
    let roomCode;
    do {
      roomCode = this.generateRoomCode();
    } while (this.rooms.has(roomCode));

    const sanitizedName = (hostName || 'Player').trim().slice(0, 20) || 'Host';
    const pId = playerId || `p_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
    const sToken = sessionToken || `t_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;

    // Authoritative turn duration validation (allowed: 15, 30, 45, 60 seconds; default 30s)
    const ALLOWED_DURATIONS_SEC = [15, 30, 45, 60];
    const durationNum = typeof requestedTurnDuration === 'number'
      ? (requestedTurnDuration > 1000 ? Math.round(requestedTurnDuration / 1000) : requestedTurnDuration)
      : parseInt(requestedTurnDuration, 10);
    const validatedDurationSec = ALLOWED_DURATIONS_SEC.includes(durationNum) ? durationNum : 30;
    const validatedTurnDurationMs = validatedDurationSec * 1000;

    const room = {
      roomCode,
      code: roomCode, // backwards compatibility
      hostId: hostSocketId,
      status: 'waiting', // 'waiting' | 'playing' | 'finished'
      players: [
        {
          id: hostSocketId,
          playerId: pId,
          sessionToken: sToken,
          name: sanitizedName,
          avatar: avatar || '🦁',
          ready: true, // Host is ready by default
          score: 0,
          connected: true,
          isHost: true,
          cardsCount: 0,
          hand: [],
          calledUno: false,
          joinedAt: Date.now(),
          disconnectedAt: null,
          disconnectTimer: null,
        },
      ],
      deck: [],
      discardPile: [],
      currentPlayerIndex: 0,
      direction: 1, // 1 for clockwise, -1 for counter-clockwise
      currentColor: null,
      winner: null,
      gameLog: [],
      chatMessages: [],
      turnStartedAt: null,
      turnDuration: validatedTurnDurationMs,
      turnExpiresAt: null,
      turnTimer: null,
      createdAt: Date.now(),
    };

    this.rooms.set(roomCode, room);
    return room;
  }

  /**
   * Fetches room by code (case-insensitive)
   * @param {string} code 
   * @returns {Object|null}
   */
  getRoom(code) {
    if (!code || typeof code !== 'string') return null;
    return this.rooms.get(code.toUpperCase().trim()) || null;
  }

  /**
   * Joins an existing room
   * @param {string} code 
   * @param {string} socketId 
   * @param {string} playerName 
   * @param {string} avatar 
   * @param {string} playerId
   * @param {string} sessionToken
   * @returns {{ success: boolean, room?: Object, error?: string, reconnected?: boolean }}
   */
  joinRoom(code, socketId, playerName = 'Player', avatar = '🦊', playerId = null, sessionToken = null) {
    const room = this.getRoom(code);
    if (!room) {
      return { success: false, error: 'Room not found. Please verify the 6-character room code.' };
    }

    // 1. Check if a player with this persistent playerId is already in the room (reconnection)
    if (playerId) {
      const existingByPlayerId = room.players.find((p) => p.playerId === playerId);
      if (existingByPlayerId) {
        return this.reconnectPlayer(code, socketId, playerId, sessionToken);
      }
    }

    // 2. Check if this socketId is already in room
    const existingIndex = room.players.findIndex((p) => p.id === socketId);
    if (existingIndex !== -1) {
      room.players[existingIndex].connected = true;
      if (room.players[existingIndex].disconnectTimer) {
        clearTimeout(room.players[existingIndex].disconnectTimer);
        room.players[existingIndex].disconnectTimer = null;
      }
      return { success: true, room };
    }

    // 3. New player joining during active game is not permitted
    if (room.status !== 'waiting') {
      return { success: false, error: 'Match is already in progress in this room.' };
    }

    // 4. Room capacity check (2 to 8 players)
    if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
      return { success: false, error: `Room is full (max ${MAX_PLAYERS_PER_ROOM} players).` };
    }

    const sanitizedName = (playerName || 'Player').trim().slice(0, 20) || 'Player';
    const pId = playerId || `p_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
    const sToken = sessionToken || `t_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;

    const newPlayer = {
      id: socketId,
      playerId: pId,
      sessionToken: sToken,
      name: sanitizedName,
      avatar: avatar || '🦊',
      ready: false,
      score: 0,
      connected: true,
      isHost: false,
      cardsCount: 0,
      hand: [],
      calledUno: false,
      joinedAt: Date.now(),
      disconnectedAt: null,
      disconnectTimer: null,
    };

    room.players.push(newPlayer);
    return { success: true, room };
  }

  /**
   * Reconnects a player to their existing room using their persistent playerId and sessionToken.
   * Restores socket association, private hand, score, and turn state.
   * 
   * @param {string} code 
   * @param {string} socketId 
   * @param {string} playerId 
   * @param {string} sessionToken 
   * @returns {{ success: boolean, room?: Object, player?: Object, oldSocketId?: string, error?: string, reconnected?: boolean }}
   */
  reconnectPlayer(code, socketId, playerId, sessionToken) {
    const room = this.getRoom(code);
    if (!room) {
      return { success: false, error: 'Room not found. It may have expired or been closed.' };
    }

    // Locate player by persistent playerId or socketId
    const player = room.players.find(
      (p) => (playerId && p.playerId === playerId) || p.id === socketId
    );

    if (!player) {
      return { success: false, error: 'Player session not found in this room.' };
    }

    // Security check: validate session token if registered
    if (player.sessionToken && sessionToken && player.sessionToken !== sessionToken) {
      return { success: false, error: 'Unauthorized: Invalid player session token.' };
    }

    // Cancel pending disconnect grace timer
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
    }

    const oldSocketId = player.id;
    player.id = socketId;
    player.connected = true;
    player.disconnectedAt = null;

    // If this player was host, update room.hostId to their new socket ID
    if (player.isHost) {
      room.hostId = socketId;
    }

    return {
      success: true,
      room,
      player,
      oldSocketId,
      reconnected: true,
    };
  }

  /**
   * Marks a player as disconnected and initiates the 45-second grace period.
   * 
   * @param {string} code 
   * @param {string} socketId 
   * @param {Function} onGraceExpired Callback if player does not reconnect in time
   * @returns {{ room: Object, player: Object } | null}
   */
  setPlayerDisconnected(code, socketId, onGraceExpired) {
    const room = this.getRoom(code);
    if (!room) return null;

    const player = room.players.find((p) => p.id === socketId);
    if (!player) return null;

    player.connected = false;
    player.disconnectedAt = Date.now();

    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
    }

    // 45-second grace period for refresh or transient network reconnect
    const GRACE_PERIOD_MS = 45000;
    player.disconnectTimer = setTimeout(() => {
      if (typeof onGraceExpired === 'function') {
        onGraceExpired(room.roomCode, player.playerId);
      }
    }, GRACE_PERIOD_MS);

    return { room, player };
  }

  /**
   * Handles cleanup when a player's disconnect grace period expires without reconnection.
   * 
   * @param {string} code 
   * @param {string} playerId 
   * @returns {{ roomDeleted: boolean, room?: Object, removedPlayerId?: string, hostChanged?: boolean, newHostId?: string } | null}
   */
  handleGracePeriodExpired(code, playerId) {
    const room = this.getRoom(code);
    if (!room) return null;

    const playerIndex = room.players.findIndex((p) => p.playerId === playerId);
    if (playerIndex === -1) return null;

    const player = room.players[playerIndex];
    // If player reconnected before expiration, do nothing
    if (player.connected) return null;

    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
    }

    const wasHost = player.isHost;
    const removedSocketId = player.id;
    room.players.splice(playerIndex, 1);

    // If room is empty, delete it
    if (room.players.length === 0) {
      if (room.turnTimer) clearTimeout(room.turnTimer);
      this.rooms.delete(room.roomCode);
      return { roomDeleted: true, roomCode: code };
    }

    let hostChanged = false;
    let newHostId = null;

    // Migrate host if departed player was host
    if (wasHost && room.players.length > 0) {
      const connectedPlayers = room.players.filter((p) => p.connected);
      const newHost = connectedPlayers.length > 0
        ? connectedPlayers.reduce((earliest, p) => (p.joinedAt < earliest.joinedAt ? p : earliest), connectedPlayers[0])
        : room.players[0];

      newHost.isHost = true;
      room.hostId = newHost.id;
      hostChanged = true;
      newHostId = newHost.id;
    }

    return {
      roomDeleted: false,
      room,
      removedPlayerId: removedSocketId,
      hostChanged,
      newHostId,
    };
  }

  /**
   * Toggles ready state for a player
   * @param {string} code 
   * @param {string} socketId 
   * @returns {{ success: boolean, player?: Object, error?: string }}
   */
  toggleReady(code, socketId) {
    const room = this.getRoom(code);
    if (!room) return { success: false, error: 'Room not found.' };

    const player = room.players.find((p) => p.id === socketId);
    if (!player) return { success: false, error: 'Player not found in room.' };

    player.ready = !player.ready;
    return { success: true, player, room };
  }

  /**
   * Explicitly leaves a room (cancels grace timer and removes immediately)
   * @param {string} code 
   * @param {string} socketId 
   * @returns {{ success: boolean, room?: Object, hostChanged?: boolean, newHostId?: string }}
   */
  leaveRoom(code, socketId) {
    const room = this.getRoom(code);
    if (!room) return { success: false };

    const playerIndex = room.players.findIndex((p) => p.id === socketId);
    if (playerIndex === -1) return { success: false };

    const player = room.players[playerIndex];
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
    }

    const wasHost = player.isHost;
    room.players.splice(playerIndex, 1);

    // If room is empty, delete it
    if (room.players.length === 0) {
      if (room.turnTimer) clearTimeout(room.turnTimer);
      this.rooms.delete(room.roomCode);
      return { success: true, room: null };
    }

    let hostChanged = false;
    let newHostId = null;

    // If host left, transfer host to longest-connected active player
    if (wasHost && room.players.length > 0) {
      const connectedPlayers = room.players.filter((p) => p.connected);
      const newHost = connectedPlayers.length > 0
        ? connectedPlayers.reduce((earliest, p) => (p.joinedAt < earliest.joinedAt ? p : earliest), connectedPlayers[0])
        : room.players[0];

      newHost.isHost = true;
      room.hostId = newHost.id;
      hostChanged = true;
      newHostId = newHost.id;
    }

    return { success: true, room, hostChanged, newHostId };
  }

  /**
   * Finds room code by player socket ID
   * @param {string} socketId 
   * @returns {string|null}
   */
  findRoomByPlayer(socketId) {
    for (const [code, room] of this.rooms.entries()) {
      if (room.players.some((p) => p.id === socketId)) {
        return code;
      }
    }
    return null;
  }

  /**
   * Checks if room can start game
   * At least 2 players, and all players ready
   * @param {string} code 
   * @returns {{ canStart: boolean, reason?: string }}
   */
  canStartGame(code) {
    const room = this.getRoom(code);
    if (!room) return { canStart: false, reason: 'Room not found.' };

    if (room.players.length < MIN_PLAYERS_PER_ROOM) {
      return {
        canStart: false,
        reason: `Need at least ${MIN_PLAYERS_PER_ROOM} players to start the match (currently ${room.players.length}).`,
      };
    }

    const unreadyPlayers = room.players.filter((p) => !p.ready);
    if (unreadyPlayers.length > 0) {
      const names = unreadyPlayers.map((p) => p.name).join(', ');
      return {
        canStart: false,
        reason: `Waiting for all players to be Ready: ${names}`,
      };
    }

    return { canStart: true };
  }

  /**
   * Returns a sanitized, client-safe room state.
   * CRITICAL SECURITY: Never expose opponent private hands!
   * @param {string} code 
   * @param {string} requestingSocketId 
   * @returns {Object|null}
   */
  getSanitizedRoomState(code, requestingSocketId) {
    const room = this.getRoom(code);
    if (!room) return null;

    const me = room.players.find((p) => p.id === requestingSocketId);

    // Sanitize players: only send public info and card count
    const sanitizedPlayers = room.players.map((p) => ({
      id: p.id,
      playerId: p.playerId,
      name: p.name,
      avatar: p.avatar,
      ready: p.ready,
      score: p.score,
      connected: p.connected,
      isHost: p.isHost,
      cardsCount: p.hand ? p.hand.length : 0,
      calledUno: p.calledUno || false,
    }));

    const topDiscard = room.discardPile.length > 0
      ? room.discardPile[room.discardPile.length - 1]
      : null;

    const currentPlayer = room.players[room.currentPlayerIndex] || null;

    return {
      roomCode: room.roomCode,
      code: room.roomCode,
      hostId: room.hostId,
      status: room.status,
      players: sanitizedPlayers,
      currentPlayerIndex: room.currentPlayerIndex,
      currentPlayerId: currentPlayer ? currentPlayer.id : null,
      currentPlayerName: currentPlayer ? currentPlayer.name : null,
      direction: room.direction,
      currentColor: room.currentColor,
      discardTop: topDiscard,
      discardPileCount: room.discardPile.length,
      drawPileCount: room.deck.length,
      myHand: me ? me.hand || [] : [],
      winner: room.winner,
      turnDuration: room.turnDuration,
      turnExpiresAt: room.turnExpiresAt,
      gameLog: room.gameLog ? room.gameLog.slice(-20) : [],
    };
  }

  /**
   * Removes room by code
   * @param {string} code 
   */
  deleteRoom(code) {
    const room = this.getRoom(code);
    if (room && room.turnTimer) {
      clearTimeout(room.turnTimer);
    }
    this.rooms.delete(code.toUpperCase().trim());
  }
}

export const roomManager = new RoomManager();
