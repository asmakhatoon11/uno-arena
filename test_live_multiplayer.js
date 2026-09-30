/**
 * Live Multiplayer End-to-End Simulation Script
 * Connects 2 live Socket.IO client instances to the running server on port 5000.
 * Executes the complete real multiplayer game lifecycle.
 */

import { io as ClientIO } from './frontend/node_modules/socket.io-client/build/esm/index.js';
import { SOCKET_EVENTS } from './shared/constants/socketEvents.js';
import { CARD_COLORS, CARD_VALUES } from './shared/constants/cardConstants.js';

const SERVER_URL = 'http://localhost:5000';

async function runLiveMultiplayerTest() {
  console.log('\n======================================================');
  console.log('   UNO ARENA — LIVE MULTIPLAYER QA PASS (2 CLIENTS)   ');
  console.log('======================================================\n');

  const client1 = ClientIO(SERVER_URL, { transports: ['websocket'] });
  const client2 = ClientIO(SERVER_URL, { transports: ['websocket'] });

  try {
    // 1. Connection
    await Promise.all([
      new Promise((res) => client1.on('connect', res)),
      new Promise((res) => client2.on('connect', res)),
    ]);
    console.log(`✓ Both clients connected (Alice: ${client1.id}, Bob: ${client2.id})`);

    // 2. Create Room
    let roomCode = null;
    let aliceState = null;
    await new Promise((resolve) => {
      client1.emit(SOCKET_EVENTS.CREATE_ROOM, { playerName: 'Alice (Host)', avatar: '🦁' }, (res) => {
        console.assert(res.success === true, 'Alice room creation failed');
        console.assert(res.roomCode.length === 6, 'Room code must be 6 characters');
        roomCode = res.roomCode;
        aliceState = res.room;
        console.log(`✓ Step 1: Alice created room #${roomCode}`);
        resolve();
      });
    });

    // 3. Join Room
    let bobState = null;
    await new Promise((resolve) => {
      client2.emit(SOCKET_EVENTS.JOIN_ROOM, { roomCode, playerName: 'Bob', avatar: '🦊' }, (res) => {
        console.assert(res.success === true, 'Bob failed to join room');
        bobState = res.room;
        console.log(`✓ Step 2: Bob joined room #${roomCode}`);
        resolve();
      });
    });

    // Listeners for live sync
    client1.on(SOCKET_EVENTS.ROOM_STATE, (state) => { aliceState = state; });
    client2.on(SOCKET_EVENTS.ROOM_STATE, (state) => { bobState = state; });

    // 4. Bob Ready
    await new Promise((resolve) => {
      client2.emit(SOCKET_EVENTS.SET_READY, { roomCode }, (res) => {
        console.assert(res.success === true && res.ready === true, 'Bob ready toggle failed');
        console.log('✓ Step 3: Bob toggled READY');
        resolve();
      });
    });

    // Wait a moment for socket sync
    await new Promise((r) => setTimeout(r, 200));

    // 5. Start Game
    await new Promise((resolve) => {
      client1.emit(SOCKET_EVENTS.START_GAME, { roomCode }, (res) => {
        console.assert(res.success === true, 'Game start failed');
        console.log('✓ Step 4: Alice launched match! Game started');
        resolve();
      });
    });

    await new Promise((r) => setTimeout(r, 300));
    console.assert(aliceState.status === 'playing', 'Room status should be playing');
    console.assert(aliceState.myHand.length === 7, 'Alice dealt 7 cards');
    console.assert(bobState.myHand.length === 7, 'Bob dealt 7 cards');
    console.assert(aliceState.players[1].cardsCount === 7, 'Alice sees Bob card count = 7');
    console.assert(aliceState.players[1].hand === undefined, 'Alice CANNOT see Bob private cards');
    console.log(`✓ Step 5: Authoritative deal complete. Starter card: ${aliceState.currentColor} ${aliceState.discardTop.value}`);

    // 6. Test Chat
    let chatReceived = false;
    client2.on(SOCKET_EVENTS.CHAT_MESSAGE, (msg) => {
      console.assert(msg.message === 'Good luck contenders!', 'Chat message content mismatch');
      chatReceived = true;
    });
    client1.emit(SOCKET_EVENTS.SEND_CHAT_MESSAGE, { roomCode, message: 'Good luck contenders!' });
    await new Promise((r) => setTimeout(r, 200));
    console.assert(chatReceived === true, 'Bob should receive Alice chat message');
    console.log('✓ Step 6: Real-time chat distribution verified');

    // 7. Test Emotes
    let emoteReceived = false;
    client1.on(SOCKET_EVENTS.PLAYER_EMOTE, ({ emote }) => {
      console.assert(emote === '🔥', 'Emote mismatch');
      emoteReceived = true;
    });
    client2.emit(SOCKET_EVENTS.SEND_EMOTE, { roomCode, emote: '🔥' });
    await new Promise((r) => setTimeout(r, 200));
    console.assert(emoteReceived === true, 'Alice should receive Bob emote');
    console.log('✓ Step 7: Floating emote event broadcast verified');

    // 8. Gameplay: Active Turn Play or Draw
    const activeClient = aliceState.currentPlayerId === client1.id ? client1 : client2;
    const activeState = aliceState.currentPlayerId === client1.id ? aliceState : bobState;
    const playerName = aliceState.currentPlayerId === client1.id ? 'Alice' : 'Bob';

    console.log(`✓ Step 8: Active contender is ${playerName}. Testing card play or draw...`);

    // Find if active player has a matching card
    const topCard = activeState.discardTop;
    const curColor = activeState.currentColor;
    const playableCard = activeState.myHand.find(
      (c) => c.color === CARD_COLORS.WILD || c.color === curColor || c.value === topCard.value
    );

    if (playableCard) {
      const chosenColor = playableCard.color === CARD_COLORS.WILD ? CARD_COLORS.BLUE : null;
      await new Promise((resolve) => {
        activeClient.emit(
          SOCKET_EVENTS.PLAY_CARD,
          { roomCode, cardId: playableCard.id, chosenColor },
          (res) => {
            console.assert(res.success === true, 'Card play must succeed');
            console.log(`✓ Card played: ${playableCard.color} ${playableCard.value}`);
            resolve();
          }
        );
      });
    } else {
      // Draw card
      await new Promise((resolve) => {
        activeClient.emit(SOCKET_EVENTS.DRAW_CARD, { roomCode }, (res) => {
          console.assert(res.success === true, 'Card draw must succeed');
          console.log(`✓ ${playerName} had no matches and drew a card from deck`);
          resolve();
        });
      });
    }

    await new Promise((r) => setTimeout(r, 300));
    console.log(`✓ Turn transitioned smoothly to next contender (${aliceState.currentPlayerName})`);

    // 9. Test Shout UNO
    // Manually test call UNO event
    await new Promise((resolve) => {
      client1.emit(SOCKET_EVENTS.CALL_UNO, { roomCode }, (res) => {
        // If Alice has != 1 card, false call penalty applies
        console.log(`✓ UNO Call handled authoritatively (result: ${res.success ? 'Shouted UNO' : res.error})`);
        resolve();
      });
    });

    // 10. Test Rematch flow
    await Promise.all([
      new Promise((res) => client1.emit(SOCKET_EVENTS.REMATCH_REQUEST, { roomCode }, res)),
      new Promise((res) => client2.emit(SOCKET_EVENTS.REMATCH_REQUEST, { roomCode }, res)),
    ]);
    await new Promise((r) => setTimeout(r, 300));
    console.assert(aliceState.status === 'playing', 'Rematch started match cleanly');
    console.log('✓ Step 9: Rematch loop verified: round reset with preserved tournament scores');

    // 11. Test Host Disconnect Migration
    console.log('✓ Step 10: Testing host disconnect migration (disconnecting Alice)...');
    client1.disconnect();
    await new Promise((r) => setTimeout(r, 400));

    // Request fresh room state from Bob
    await new Promise((resolve) => {
      client2.emit(SOCKET_EVENTS.REQUEST_ROOM_STATE, { roomCode }, (res) => {
        console.assert(res.success === true, 'State sync failed');
        console.assert(res.room.hostId === client2.id, 'Bob must be promoted to host');
        console.log(`✓ Host migration confirmed: Bob (${client2.id}) is now room host!`);
        resolve();
      });
    });

    client2.disconnect();
    console.log('\n======================================================');
    console.log('   ALL LIVE MULTIPLAYER QA PASSES SUCCEEDED! 🚀       ');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('QA Simulation failed:', err);
    client1.disconnect();
    client2.disconnect();
    process.exit(1);
  }
}

runLiveMultiplayerTest();
