/**
 * Game Engine: Rules & Turn Logic
 * Authoritative UNO mechanics for Phase 3
 */

import {
  CARD_COLORS,
  CARD_VALUES,
  CARD_TYPES,
  INITIAL_HAND_SIZE,
} from '../../../shared/constants/cardConstants.js';
import { createDeck, shuffleDeck, dealCards, reshuffleDiscard } from './deck.js';

/**
 * Checks if a played card is a valid move against the top discard card.
 * 
 * @param {Object} cardToPlay - Card the player wants to put down
 * @param {Object} topDiscardCard - The active card on the discard pile
 * @param {string|null} activeColor - Current active color in room
 * @returns {boolean} True if the card can legally be played
 */
export function isValidMove(cardToPlay, topDiscardCard, activeColor = null) {
  if (!cardToPlay || !topDiscardCard) return false;

  // Wild and Wild Draw Four can always be played
  if (cardToPlay.color === CARD_COLORS.WILD) {
    return true;
  }

  // Active color takes precedence (e.g. from previous Wild card)
  const currentColor = activeColor || topDiscardCard.color;

  // Match by color or value/symbol
  return cardToPlay.color === currentColor || cardToPlay.value === topDiscardCard.value;
}

/**
 * Calculates the next turn index considering direction and step size.
 * Handles negative modulo wrapping cleanly.
 * 
 * @param {number} currentIndex 
 * @param {number} playerCount 
 * @param {number} direction - 1 for clockwise, -1 for counter-clockwise
 * @param {number} step - Step size (1 = standard next, 2 = skip)
 * @returns {number} Next player's turn index
 */
export function nextTurn(currentIndex, playerCount, direction = 1, step = 1) {
  if (playerCount <= 0) return 0;
  const rawNext = (currentIndex + direction * step) % playerCount;
  return rawNext >= 0 ? rawNext : rawNext + playerCount;
}

/**
 * Checks if a player has won the game (0 cards remaining).
 * 
 * @param {Array<Object>} playerHand 
 * @returns {boolean} True if the hand is empty
 */
export function checkWinner(playerHand) {
  return Array.isArray(playerHand) && playerHand.length === 0;
}

/**
 * Executes a basic card play from a player's hand.
 * Transfers card from hand to top of discard pile.
 * 
 * @param {Array<Object>} playerHand 
 * @param {string} cardId 
 * @param {Array<Object>} discardPile 
 * @returns {{ updatedHand: Array<Object>, updatedDiscardPile: Array<Object>, playedCard: Object|null }}
 */
export function playCard(playerHand, cardId, discardPile) {
  const cardIndex = playerHand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    return { updatedHand: playerHand, updatedDiscardPile: discardPile, playedCard: null };
  }

  const playedCard = playerHand[cardIndex];
  const updatedHand = [...playerHand.slice(0, cardIndex), ...playerHand.slice(cardIndex + 1)];
  const updatedDiscardPile = [...discardPile, playedCard];

  return {
    updatedHand,
    updatedDiscardPile,
    playedCard,
  };
}

/**
 * Initializes and launches a match for a room.
 * Authoritative: deals hands, creates starter discard, sets color & direction.
 * 
 * @param {Object} room 
 * @returns {Object} Updated room object
 */
export function initializeGame(room) {
  const deck = shuffleDeck(createDeck());
  const playerIds = room.players.map((p) => p.id);
  const { hands, remainingDeck } = dealCards(deck, playerIds, INITIAL_HAND_SIZE);

  // Assign hands and reset per-round state
  room.players.forEach((player) => {
    player.hand = hands[player.id] || [];
    player.calledUno = false;
  });

  // Find a starter card for discard pile that is NOT a wild
  let drawDeck = [...remainingDeck];
  let starterIndex = drawDeck.findIndex((c) => c.color !== CARD_COLORS.WILD);
  if (starterIndex === -1) starterIndex = 0;

  const starterCard = drawDeck.splice(starterIndex, 1)[0];

  room.deck = drawDeck;
  room.discardPile = [starterCard];
  room.currentColor = starterCard.color;
  room.direction = 1; // Clockwise
  room.currentPlayerIndex = 0;
  room.status = 'playing';
  room.winner = null;
  room.gameLog = [
    {
      text: `Battle launched! First card is ${starterCard.color.toUpperCase()} ${starterCard.value.toUpperCase()}.`,
      type: 'start',
      timestamp: Date.now(),
    },
  ];

  return room;
}

/**
 * Safely draws cards from room deck, auto-reshuffling discard pile if deck runs out.
 * 
 * @param {Object} room 
 * @param {number} count 
 * @returns {Array<Object>} Drawn cards
 */
export function drawCardsFromRoomDeck(room, count = 1) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (room.deck.length === 0) {
      if (room.discardPile.length > 1) {
        const { newDeck, newDiscardPile } = reshuffleDiscard(room.discardPile);
        room.deck = newDeck;
        room.discardPile = newDiscardPile;
      } else {
        // No cards left to draw at all
        break;
      }
    }
    if (room.deck.length > 0) {
      drawn.push(room.deck.shift());
    }
  }
  return drawn;
}

/**
 * Applies full authoritative rules for a card play.
 * Validates ownership, move legality, color selection, action effects, and turn advance.
 * 
 * @param {Object} room 
 * @param {string} playerId 
 * @param {string} cardId 
 * @param {string|null} chosenColor 
 * @returns {{ success: boolean, error?: string, playedCard?: Object, nextPlayer?: Object, specialAction?: string }}
 */
