/**
 * Game Engine: Deck Operations
 * Foundation modules for Phase 1
 */

import { CARD_COLORS, CARD_VALUES, CARD_TYPES, INITIAL_HAND_SIZE } from '../../../shared/constants/cardConstants.js';

/**
 * Creates an UNO deck of 108 cards.
 * - 4 colors (Red, Blue, Green, Yellow):
 *   - One 0 per color (4)
 *   - Two of 1-9 per color (72)
 *   - Two Skips, Reverses, Draw Twos per color (24)
 * - 4 Wild cards (4)
 * - 4 Wild Draw Four cards (4)
 * Total = 108 cards
 * 
 * @returns {Array<Object>} Generated card objects
 */
export function createDeck() {
  const deck = [];
  let idCounter = 1;

  const standardColors = [CARD_COLORS.RED, CARD_COLORS.BLUE, CARD_COLORS.GREEN, CARD_COLORS.YELLOW];

  standardColors.forEach((color) => {
    // One 0 card per color
    deck.push({
      id: `card_${idCounter++}`,
      color,
      value: CARD_VALUES.ZERO,
      type: CARD_TYPES.NUMBER,
    });

    // Two 1-9 per color
    const numberValues = [
      CARD_VALUES.ONE,
      CARD_VALUES.TWO,
      CARD_VALUES.THREE,
      CARD_VALUES.FOUR,
      CARD_VALUES.FIVE,
      CARD_VALUES.SIX,
      CARD_VALUES.SEVEN,
      CARD_VALUES.EIGHT,
      CARD_VALUES.NINE,
    ];

    numberValues.forEach((val) => {
      deck.push({ id: `card_${idCounter++}`, color, value: val, type: CARD_TYPES.NUMBER });
      deck.push({ id: `card_${idCounter++}`, color, value: val, type: CARD_TYPES.NUMBER });
    });

    // Action cards: 2 Skips, 2 Reverses, 2 Draw Twos per color
    const actionValues = [CARD_VALUES.SKIP, CARD_VALUES.REVERSE, CARD_VALUES.DRAW_TWO];
    actionValues.forEach((val) => {
      deck.push({ id: `card_${idCounter++}`, color, value: val, type: CARD_TYPES.ACTION });
      deck.push({ id: `card_${idCounter++}`, color, value: val, type: CARD_TYPES.ACTION });
    });
  });

  // Wild cards: 4 Wild, 4 Wild Draw Four
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `card_${idCounter++}`,
      color: CARD_COLORS.WILD,
      value: CARD_VALUES.WILD,
      type: CARD_TYPES.WILD,
    });
    deck.push({
      id: `card_${idCounter++}`,
      color: CARD_COLORS.WILD,
      value: CARD_VALUES.WILD_DRAW_FOUR,
      type: CARD_TYPES.WILD,
    });
  }

  return deck;
}

/**
 * Shuffles an array of cards using the Fisher-Yates algorithm.
 * 
 * @param {Array<Object>} deck 
 * @returns {Array<Object>} Shuffled copy of deck
 */
export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deals cards to a list of players.
 * 
 * @param {Array<Object>} deck - The current draw deck
 * @param {Array<string>} playerIds - Array of player identifiers
 * @param {number} handSize - Number of cards per player (default 7)
 * @returns {{ hands: Record<string, Array<Object>>, remainingDeck: Array<Object> }}
 */
export function dealCards(deck, playerIds, handSize = INITIAL_HAND_SIZE) {
  const currentDeck = [...deck];
  const hands = {};

  playerIds.forEach((playerId) => {
    hands[playerId] = currentDeck.splice(0, handSize);
  });

  return {
    hands,
    remainingDeck: currentDeck,
  };
}

/**
 * Draws specified number of cards from the deck.
 * 
 * @param {Array<Object>} deck - Draw deck
 * @param {number} count - Number of cards to draw
 * @returns {{ drawnCards: Array<Object>, remainingDeck: Array<Object> }}
 */
export function drawCard(deck, count = 1) {
  const currentDeck = [...deck];
  const drawnCards = currentDeck.splice(0, count);
  return {
    drawnCards,
    remainingDeck: currentDeck,
  };
}

/**
 * Reshuffles discard pile into a new draw deck when draw pile runs low,
 * preserving the current top discard card.
 * 
 * @param {Array<Object>} discardPile 
 * @returns {{ newDeck: Array<Object>, newDiscardPile: Array<Object> }}
 */
export function reshuffleDiscard(discardPile) {
  if (!Array.isArray(discardPile) || discardPile.length <= 1) {
    return { newDeck: [], newDiscardPile: discardPile || [] };
  }
  const topCard = discardPile[discardPile.length - 1];
  const toReshuffle = discardPile.slice(0, discardPile.length - 1);
  const cleanedCards = toReshuffle.map((c) => {
    if (c.type === CARD_TYPES.WILD) {
      return { ...c, color: CARD_COLORS.WILD };
    }
    return c;
  });
  const newDeck = shuffleDeck(cleanedCards);
  return {
    newDeck,
    newDiscardPile: [topCard],
  };
}

