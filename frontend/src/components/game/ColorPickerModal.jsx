import React from 'react';
import { CARD_COLORS } from '../../shared/constants/cardConstants.js';
import './ColorPickerModal.css';

/**
 * ColorPickerModal
 * Displays 4 vibrant color buttons when a player plays a Wild card.
 * 
 * @param {{
 *   isOpen: boolean,
 *   onSelectColor: (color: string) => void,
 * }} props
 */
export function ColorPickerModal({ isOpen, onSelectColor }) {
  if (!isOpen) return null;

  const colorChoices = [
    { id: CARD_COLORS.RED, label: 'RED', bgClass: 'choice-red' },
    { id: CARD_COLORS.BLUE, label: 'BLUE', bgClass: 'choice-blue' },
    { id: CARD_COLORS.YELLOW, label: 'YELLOW', bgClass: 'choice-yellow' },
    { id: CARD_COLORS.GREEN, label: 'GREEN', bgClass: 'choice-green' },
  ];

  return (
    <div className="color-picker-overlay" role="dialog" aria-modal="true" aria-labelledby="picker-title">
      <div className="color-picker-modal">
        <h3 id="picker-title" className="picker-title">CHOOSE ARENA COLOR</h3>
        <p className="picker-subtitle">Select the active color for the next play</p>

        <div className="color-choices-grid">
          {colorChoices.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`color-choice-btn ${c.bgClass}`}
              onClick={() => onSelectColor(c.id)}
              aria-label={`Choose ${c.label}`}
            >
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
