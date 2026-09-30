/**
 * Game Engine: Scoring Module
 * Standard UNO tournament scoring
 */

import { CARD_SCORES } from '../../../shared/constants/cardConstants.js';

/**
 * Calculates score for a collection of cards remaining in opponents' hands.
 * Standard UNO scoring:
 * - Number cards (0-9): Face value
 * - Action cards (Skip, Reverse, Draw Two): 20 points
 * - Wild / Wild Draw Four: 50 points
 * 
 * @param {Array<Object>} cards 
 * @returns {number} Total score
 */
export function calculateScore(cards = []) {
  if (!Array.isArray(cards)) return 0;
  return cards.reduce((total, card) => {
    const val = card?.value?.toString().toLowerCase();
    const points = CARD_SCORES[val] !== undefined ? CARD_SCORES[val] : 0;
    return total + points;
  }, 0);
}

/**
 * Calculates the winner's points earned from all opponent hands combined.
 * 
 * @param {Array<Object>} players 
 * @param {string} winnerId 
 * @returns {number} Total round points awarded to winner
 */
export function calculateRoundScore(players = [], winnerId) {
  let roundPoints = 0;
  players.forEach((player) => {
    if (player.id !== winnerId && Array.isArray(player.hand)) {
      roundPoints += calculateScore(player.hand);
    }
  });
  return roundPoints;
}
