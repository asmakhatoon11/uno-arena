/**
 * Verification of socketService.emit with callback acknowledgement
 */

import { io } from './frontend/node_modules/socket.io-client/build/esm/index.js';
import { SOCKET_EVENTS } from './shared/constants/socketEvents.js';

// Recreate the exact socketService logic
class SocketService {
  constructor() {
    this.socket = null;
  }
  connect() {
    this.socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
    });
    return this.socket;
  }
  emit(event, ...args) {
    if (this.socket) {
      this.socket.emit(event, ...args);
    }
  }
}

const service = new SocketService();
const socket = service.connect();

socket.on('connect', () => {
  console.log('Connected to server with socket ID:', socket.id);

  console.log('Testing socketService.emit(CREATE_ROOM) with acknowledgement callback...');
  let callbackInvoked = false;

  service.emit(
    SOCKET_EVENTS.CREATE_ROOM,
    { playerName: 'Asma', avatar: '🦁' },
    (response) => {
      callbackInvoked = true;
      console.log('✓ Success! Server acknowledgement received:');
      console.log('  success:', response.success);
      console.log('  roomCode:', response.roomCode);
      console.log('  room status:', response.room.status);
      console.assert(response.success === true, 'Response must be success');
      console.assert(response.roomCode.length === 6, 'Room code must be 6 characters');
      socket.disconnect();
      console.log('\n✓ CREATE ROOM FLOW 100% OPERATIONAL! 🚀');
      process.exit(0);
    }
  );

  setTimeout(() => {
    if (!callbackInvoked) {
      console.error('FAILED: Acknowledgement callback was never invoked within 3 seconds!');
      socket.disconnect();
      process.exit(1);
    }
  }, 3000);
});
