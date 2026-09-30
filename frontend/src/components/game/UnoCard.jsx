import React from 'react';
import { CARD_COLORS, CARD_VALUES } from '../../shared/constants/cardConstants.js';
import { soundManager } from '../../services/soundManager';
import './UnoCard.css';

/**
 * Maps card values to user-facing display symbols
 * @param {string} value 
 * @returns {string}
 */
export function getCardSymbol(value) {
  switch (value) {
    case CARD_VALUES.SKIP:
      return '⊘';
    case CARD_VALUES.REVERSE:
      return '⇄';
    case CARD_VALUES.DRAW_TWO:
      return '+2';
    case CARD_VALUES.WILD:
      return '★';
    case CARD_VALUES.WILD_DRAW_FOUR:
      return '+4';
    default:
      return value != null ? String(value) : '';
  }
}

/**
 * Gets a clean text label for the card (e.g., "SKIP", "REVERSE", "+2", "WILD")
 * @param {string} value 
 * @returns {string}
 */
export function getCardLabel(value) {
  switch (value) {
    case CARD_VALUES.SKIP:
      return 'SKIP';
    case CARD_VALUES.REVERSE:
      return 'REVERSE';
    case CARD_VALUES.DRAW_TWO:
      return '+2 CARDS';
    case CARD_VALUES.WILD:
      return 'WILD';
    case CARD_VALUES.WILD_DRAW_FOUR:
      return 'WILD +4';
    default:
      return '';
  }
}

/**
 * UnoCard Component
 * Renders an individual game playing card with micro-interactions,
 * playable indicators, newly-drawn highlights, and custom size variations.
 * 
 * @param {{
 *   card?: Object,
 *   isPlayable?: boolean,
 *   isSelected?: boolean,
 *   isFaceDown?: boolean,
 *   isNewlyDrawn?: boolean,
 *   isInvalidAttempt?: boolean,
 *   size?: 'sm' | 'md' | 'lg',
 *   onClick?: (card: Object) => void,
 *   onMouseEnter?: () => void,
 *   className?: string,
 *   style?: Object,
 * }} props
 */
export function UnoCard({
  card,
  isPlayable = false,
  isSelected = false,
  isFaceDown = false,
  isNewlyDrawn = false,
  isInvalidAttempt = false,
  size = 'md',
  onClick,
  onMouseEnter,
  className = '',
  style = {},
}) {
  if (isFaceDown || !card) {
    const handleFaceDownKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (onClick) onClick(e);
      }
    };

    return (
      <div
        className={`uno-card face-down size-${size} ${className}`}
        onClick={onClick}
        onKeyDown={onClick ? handleFaceDownKeyDown : undefined}
        onMouseEnter={() => {
          if (onClick) soundManager.cardHover();
          onMouseEnter?.();
        }}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label="Draw Deck Card"
        style={style}
      >
        <div className="card-back-badge">UNO</div>
      </div>
    );
  }

  const colorClass = `color-${card.color || CARD_COLORS.WILD}`;
  const symbol = getCardSymbol(card.value);
  const label = getCardLabel(card.value);

  const handleClick = (e) => {
    if (onClick) {
      onClick(card, e);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isPlayable && onClick) {
        handleClick(e);
      }
    }
  };

  const handleMouseEnter = () => {
    if (isPlayable) {
      soundManager.cardHover();
    }
    onMouseEnter?.();
  };

  return (
    <div
      className={`uno-card ${colorClass} size-${size} ${
        isPlayable ? 'playable' : 'not-playable'
      } ${isSelected ? 'selected' : ''} ${
        isNewlyDrawn ? 'newly-drawn' : ''
      } ${isInvalidAttempt ? 'invalid-shake' : ''} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      role={onClick ? 'button' : undefined}
      tabIndex={isPlayable ? 0 : -1}
      aria-disabled={!isPlayable}
      aria-label={`${card.color} ${card.value} card`}
      title={`${(card.color || '').toUpperCase()} ${card.value}${!isPlayable && onClick ? ' (Cannot be played right now)' : ''}`}
      style={style}
    >
      {/* Top Left Corner */}
      <span className="corner-badge corner-top-left">{symbol}</span>

      {/* Center Oval & Graphic */}
      <div className="card-inner-oval">
        <span className="center-symbol">{symbol}</span>
        {label && <span className="card-action-text">{label}</span>}
      </div>

      {/* Bottom Right Corner */}
      <span className="corner-badge corner-bottom-right">{symbol}</span>

      {/* Playable Indicator Glow Sparkle */}
      {isPlayable && <div className="playable-indicator-pip" />}
    </div>
  );
}
