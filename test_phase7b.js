import http from 'http';
import { Server } from './backend/node_modules/socket.io/dist/index.js';
import { io } from './frontend/node_modules/socket.io-client/build/esm/index.js';
import { SOCKET_EVENTS } from './shared/constants/socketEvents.js';
import { setupSocketHandlers, chatRateLimits } from './backend/src/socket/socketHandler.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';

async function runPhase7BTests() {
  console.log('--- STARTING PHASE 7B VERIFICATION TESTS ---');

  // TEST 1: Wild Card Flight Animation Source Verification
  console.log('\n[TEST 1] Verifying Wild Card Flight Animation Position Preservation...');
  const gamePageSrc = fs.readFileSync(path.resolve('./frontend/src/pages/GamePage.jsx'), 'utf-8');
  assert(gamePageSrc.includes('pendingWildCardRect'), 'GamePage must declare pendingWildCardRect state');
  assert(gamePageSrc.includes('setPendingWildCardRect({'), 'handleCardClick must capture Wild card bounding rect');
  assert(gamePageSrc.includes('triggerCardFlightAndPlay(card, null, chosenColor, savedRect)'), 'handleColorSelected must pass savedRect to flight animation');
  assert(gamePageSrc.includes('customRect ||'), 'triggerCardFlightAndPlay must support customRect');
  console.log('✓ PASS: Wild card screen position preservation and flight animation verified.');

  // TEST 2: Chat Rate-Limit Cleanup on Disconnect
  console.log('\n[TEST 2] Verifying Chat Rate-Limit Cleanup on Socket Disconnection...');
  const testHttp = http.createServer();
  const testIo = new Server(testHttp, { cors: { origin: '*' } });
  setupSocketHandlers(testIo);
  await new Promise((r) => testHttp.listen(0, r));
  const testPort = testHttp.address().port;
  const testClient = io(`http://localhost:${testPort}`, { reconnection: false });
  await new Promise((r) => testClient.on('connect', r));
  const testSocketId = testClient.id;

  // Create room and send chat message to populate rate limit map
  const createRes = await new Promise((resolve) => {
    testClient.emit(SOCKET_EVENTS.CREATE_ROOM, {
      playerName: 'RateLimitTester',
      avatar: '🦁',
    }, resolve);
  });
  assert(createRes.success, 'Failed to create room for rate limit test');

  await new Promise((resolve) => {
    testClient.emit(SOCKET_EVENTS.SEND_CHAT_MESSAGE, {
      roomCode: createRes.roomCode,
      message: 'Testing rate limits',
    }, resolve);
  });

  // Verify chatRateLimits has testSocketId
  assert(chatRateLimits.has(testSocketId), `chatRateLimits must have entry for active socket ${testSocketId}`);
  console.log(`✓ Confirmed chatRateLimits contains entry for socket: ${testSocketId}`);

  // Disconnect socket and verify cleanup
  testClient.disconnect();
  await new Promise((r) => setTimeout(r, 200));

  assert(!chatRateLimits.has(testSocketId), `chatRateLimits entry for disconnected socket ${testSocketId} must be removed`);
  console.log('✓ PASS: Disconnected socket entry was immediately purged from chatRateLimits map.');

  testIo.close();
  testHttp.close();

  // TEST 3: Mobile Chat FAB Safe Area
  console.log('\n[TEST 3] Verifying Mobile Chat FAB Safe Area Inset Support...');
  const gamePageCss = fs.readFileSync(path.resolve('./frontend/src/pages/GamePage.css'), 'utf-8');
  assert(gamePageCss.includes('env(safe-area-inset-bottom'), 'GamePage.css must support env(safe-area-inset-bottom)');
  assert(gamePageCss.includes('.mobile-chat-fab {'), 'GamePage.css must define .mobile-chat-fab');
  assert(gamePageCss.includes('calc(20px + env(safe-area-inset-bottom'), 'FAB must use calc(20px + env(safe-area-inset-bottom...))');
  assert(gamePageCss.includes('padding-bottom: env(safe-area-inset-bottom'), 'Sheet must use padding-bottom: env(safe-area-inset-bottom...)');
  console.log('✓ PASS: Mobile chat FAB safe area styling verified.');

  // TEST 4: 8-Player Opponent Row Scroll Hint
  console.log('\n[TEST 4] Verifying 8-Player Opponent Row Scroll Hint Support...');
  assert(gamePageSrc.includes('opponents-wrapper'), 'GamePage must render opponents-wrapper');
  assert(gamePageSrc.includes('opponentsRowRef'), 'GamePage must bind opponentsRowRef');
  assert(gamePageSrc.includes('canScrollOpponentsLeft'), 'GamePage must monitor canScrollOpponentsLeft');
  assert(gamePageSrc.includes('canScrollOpponentsRight'), 'GamePage must monitor canScrollOpponentsRight');
  assert(gamePageCss.includes('.opponents-wrapper'), 'GamePage.css must define .opponents-wrapper');
  assert(gamePageCss.includes('.opponents-scroll-hint'), 'GamePage.css must define .opponents-scroll-hint');
  assert(gamePageCss.includes('pointer-events: none'), 'Scroll hints must specify pointer-events: none');
  assert(gamePageCss.includes('safe center'), 'opponents-row must use safe center');
  console.log('✓ PASS: 8-player opponent row scroll hint and non-interfering styles verified.');

  // TEST 5: HomePage Alias Cleanup
  console.log('\n[TEST 5] Verifying HomePage Alias Cleanup...');
  const homePageExists = fs.existsSync(path.resolve('./frontend/src/pages/HomePage.jsx'));
  assert(!homePageExists, 'HomePage.jsx must be removed');
  const appSrc = fs.readFileSync(path.resolve('./frontend/src/App.jsx'), 'utf-8');
  assert(appSrc.includes("import { LandingPage } from './pages/LandingPage'"), 'App.jsx must import LandingPage');
  assert(!appSrc.includes('HomePage'), 'App.jsx must not reference HomePage');
  console.log('✓ PASS: Unused HomePage.jsx removed and App routing verified.');

  console.log('\n=========================================');
  console.log('ALL PHASE 7B VERIFICATION TESTS PASSED!');
  console.log('=========================================');
}

runPhase7BTests().catch((err) => {
  console.error('Phase 7B Test failed:', err);
  process.exit(1);
});
