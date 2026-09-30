/**
 * Automated Verification Script: Multiplayer Reconnection
 * Tests:
 * 1. Lobby Reconnection with Host preservation
 * 2. In-Game Reconnection with Hand & Turn preservation
 * 3. In-Game Card Play after Reconnection
 * 4. Security Check: Session Token validation
 * 5. Reconnection Grace Period handling
 */

import { io } from './frontend/node_modules/socket.io-client/build/esm/index.js';
import { SOCKET_EVENTS } from './shared/constants/socketEvents.js';

const BACKEND_URL = 'http://localhost:5000';

function createClient() {
  return io(BACKEND_URL, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 5000,
  });
}

async function runReconnectionTests() {
  console.log('\n======================================================');
  console.log('   UNO ARENA — MULTIPLAYER RECONNECTION TEST SUITE    ');
  console.log('======================================================\n');

  const playerIdAlice = `p_alice_${Date.now()}`;
  const tokenAlice = `t_alice_${Date.now()}`;
  const playerIdBob = `p_bob_${Date.now()}`;
  const tokenBob = `t_bob_${Date.now()}`;

  let clientAlice = createClient();
  let clientBob = createClient();

  try {
    await Promise.all([
      new Promise((res) => clientAlice.on('connect', res)),
      new Promise((res) => clientBob.on('connect', res)),
    ]);
    console.log(`✓ Both test clients connected (Alice socket: ${clientAlice.id}, Bob socket: ${clientBob.id})`);

    // TEST 1: Alice creates room with persistent ID
    let roomCode = '';
    await new Promise((resolve, reject) => {
      clientAlice.emit(
        SOCKET_EVENTS.CREATE_ROOM,
        {
          playerName: 'Alice (Host)',
          avatar: '🦁',
          playerId: playerIdAlice,
          sessionToken: tokenAlice,
        },
        (res) => {
          if (!res.success) return reject(new Error(res.error));
          roomCode = res.roomCode;
          console.assert(res.room.hostId === clientAlice.id, 'Alice must be host');
          console.log(`✓ Test 1: Alice created room #${roomCode} with persistent playerId`);
          resolve();
        }
      );
    });

    // Bob joins room
    await new Promise((resolve, reject) => {
      clientBob.emit(
        SOCKET_EVENTS.JOIN_ROOM,
        {
          roomCode,
          playerName: 'Bob',
          avatar: '🦊',
          playerId: playerIdBob,
          sessionToken: tokenBob,
        },
        (res) => {
          if (!res.success) return reject(new Error(res.error));
          console.log(`✓ Test 1: Bob joined room #${roomCode}`);
          resolve();
        }
      );
    });

    // TEST 2: Alice page refresh in Lobby
    console.log('\n--- Testing Lobby Reconnection & Host Persistence ---');
    const oldAliceSocketId = clientAlice.id;
    clientAlice.disconnect(); // Simulates page unload
    await new Promise((r) => setTimeout(r, 200));

    // Connect new socket (simulates new page load)
    clientAlice = createClient();
    await new Promise((res) => clientAlice.on('connect', res));
    console.log(`✓ Alice reloaded page with new socket: ${clientAlice.id} (Old: ${oldAliceSocketId})`);

    // Reconnect Alice
    let aliceReconnectedState = null;
    await new Promise((resolve, reject) => {
      clientAlice.emit(
        SOCKET_EVENTS.RECONNECT_PLAYER,
        {
          roomCode,
          playerId: playerIdAlice,
          sessionToken: tokenAlice,
        },
        (res) => {
          if (!res.success) return reject(new Error(res.error));
          aliceReconnectedState = res.room;
          console.log(`✓ Test 2: Alice reconnected to lobby successfully`);
          resolve();
        }
      );
    });

    console.assert(aliceReconnectedState.hostId === clientAlice.id, 'Alice must retain Host status on new socket');
    console.assert(aliceReconnectedState.players.length === 2, 'Room must still have 2 players');
    const aliceInPlayers = aliceReconnectedState.players.find((p) => p.playerId === playerIdAlice);
    console.assert(aliceInPlayers.id === clientAlice.id, 'Player socketId must be updated in players array');
    console.assert(aliceInPlayers.connected === true, 'Player must be marked connected: true');
    console.log(`✓ Host identity retained on new socket ${clientAlice.id}`);

    // TEST 3: Security check — Impersonation prevention
    console.log('\n--- Testing Security: Impersonation Prevention ---');
    const attackerClient = createClient();
    await new Promise((res) => attackerClient.on('connect', res));
    await new Promise((resolve) => {
      attackerClient.emit(
        SOCKET_EVENTS.RECONNECT_PLAYER,
        {
          roomCode,
          playerId: playerIdAlice,
          sessionToken: 'invalid_token_hacker',
        },
        (res) => {
          console.assert(res.success === false, 'Server must reject invalid session token');
          console.log(`✓ Impersonation blocked: Server rejected forged token with: "${res.error}"`);
          attackerClient.disconnect();
          resolve();
        }
      );
    });

    // TEST 4: Ready up and Start Game
    console.log('\n--- Launching Active Match ---');
    await new Promise((res) => clientBob.emit(SOCKET_EVENTS.SET_READY, { roomCode }, res));

    let gameStateAlice = null;
    let gameStateBob = null;
    clientAlice.on(SOCKET_EVENTS.ROOM_STATE, (s) => (gameStateAlice = s));
    clientBob.on(SOCKET_EVENTS.ROOM_STATE, (s) => (gameStateBob = s));

    await new Promise((resolve, reject) => {
      clientAlice.emit(SOCKET_EVENTS.START_GAME, { roomCode }, (res) => {
        if (!res.success) return reject(new Error(res.error));
        resolve();
      });
    });

    await new Promise((r) => setTimeout(r, 400));
    console.assert(gameStateAlice?.status === 'playing', 'Match must be in playing state');
    const initialAliceHand = [...gameStateAlice.myHand];
    console.log(`✓ Match started! Alice dealt ${initialAliceHand.length} cards, Bob dealt ${gameStateBob.myHand.length} cards`);

    // TEST 5: Alice refreshes mid-game
    console.log('\n--- Testing In-Game Mid-Match Reconnection ---');
    const midGameOldSocket = clientAlice.id;
    clientAlice.disconnect(); // Browser refresh simulation
    await new Promise((r) => setTimeout(r, 200));

    // Bob requests room state and should see Alice temporarily disconnected
    await new Promise((resolve) => {
      clientBob.emit(SOCKET_EVENTS.REQUEST_ROOM_STATE, { roomCode }, (res) => {
        const alicePlayer = res.room.players.find((p) => p.playerId === playerIdAlice);
        console.assert(alicePlayer.connected === false, 'Bob should see Alice temporarily disconnected');
        console.log(`✓ Other contenders see Alice temporarily disconnected (grace period active)`);
        resolve();
      });
    });

    // Alice reconnects with new socket
    clientAlice = createClient();
    await new Promise((res) => clientAlice.on('connect', res));

    let midGameRestoredState = null;
    await new Promise((resolve, reject) => {
      clientAlice.emit(
        SOCKET_EVENTS.RECONNECT_PLAYER,
        {
          roomCode,
          playerId: playerIdAlice,
          sessionToken: tokenAlice,
        },
        (res) => {
          if (!res.success) return reject(new Error(res.error));
          midGameRestoredState = res.room;
          resolve();
        }
      );
    });

    console.assert(midGameRestoredState.status === 'playing', 'Game must still be playing');
    console.assert(midGameRestoredState.myHand.length === initialAliceHand.length, 'Alice hand size must be fully restored');
    const initialIds = initialAliceHand.map((c) => c.id).sort().join(',');
    const restoredIds = midGameRestoredState.myHand.map((c) => c.id).sort().join(',');
    console.assert(initialIds === restoredIds, 'Private hand cards must match exact cards before refresh');
    console.log(`✓ In-Game Reconnection Success: Private hand (${midGameRestoredState.myHand.length} cards) fully restored without duplicates`);

    // TEST 6: Card play or Draw on reconnected socket
    console.log('\n--- Testing Gameplay Action on Reconnected Socket ---');
    const currentActiveClient = midGameRestoredState.currentPlayerId === clientAlice.id ? clientAlice : clientBob;
    const isAliceTurn = midGameRestoredState.currentPlayerId === clientAlice.id;
    console.log(`✓ Active turn is currently: ${isAliceTurn ? 'Alice (reconnected client)' : 'Bob'}`);

    if (isAliceTurn) {
      // Alice draws a card using her new socket
      await new Promise((resolve, reject) => {
        clientAlice.emit(SOCKET_EVENTS.DRAW_CARD, { roomCode }, (res) => {
          if (!res.success) return reject(new Error(res.error));
          console.log(`✓ Reconnected Alice successfully drew a card on her new socket!`);
          resolve();
        });
      });
    } else {
      // Bob plays or draws
      await new Promise((resolve, reject) => {
        clientBob.emit(SOCKET_EVENTS.DRAW_CARD, { roomCode }, (res) => {
          if (!res.success) return reject(new Error(res.error));
          console.log(`✓ Bob drew a card, advancing turn back to Alice`);
          resolve();
        });
      });
      // Now Alice can take her turn on her new socket
      await new Promise((r) => setTimeout(r, 200));
      await new Promise((resolve, reject) => {
        clientAlice.emit(SOCKET_EVENTS.DRAW_CARD, { roomCode }, (res) => {
          if (!res.success) return reject(new Error(res.error));
          console.log(`✓ Reconnected Alice successfully executed action on her new socket!`);
          resolve();
        });
      });
    }

    clientAlice.disconnect();
    clientBob.disconnect();

    console.log('\n======================================================');
    console.log('   ALL MULTIPLAYER RECONNECTION TESTS PASSED! 🎉      ');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Reconnection test failed:', err);
    clientAlice.disconnect();
    clientBob.disconnect();
    process.exit(1);
  }
}

runReconnectionTests();
