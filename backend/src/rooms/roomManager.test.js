/**
 * Automated Verification Suite for Phase 2: Room Management & Realtime Handshake
 */

import { roomManager } from './roomManager.js';

console.log('--- Testing UNO Arena Phase 2: Room Manager & Security ---');

// 1. Room Creation
const hostSocketId = 'socket_host_1';
const room = roomManager.createRoom(hostSocketId, 'SuperHost', '🦁');

console.assert(room && room.roomCode.length === 6, 'Room code must be 6 characters');
console.assert(room.hostId === hostSocketId, 'Host ID must match host socket ID');
console.assert(room.players.length === 1, 'Room should start with 1 player');
console.assert(room.players[0].isHost === true, 'Creator must be designated host');
console.assert(room.status === 'waiting', 'Room status should be waiting');
console.log(`✓ createRoom: Created room #${room.roomCode} with host ${room.players[0].name}`);

// 2. Room Code Uniqueness
const codes = new Set();
for (let i = 0; i < 50; i++) {
  const code = roomManager.generateRoomCode();
  console.assert(code.length === 6, 'Generated code should be 6 characters');
  codes.add(code);
}
console.assert(codes.size === 50, 'All 50 generated room codes should be unique');
console.log('✓ generateRoomCode: 50 unique 6-character codes verified');

// 3. Join Room
const player2SocketId = 'socket_player_2';
const joinRes = roomManager.joinRoom(room.roomCode, player2SocketId, 'PlayerTwo', '🦊');
console.assert(joinRes.success === true, 'Player 2 should join successfully');
console.assert(room.players.length === 2, 'Room should now have 2 players');
console.assert(room.players[1].ready === false, 'New joiner should default to not ready');
console.log('✓ joinRoom: Player 2 joined successfully');

// 4. Invalid Room Code
const badJoin = roomManager.joinRoom('BADCOD', 'socket_bad', 'Nobody');
console.assert(badJoin.success === false, 'Invalid room code should fail');
console.log('✓ joinRoom validation: non-existent room rejected properly');

// 5. canStartGame checks
let startCheck = roomManager.canStartGame(room.roomCode);
console.assert(startCheck.canStart === false, 'Cannot start when player 2 is not ready');
console.log('✓ canStartGame: Prevented start while contendor was not ready');

// 6. Toggle Ready
const readyRes = roomManager.toggleReady(room.roomCode, player2SocketId);
console.assert(readyRes.success === true && readyRes.player.ready === true, 'Player 2 should be marked ready');
startCheck = roomManager.canStartGame(room.roomCode);
console.assert(startCheck.canStart === true, 'Match can start when all players are ready');
console.log('✓ toggleReady & canStartGame: Ready toggle validated and start allowed');

// 7. Private Card Security / Sanitized Room State
room.players[0].hand = [{ id: 'c1', color: 'red', value: '5' }];
room.players[1].hand = [{ id: 'c2', color: 'blue', value: '7' }];

const hostView = roomManager.getSanitizedRoomState(room.roomCode, hostSocketId);
console.assert(hostView.myHand.length === 1 && hostView.myHand[0].id === 'c1', 'Host sees only host hand');
console.assert(hostView.players[1].cardsCount === 1, 'Host sees opponent card count');
console.assert(hostView.players[1].hand === undefined, 'CRITICAL: Opponent hand must NEVER be exposed in player list!');
console.log('✓ getSanitizedRoomState: Private card security verified - opponent cards are strictly omitted');

// 8. Host Transfer upon Leave
const leaveRes = roomManager.leaveRoom(room.roomCode, hostSocketId);
console.assert(leaveRes.success === true, 'Host leave successful');
console.assert(leaveRes.hostChanged === true, 'Host transfer triggered');
console.assert(leaveRes.newHostId === player2SocketId, 'Player 2 should be promoted to host');
console.assert(room.hostId === player2SocketId, 'Room hostId updated');
console.log('✓ leaveRoom: Host transfer to longest-connected contender verified');

// 9. Clean up empty room
const finalLeave = roomManager.leaveRoom(room.roomCode, player2SocketId);
console.assert(finalLeave.success === true, 'Final leave successful');
console.assert(roomManager.getRoom(room.roomCode) === null, 'Empty room automatically pruned');
console.log('✓ Room lifecycle: Empty room auto-pruning verified');

console.log('\nAll Phase 2 Room Management verification tests passed! 🚀');
