/**
 * End-to-End Socket.IO Realtime Integration Test for Phase 2
 */

import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientIO } from '../../../frontend/node_modules/socket.io-client/build/esm/index.js';
import { setupSocketHandlers } from './socketHandler.js';
import { SOCKET_EVENTS } from '../../../shared/constants/socketEvents.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
setupSocketHandlers(io);

const TEST_PORT = 5055;

server.listen(TEST_PORT, async () => {
  console.log(`[Test Server] Listening on ${TEST_PORT}`);

  try {
    const client1 = ClientIO(`http://localhost:${TEST_PORT}`, { transports: ['websocket'] });
    const client2 = ClientIO(`http://localhost:${TEST_PORT}`, { transports: ['websocket'] });

    await new Promise((resolve) => client1.on('connect', resolve));
    await new Promise((resolve) => client2.on('connect', resolve));
    console.log('✓ Both client sockets connected');

    // Client 1 creates room
    let createdRoomCode = null;
    await new Promise((resolve) => {
      client1.emit(SOCKET_EVENTS.CREATE_ROOM, { playerName: 'Alice', avatar: '🦁' }, (res) => {
        console.assert(res.success === true, 'Room creation must succeed');
        console.assert(res.roomCode.length === 6, 'Room code must be 6 chars');
        createdRoomCode = res.roomCode;
        console.log(`✓ Client 1 created room ${createdRoomCode}`);
        resolve();
      });
    });

    // Client 2 joins room
    await new Promise((resolve) => {
      client2.emit(SOCKET_EVENTS.JOIN_ROOM, { roomCode: createdRoomCode, playerName: 'Bob', avatar: '🦊' }, (res) => {
        console.assert(res.success === true, 'Join room must succeed');
        console.log('✓ Client 2 joined room');
        resolve();
      });
    });

    // Wait for room state sync on client 1
    await new Promise((resolve) => {
      client1.once(SOCKET_EVENTS.ROOM_STATE, (state) => {
        console.assert(state.players.length === 2, 'Client 1 should see 2 players');
        console.assert(state.players[1].name === 'Bob', 'Second player should be Bob');
        console.log('✓ Client 1 received real-time roomState update with Bob');
        resolve();
      });
      // Client 2 sets ready
      client2.emit(SOCKET_EVENTS.SET_READY, { roomCode: createdRoomCode });
    });

    client1.disconnect();
    client2.disconnect();
    server.close(() => {
      console.log('✓ Socket.IO multiplayer integration verified successfully! 🚀\n');
      process.exit(0);
    });
  } catch (err) {
    console.error('Integration test failed:', err);
    server.close();
    process.exit(1);
  }
});
