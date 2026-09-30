import React from 'react';
import './BackgroundCards.css';

/**
 * Background ambient card shapes
 * Fulfills Requirement #9: "Add very subtle background card shapes. Do not build advanced animations yet."
 */
export function BackgroundCards() {
  return (
    <div className="bg-cards-container" aria-hidden="true">
      <div className="bg-card bg-card-red" />
      <div className="bg-card bg-card-blue" />
      <div className="bg-card bg-card-green" />
      <div className="bg-card bg-card-yellow" />
      <div className="bg-card bg-card-wild" />
    </div>
  );
}