export function executeCardPlay(room, playerId, cardId, chosenColor = null) {
  if (room.status !== 'playing') {
    return { success: false, error: 'Match is not currently in progress.' };
  }

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) {
    return { success: false, error: 'It is not your turn.' };
  }

  const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    return { success: false, error: 'Card not found in your hand.' };
  }

  const cardToPlay = currentPlayer.hand[cardIndex];
  const topDiscard = room.discardPile[room.discardPile.length - 1];

  if (!isValidMove(cardToPlay, topDiscard, room.currentColor)) {
    return { success: false, error: 'Illegal move: Card must match active color or number.' };
  }

  // Validate chosenColor for wild cards
  if (cardToPlay.color === CARD_COLORS.WILD) {
    const validColors = [CARD_COLORS.RED, CARD_COLORS.BLUE, CARD_COLORS.GREEN, CARD_COLORS.YELLOW];
    if (!chosenColor || !validColors.includes(chosenColor.toLowerCase())) {
      return { success: false, error: 'Must choose a valid color (Red, Blue, Green, Yellow) for Wild cards.' };
    }
  }

  // Remove card from player hand
  currentPlayer.hand.splice(cardIndex, 1);
  room.discardPile.push(cardToPlay);

  // Set new active color
  if (cardToPlay.color === CARD_COLORS.WILD) {
    room.currentColor = chosenColor.toLowerCase();
  } else {
    room.currentColor = cardToPlay.color;
  }

  let specialAction = null;
  let turnStep = 1;
  const playerCount = room.players.length;

  // Process Action Card Effects
  if (cardToPlay.value === CARD_VALUES.SKIP) {
    specialAction = 'SKIP';
    turnStep = 2; // Skips next player
  } else if (cardToPlay.value === CARD_VALUES.REVERSE) {
    specialAction = 'REVERSE';
    if (playerCount === 2) {
      // Official 2-player rule: Reverse acts like a Skip!
      turnStep = 2;
    } else {
      room.direction *= -1; // Invert direction
      turnStep = 1;
    }
  } else if (cardToPlay.value === CARD_VALUES.DRAW_TWO) {
    specialAction = 'DRAW_TWO';
    // Calculate targeted victim
    const victimIndex = nextTurn(room.currentPlayerIndex, playerCount, room.direction, 1);
    const victim = room.players[victimIndex];
    const penaltyCards = drawCardsFromRoomDeck(room, 2);
    victim.hand.push(...penaltyCards);
    victim.calledUno = false; // Reset UNO if they now have >1 card
    turnStep = 2; // Next player misses their turn
  } else if (cardToPlay.value === CARD_VALUES.WILD) {
    specialAction = 'WILD';
    turnStep = 1;
  } else if (cardToPlay.value === CARD_VALUES.WILD_DRAW_FOUR) {
    specialAction = 'WILD_DRAW_FOUR';
    // Calculate targeted victim
    const victimIndex = nextTurn(room.currentPlayerIndex, playerCount, room.direction, 1);
    const victim = room.players[victimIndex];
    const penaltyCards = drawCardsFromRoomDeck(room, 4);
    victim.hand.push(...penaltyCards);
    victim.calledUno = false;
    turnStep = 2; // Next player misses their turn
  }

  // Log action
  const colorLabel = cardToPlay.color === CARD_COLORS.WILD ? room.currentColor : cardToPlay.color;
  room.gameLog.push({
    text: `${currentPlayer.name} played ${colorLabel.toUpperCase()} ${cardToPlay.value.toUpperCase()}${
      specialAction ? ` (${specialAction})` : ''
    }`,
    type: 'play',
    playerId: currentPlayer.id,
    timestamp: Date.now(),
  });

  // Check if player won
  const isWinner = checkWinner(currentPlayer.hand);
  if (isWinner) {
    room.status = 'finished';
    room.winner = {
      id: currentPlayer.id,
      name: currentPlayer.name,
      avatar: currentPlayer.avatar,
    };
    room.gameLog.push({
      text: `🏆 ${currentPlayer.name} emptied their hand and won the round!`,
      type: 'winner',
      timestamp: Date.now(),
    });
    return {
      success: true,
      playedCard: cardToPlay,
      isWinner: true,
      specialAction,
    };
  }

  // Advance turn
  room.currentPlayerIndex = nextTurn(room.currentPlayerIndex, playerCount, room.direction, turnStep);
  const nextPlayer = room.players[room.currentPlayerIndex];

  return {
    success: true,
    playedCard: cardToPlay,
    nextPlayer,
    specialAction,
    isWinner: false,
  };
}

/**
 * Authoritative Draw Turn execution.
 * Player draws 1 card, and turn advances to the next player.
 * 
 * @param {Object} room 
 * @param {string} playerId 
 * @returns {{ success: boolean, error?: string, drawnCard?: Object, nextPlayer?: Object }}
 */
export function executePlayerDraw(room, playerId) {
  if (room.status !== 'playing') {
    return { success: false, error: 'Match is not in progress.' };
  }

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) {
    return { success: false, error: 'It is not your turn to draw.' };
  }

  const drawn = drawCardsFromRoomDeck(room, 1);
  if (drawn.length > 0) {
    currentPlayer.hand.push(drawn[0]);
    // If player had 1 card and drew, reset calledUno
    if (currentPlayer.hand.length > 1) {
      currentPlayer.calledUno = false;
    }
  }

  room.gameLog.push({
    text: `${currentPlayer.name} drew a card from the deck`,
    type: 'draw',
    playerId: currentPlayer.id,
    timestamp: Date.now(),
  });

  // Advance turn to next player
  room.currentPlayerIndex = nextTurn(room.currentPlayerIndex, room.players.length, room.direction, 1);
  const nextPlayer = room.players[room.currentPlayerIndex];

  return {
    success: true,
    drawnCard: drawn[0] || null,
    nextPlayer,
  };
}
