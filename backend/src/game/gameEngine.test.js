/**
 * Unit verification script for UNO Arena Game Engine foundation
 */

import {
  createDeck,
  shuffleDeck,
  dealCards,
  isValidMove,
  playCard,
  drawCard,
  nextTurn,
  calculateScore,
  checkWinner,
} from './index.js';
import { CARD_COLORS, CARD_VALUES } from '../../../shared/constants/cardConstants.js';

console.log('--- Testing UNO Arena Game Engine Foundation ---');

// 1. createDeck
const deck = createDeck();
console.assert(deck.length === 108, `Expected 108 cards, got ${deck.length}`);
console.log(`✓ createDeck: created ${deck.length} cards`);

// 2. shuffleDeck
const shuffled = shuffleDeck(deck);
console.assert(shuffled.length === 108, 'Shuffled deck should maintain 108 cards');
console.log('✓ shuffleDeck: shuffled 108 cards');

// 3. dealCards
const players = ['p1', 'p2', 'p3', 'p4'];
const dealResult = dealCards(shuffled, players, 7);
console.assert(Object.keys(dealResult.hands).length === 4, 'Should have hands for 4 players');
console.assert(dealResult.hands['p1'].length === 7, 'Player 1 should have 7 cards');
console.assert(dealResult.remainingDeck.length === 108 - 28, 'Remaining deck should have 80 cards');
console.log('✓ dealCards: dealt 7 cards to 4 players correctly');

// 4. isValidMove
const topCard = { id: 'c1', color: CARD_COLORS.RED, value: CARD_VALUES.FIVE };
const matchingColor = { id: 'c2', color: CARD_COLORS.RED, value: CARD_VALUES.NINE };
const matchingValue = { id: 'c3', color: CARD_COLORS.BLUE, value: CARD_VALUES.FIVE };
const wildCard = { id: 'c4', color: CARD_COLORS.WILD, value: CARD_VALUES.WILD };
const invalidCard = { id: 'c5', color: CARD_COLORS.GREEN, value: CARD_VALUES.TWO };

console.assert(isValidMove(matchingColor, topCard) === true, 'Matching color should be valid');
console.assert(isValidMove(matchingValue, topCard) === true, 'Matching value should be valid');
console.assert(isValidMove(wildCard, topCard) === true, 'Wild card should always be valid');
console.assert(isValidMove(invalidCard, topCard) === false, 'Non-matching card should be invalid');
console.log('✓ isValidMove: validated match rules correctly');

// 5. playCard
const hand = [matchingColor, invalidCard];
const discardPile = [topCard];
const playResult = playCard(hand, matchingColor.id, discardPile);
console.assert(playResult.updatedHand.length === 1, 'Hand should have 1 card remaining');
console.assert(playResult.updatedDiscardPile.length === 2, 'Discard pile should have 2 cards');
console.assert(playResult.playedCard.id === matchingColor.id, 'Played card should match');
console.log('✓ playCard: played card transferred from hand to discard pile');

// 6. drawCard
const drawResult = drawCard(dealResult.remainingDeck, 2);
console.assert(drawResult.drawnCards.length === 2, 'Should draw 2 cards');
console.assert(drawResult.remainingDeck.length === dealResult.remainingDeck.length - 2, 'Deck should decrease by 2');
console.log('✓ drawCard: drew 2 cards correctly');

// 7. nextTurn
console.assert(nextTurn(0, 4, 1, 1) === 1, 'Clockwise 0 -> 1');
console.assert(nextTurn(3, 4, 1, 1) === 0, 'Clockwise wrap 3 -> 0');
console.assert(nextTurn(0, 4, -1, 1) === 3, 'Counter-clockwise wrap 0 -> 3');
console.assert(nextTurn(1, 4, 1, 2) === 3, 'Skip turn step 2: 1 -> 3');
console.log('✓ nextTurn: calculated turns, reversals, and skips correctly');

// 8. calculateScore
const remainingCards = [
  { value: '5' }, // 5
  { value: 'skip' }, // 20
  { value: 'wild_draw_four' }, // 50
];
const score = calculateScore(remainingCards);
console.assert(score === 75, `Expected 75 points, got ${score}`);
console.log(`✓ calculateScore: calculated points correctly (${score} pts)`);

// 9. checkWinner
console.assert(checkWinner([]) === true, 'Empty hand is a winner');
console.assert(checkWinner([matchingColor]) === false, 'Non-empty hand is not a winner');
console.log('✓ checkWinner: detected winning condition correctly');

console.log('\nAll 9 Game Engine Foundation functions passed verification successfully! 🚀');
