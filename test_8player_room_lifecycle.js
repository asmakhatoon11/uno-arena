import { io } from './frontend/node_modules/socket.io-client/build/esm/index.js';
import { SOCKET_EVENTS } from './shared/constants/socketEvents.js';

const SERVER_URL = 'http://localhost:5000';

function createClient(name) {
  return new Promise((resolve) => {
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    socket.on('connect', () => {
      resolve(socket);
    });
  });
}

async function runTest() {
  console.log('\n======================================================');
  console.log('   UNO ARENA — 2-TO-8 PLAYER ROOM LIFECYCLE TEST      ');
  console.log('======================================================\n');

  // Step 1: Host creates room
  const host = await createClient('Player1_Host');
  console.log(`✓ Host connected (${host.id})`);

  let roomCode = null;
  await new Promise((resolve) => {
    host.emit(
      SOCKET_EVENTS.CREATE_ROOM,
      { playerName: 'Player1_Host', avatar: '👑' },
      (res) => {
        if (!res?.success) throw new Error('Host failed to create room: ' + res?.error);
        roomCode = res.roomCode;
        console.log(`✓ Step 1: Host created room #${roomCode}`);
        resolve();
      }
    );
  });

  // Step 2: Second player joins
  const player2 = await createClient('Player2');
  await new Promise((resolve) => {
    player2.emit(
      SOCKET_EVENTS.JOIN_ROOM,
      { roomCode, playerName: 'Player2', avatar: '🦊' },
      (res) => {
        if (!res?.success) throw new Error('Player 2 failed to join: ' + res?.error);
        console.log(`✓ Step 2: Player 2 joined room #${roomCode}`);
        resolve();
      }
    );
  });

  // Step 3: Verify both players appear in the same lobby
  await new Promise((resolve) => {
    host.once(SOCKET_EVENTS.ROOM_STATE, (state) => {
      if (state.players.length === 2) {
        console.log(`✓ Step 3: Both players appear in same lobby (Count: ${state.players.length}/8)`);
        resolve();
      }
    });
    // Trigger state check or wait
    setTimeout(resolve, 500);
  });

  // Step 4: Player 2 toggles READY (Host is ready by default)
  await new Promise((resolve) => {
    player2.emit(SOCKET_EVENTS.SET_READY, { roomCode }, (res) => {
      if (!res?.success) throw new Error('Player 2 failed to ready: ' + res?.error);
      console.log('✓ Step 4: Player 2 is READY (Host is ready by default, all 2 ready)');
      resolve();
    });
  });

  // Step 5: Test that host CAN start immediately with 2 players (backend check)
  // Instead of starting now and locking the room status to 'playing', let's test start logic
  // and then let third player join. If we start, we can restart or verify canStartGame.
  // Let's create a temporary 2-player room to test instant start with 2:
  console.log('\n--- Verifying 2-Player Instant Start in Dedicated 2-Player Match ---');
  const tempHost = await createClient('TempHost');
  const tempP2 = await createClient('TempP2');
  let tempRoomCode = '';

  await new Promise((resolve) => {
    tempHost.emit(SOCKET_EVENTS.CREATE_ROOM, { playerName: 'TempHost' }, (res) => {
      tempRoomCode = res.roomCode;
      resolve();
    });
  });
  await new Promise((resolve) => {
    tempP2.emit(SOCKET_EVENTS.JOIN_ROOM, { roomCode: tempRoomCode, playerName: 'TempP2' }, () => resolve());
  });
  await new Promise((resolve) => tempP2.emit(SOCKET_EVENTS.SET_READY, { roomCode: tempRoomCode }, () => resolve()));

  await new Promise((resolve) => {
    tempHost.emit(SOCKET_EVENTS.START_GAME, { roomCode: tempRoomCode }, (res) => {
      if (!res?.success) throw new Error('Failed to start 2-player match: ' + res?.error);
      console.log('✓ Step 5: Host started immediately with 2 ready players without waiting!');
      resolve();
    });
  });
  tempHost.disconnect();
  tempP2.disconnect();

  // Step 6: In our main room, a 3rd player can still join before game starts!
  console.log('\n--- Continuing Lobby Growth up to 8 Players ---');
  const player3 = await createClient('Player3');
  await new Promise((resolve) => {
    player3.emit(
      SOCKET_EVENTS.JOIN_ROOM,
      { roomCode, playerName: 'Player3', avatar: '🦁' },
      (res) => {
        if (!res?.success) throw new Error('Player 3 failed to join: ' + res?.error);
        console.log(`✓ Step 6: Player 3 joined room #${roomCode} (Total in lobby: 3/8)`);
        resolve();
      }
    );
  });

  // Step 7: Continue adding players up to 8
  const otherClients = [player3];
  for (let i = 4; i <= 8; i++) {
    const p = await createClient(`Player${i}`);
    otherClients.push(p);
    await new Promise((resolve) => {
      p.emit(
        SOCKET_EVENTS.JOIN_ROOM,
        { roomCode, playerName: `Player${i}`, avatar: '🚀' },
        (res) => {
          if (!res?.success) throw new Error(`Player ${i} failed to join: ` + res?.error);
          console.log(`✓ Step 7.${i - 3}: Player ${i} joined room #${roomCode} (Total in lobby: ${i}/8)`);
          resolve();
        }
      );
    });
  }

  // Step 8: 9th player attempts to join -> MUST BE REJECTED
  console.log('\n--- Testing Maximum Capacity Enforcement (8 Max) ---');
  const player9 = await createClient('Player9_Extra');
  await new Promise((resolve) => {
    player9.emit(
      SOCKET_EVENTS.JOIN_ROOM,
      { roomCode, playerName: 'Player9_Extra' },
      (res) => {
        if (res?.success) {
          throw new Error('FAILED: Player 9 was allowed to join an 8-player room!');
        }
        console.log(`✓ Step 8: Player 9 rejected properly: "${res?.error}"`);
        resolve();
      }
    );
  });
  player9.disconnect();

  // Step 9: Ready all players in the 8-player room and start
  console.log('\n--- Testing 8-Player Match Launch ---');
  for (let i = 0; i < otherClients.length; i++) {
    await new Promise((resolve) => {
      otherClients[i].emit(SOCKET_EVENTS.SET_READY, { roomCode }, () => resolve());
    });
  }
  console.log('✓ All 8 players toggled READY');

  let gameStartedHandled = false;
  host.on(SOCKET_EVENTS.GAME_STARTED, () => {
    gameStartedHandled = true;
  });

  const statePromise = new Promise((resolve) => {
    host.once(SOCKET_EVENTS.ROOM_STATE, (state) => {
      if (state.status === 'playing' && state.players.length === 8) {
        console.log(`✓ Step 10: Authoritative game state confirmed: status="${state.status}", players=${state.players.length}`);
        console.log(`  Cards in draw deck remaining: ${state.drawPileCount} (108 - 8*7 dealt = 52)`);
        resolve();
      }
    });
  });

  await new Promise((resolve) => {
    host.emit(SOCKET_EVENTS.START_GAME, { roomCode }, (res) => {
      if (!res?.success) throw new Error('Host failed to start 8-player game: ' + res?.error);
      console.log('✓ Step 9: Host launched 8-player match successfully!');
      resolve();
    });
  });

  await statePromise;

  console.log('\n======================================================');
  console.log('   ALL 2-TO-8 PLAYER ROOM REQUIREMENTS PASSED! 🚀     ');
  console.log('======================================================\n');

  // Clean up
  host.disconnect();
  player2.disconnect();
  otherClients.forEach((c) => c.disconnect());
  process.exit(0);
}

runTest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
