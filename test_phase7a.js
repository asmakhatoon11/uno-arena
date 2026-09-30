import { io } from './frontend/node_modules/socket.io-client/build/esm/index.js';
import { SOCKET_EVENTS } from './shared/constants/socketEvents.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';

const SERVER_URL = 'http://localhost:5000';

async function runTests() {
  console.log('--- STARTING PHASE 7A VERIFICATION TESTS ---');

  // TEST 1: Source code checks for Keyboard Accessibility
  console.log('\n[TEST 1] Verifying Keyboard Accessibility...');
  const unoCardSrc = fs.readFileSync(path.resolve('./frontend/src/components/game/UnoCard.jsx'), 'utf-8');
  assert(unoCardSrc.includes("e.key === 'Enter' || e.key === ' '"), 'UnoCard must handle Enter and Space');
  assert(unoCardSrc.includes('e.preventDefault()'), 'UnoCard must prevent default (prevent page scroll)');
  assert(unoCardSrc.includes('isPlayable && onClick'), 'UnoCard must only activate when playable');
  assert(unoCardSrc.includes('aria-disabled={!isPlayable}'), 'UnoCard must have aria-disabled');
  assert(unoCardSrc.includes('handleFaceDownKeyDown'), 'UnoCard must handle Enter/Space on face down card');

  const gamePageSrc = fs.readFileSync(path.resolve('./frontend/src/pages/GamePage.jsx'), 'utf-8');
  assert(gamePageSrc.includes('handleDeckKeyDown'), 'GamePage must have handleDeckKeyDown');
  assert(gamePageSrc.includes("e.key === 'Enter' || e.key === ' '"), 'GamePage deck handler must check Enter/Space');
  assert(gamePageSrc.includes('if (isMyTurn)'), 'GamePage deck handler must verify isMyTurn');
  assert(gamePageSrc.includes('aria-disabled={!isMyTurn}'), 'Draw pile must have aria-disabled');
  console.log('✓ PASS: Keyboard accessibility verified for UnoCard and Draw Deck.');

  // TEST 2: Source code checks for Profile Default Stats
  console.log('\n[TEST 2] Verifying Profile Default Stats Fallback...');
  const profileModalSrc = fs.readFileSync(path.resolve('./frontend/src/components/common/ProfileModal.jsx'), 'utf-8');
  assert(profileModalSrc.includes("wins: 0"), 'Default state wins must be 0');
  assert(profileModalSrc.includes("gamesPlayed: 0"), 'Default state gamesPlayed must be 0');
  assert(profileModalSrc.includes("totalPoints: 0"), 'Default state totalPoints must be 0');
  assert(profileModalSrc.includes("unlockedAchievements: []"), 'Default achievements must be empty array');
  assert(profileModalSrc.includes("uno_stats_wins') || '0'"), 'Saved wins fallback must be 0');
  assert(profileModalSrc.includes("uno_stats_games') || '0'"), 'Saved games fallback must be 0');
  assert(profileModalSrc.includes("uno_stats_points') || '0'"), 'Saved points fallback must be 0');
  console.log('✓ PASS: Profile default stats and badge fallbacks verified.');

  // TEST 3: Turn Timer Setting authoritative server verification
  console.log('\n[TEST 3] Verifying Turn Timer Setting authoritative handling...');
  const createRoomPageSrc = fs.readFileSync(path.resolve('./frontend/src/pages/CreateRoomPage.jsx'), 'utf-8');
  assert(createRoomPageSrc.includes("uno_timer_setting"), 'CreateRoomPage must read uno_timer_setting');
  assert(createRoomPageSrc.includes("turnDuration"), 'CreateRoomPage must emit turnDuration');

  // Connect socket to test backend authoritative validation
  const socket1 = io(SERVER_URL, { reconnection: false, timeout: 3000 });
  await new Promise((resolve) => socket1.on('connect', resolve));

  // Test 3a: Requested 15 seconds
  const res15 = await new Promise((resolve) => {
    socket1.emit(SOCKET_EVENTS.CREATE_ROOM, {
      playerName: 'TimerHost15',
      avatar: '🦁',
      turnDuration: 15,
    }, resolve);
  });
  assert(res15.success, 'Failed to create room with 15s');
  assert.strictEqual(res15.room.turnDuration, 15000, 'Room state turnDuration must be 15000ms');

  // Test 3b: Requested 45 seconds
  const res45 = await new Promise((resolve) => {
    socket1.emit(SOCKET_EVENTS.CREATE_ROOM, {
      playerName: 'TimerHost45',
      avatar: '🦊',
      turnDuration: 45,
    }, resolve);
  });
  assert(res45.success, 'Failed to create room with 45s');
  assert.strictEqual(res45.room.turnDuration, 45000, 'Room state turnDuration must be 45000ms');

  // Test 3c: Requested invalid 99 seconds (fallback to 30s)
  const resInvalid = await new Promise((resolve) => {
    socket1.emit(SOCKET_EVENTS.CREATE_ROOM, {
      playerName: 'TimerHostInvalid',
      avatar: '⚡',
      turnDuration: 99,
    }, resolve);
  });
  assert(resInvalid.success, 'Failed to create room with invalid duration');
  assert.strictEqual(resInvalid.room.turnDuration, 30000, 'Invalid turnDuration must fall back to 30000ms');

  // Test 3d: Gameplay timer initialization with 15s
  const socket2 = io(SERVER_URL, { reconnection: false, timeout: 3000 });
  await new Promise((resolve) => socket2.on('connect', resolve));
  await new Promise((resolve) => {
    socket2.emit(SOCKET_EVENTS.JOIN_ROOM, {
      roomCode: res15.roomCode,
      playerName: 'Contender2',
      avatar: '👾',
    }, resolve);
  });

  // Ready up player 2
  await new Promise((resolve) => {
    socket2.emit(SOCKET_EVENTS.SET_READY, { roomCode: res15.roomCode }, resolve);
  });

  // Host starts game
  let playingState = null;
  const startPromise = new Promise((resolve) => {
    socket1.on(SOCKET_EVENTS.ROOM_STATE, (state) => {
      if (state.status === 'playing') {
        playingState = state;
        resolve(state);
      }
    });
  });
  socket1.emit(SOCKET_EVENTS.START_GAME, { roomCode: res15.roomCode });
  await startPromise;

  assert.strictEqual(playingState.turnDuration, 15000, 'Active game playing state turnDuration must be 15000ms');
  assert(playingState.turnExpiresAt > Date.now(), 'Active turnExpiresAt must be in the future');
  const delta = playingState.turnExpiresAt - Date.now();
  assert(delta <= 15100 && delta >= 13500, `Turn expiration expected ~15s, got ${delta}ms`);
  console.log(`✓ PASS: Turn timer authoritative validation and gameplay timer confirmed (${playingState.turnDuration}ms, expires in ${delta}ms).`);

  socket1.disconnect();
  socket2.disconnect();

  // TEST 4: Share Room Link & Query Param Pre-fill
  console.log('\n[TEST 4] Verifying Share Room Link and Join Room Code Pre-fill...');
  const lobbySrc = fs.readFileSync(path.resolve('./frontend/src/pages/LobbyPage.jsx'), 'utf-8');
  assert(lobbySrc.includes("join?code=${roomCode}"), 'LobbyPage must use /join?code=${roomCode}');

  const joinSrc = fs.readFileSync(path.resolve('./frontend/src/pages/JoinRoomPage.jsx'), 'utf-8');
  assert(joinSrc.includes("new URLSearchParams(window.location.search).get('code')") || joinSrc.includes("params.get('code')"), 'JoinRoomPage must inspect search params for code');
  assert(joinSrc.includes("formatRoomCode"), 'JoinRoomPage must format pre-filled code');

  const appSrc = fs.readFileSync(path.resolve('./frontend/src/App.jsx'), 'utf-8');
  assert(appSrc.includes("currentPage === 'join' && window.location.search"), 'App.jsx must preserve query param on replaceState');
  console.log('✓ PASS: Share room link generation and pre-fill logic verified.');

  console.log('\n=========================================');
  console.log('ALL PHASE 7A VERIFICATION TESTS PASSED!');
  console.log('=========================================');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
