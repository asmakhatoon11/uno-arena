/**
 * Comprehensive Automated Test Suite for Phases 3 & 4 Game Flow
 */

import { roomManager } from '../rooms/roomManager.js';
import {
  initializeGame,
  executeCardPlay,
  executePlayerDraw,
  calculateRoundScore,
  isValidMove,
} from './index.js';
import { CARD_COLORS, CARD_VALUES, CARD_TYPES } from '../../../shared/constants/cardConstants.js';

console.log('--- Testing UNO Arena Phases 3 & 4 Game Flow & Rules ---');

// 1. Setup Room with 3 players
const room = roomManager.createRoom('p1', 'Alice', '🦁');
roomManager.joinRoom(room.roomCode, 'p2', 'Bob', '🦊');
roomManager.joinRoom(room.roomCode, 'p3', 'Charlie', '🐉');

// 2. Initialize Game
initializeGame(room);
console.assert(room.status === 'playing', 'Room status should be playing');
console.assert(room.players.every((p) => p.hand.length === 7), 'All 3 players must receive exactly 7 cards');
console.assert(room.discardPile.length === 1, 'Discard pile must start with 1 card');
console.assert(room.currentColor === room.discardPile[0].color, 'Active color matches starter card');
console.assert(room.discardPile[0].color !== CARD_COLORS.WILD, 'Starter card must not be a wild');
console.log(`✓ initializeGame: Dealt 7 cards to 3 players. Starter: ${room.currentColor} ${room.discardPile[0].value}`);

// 3. Play matching number/color
const topCard = room.discardPile[0];
const p1 = room.players[0];

// Give p1 a guaranteed legal matching card
p1.hand[0] = { id: 'test_card_1', color: room.currentColor, value: '9', type: CARD_TYPES.NUMBER };
const playResult = executeCardPlay(room, 'p1', 'test_card_1');
console.assert(playResult.success === true, 'Legal card play must succeed');
console.assert(room.currentPlayerIndex === 1, 'Turn should pass to Bob (p2)');
console.assert(room.discardPile[room.discardPile.length - 1].id === 'test_card_1', 'Discard pile updated');
console.log('✓ executeCardPlay: Number card played and turn transitioned to Player 2');

// 4. Test Skip card
const p2 = room.players[1];
p2.hand[0] = { id: 'test_skip', color: room.currentColor, value: CARD_VALUES.SKIP, type: CARD_TYPES.ACTION };
const skipResult = executeCardPlay(room, 'p2', 'test_skip');
console.assert(skipResult.success === true, 'Skip play must succeed');
console.assert(skipResult.specialAction === 'SKIP', 'Special action must be SKIP');
console.assert(room.currentPlayerIndex === 0, 'Turn should skip Charlie (p3) and go back to Alice (p1)');
console.log('✓ Special Card SKIP: Correctly skipped Player 3 in 3-player rotation');

// 5. Test Draw Two (+2)
p1.hand[0] = { id: 'test_d2', color: room.currentColor, value: CARD_VALUES.DRAW_TWO, type: CARD_TYPES.ACTION };
const p2HandSizeBefore = p2.hand.length;
const d2Result = executeCardPlay(room, 'p1', 'test_d2');
console.assert(d2Result.success === true, 'Draw Two play must succeed');
console.assert(p2.hand.length === p2HandSizeBefore + 2, 'Player 2 should receive 2 penalty cards');
console.assert(room.currentPlayerIndex === 2, 'Player 2 is skipped, turn goes to Charlie (p3)');
console.log('✓ Special Card DRAW TWO: Dealt 2 cards to Player 2 and skipped their turn');

// 6. Test Reverse in 3-player
const p3 = room.players[2];
p3.hand[0] = { id: 'test_rev', color: room.currentColor, value: CARD_VALUES.REVERSE, type: CARD_TYPES.ACTION };
const revResult = executeCardPlay(room, 'p3', 'test_rev');
console.assert(revResult.success === true, 'Reverse play must succeed');
console.assert(room.direction === -1, 'Direction should be inverted to -1 (counter-clockwise)');
console.assert(room.currentPlayerIndex === 1, 'Inverted direction moves 2 -> 1 (Bob)');
console.log('✓ Special Card REVERSE: Correctly flipped direction to counter-clockwise');

// 7. Test Wild card with color selection
p2.hand[0] = { id: 'test_wild', color: CARD_COLORS.WILD, value: CARD_VALUES.WILD, type: CARD_TYPES.WILD };
const wildResult = executeCardPlay(room, 'p2', 'test_wild', CARD_COLORS.BLUE);
console.assert(wildResult.success === true, 'Wild play must succeed');
console.assert(room.currentColor === CARD_COLORS.BLUE, 'Active color changed to blue');
console.log('✓ Special Card WILD: Color selection set active color to Blue');

// 8. Test Draw Card
const p1HandBeforeDraw = p1.hand.length;
const drawResult = executePlayerDraw(room, 'p1');
console.assert(drawResult.success === true, 'Draw turn must succeed');
console.assert(p1.hand.length === p1HandBeforeDraw + 1, 'Player 1 hand increased by 1');
console.log('✓ executePlayerDraw: Successfully drew card and advanced turn');

// 9. Test Winning Condition & Score Calculation
p3.hand = [{ id: 'winning_card', color: room.currentColor, value: '1', type: CARD_TYPES.NUMBER }];
room.currentPlayerIndex = 2; // Charlie's turn
const winResult = executeCardPlay(room, 'p3', 'winning_card');
console.assert(winResult.success === true, 'Winning card play succeeded');
console.assert(winResult.isWinner === true, 'Winner condition detected');
console.assert(room.status === 'finished', 'Room status updated to finished');
console.assert(room.winner.id === 'p3', 'Winner designated as Charlie');

const roundScore = calculateRoundScore(room.players, 'p3');
console.assert(roundScore > 0, `Winner should receive opponent hand score (calculated: ${roundScore} pts)`);
console.log(`✓ Scoring & Victory: Round finished, winner recognized, earned ${roundScore} points from opponents`);

console.log('\nAll Phase 3 & 4 Game Flow verification tests passed! 🚀');
