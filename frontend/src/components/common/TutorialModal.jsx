import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import './TutorialModal.css';

const TUTORIAL_STEPS = [
  {
    step: 1,
    icon: '🃏',
    title: 'Choose Your Card',
    text: 'Each contender starts with 7 cards. Look at the top card on the active discard pile to plan your strategy.',
  },
  {
    step: 2,
    icon: '🎯',
    title: 'Match Color or Number',
    text: 'To make a legal play, your card must match the active color OR the number of the top card on the discard pile.',
  },
  {
    step: 3,
    icon: '⚡',
    title: 'Unleash Special Cards',
    text: 'Use Skip (⊘) to bypass the next player, Reverse (⇄) to invert rotation, and Draw Two (+2) to force opponent card draws!',
  },
  {
    step: 4,
    icon: '🌈',
    title: 'Control with Wild Cards',
    text: 'Wild (★) and Wild Draw Four (+4) cards can be played on any turn, letting you dictate the next battle color.',
  },
  {
    step: 5,
    icon: '🔥',
    title: 'Shout UNO When Down to 1 Card!',
    text: 'CRITICAL: The moment you have exactly 1 card left, hit the big red UNO! button. If an opponent catches you first, you draw a +2 card penalty!',
  },
  {
    step: 6,
    icon: '👑',
    title: 'Empty Your Hand to Win',
    text: 'Be the first contender to play all your cards to claim victory and score points from your opponents remaining cards!',
  },
];

/**
 * TutorialModal Component (Phase 6)
 * Beginner-friendly interactive guide with Next, Previous, Skip, and Finish.
 * 
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 * }} props
 */
export function TutorialModal({ isOpen, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const step = TUTORIAL_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (!isLast) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('uno_tutorial_seen', 'true');
    setCurrentStepIndex(0);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleFinish} title="ARENA ONBOARDING">
      <div className="tutorial-container">
        {/* Step Progress Indicators */}
        <div className="tutorial-step-indicator">
          {TUTORIAL_STEPS.map((s, idx) => (
            <div
              key={s.step}
              className={`step-dot ${
                idx === currentStepIndex
                  ? 'active'
                  : idx < currentStepIndex
                  ? 'completed'
                  : ''
              }`}
            />
          ))}
        </div>

        <div className="tutorial-icon">{step.icon}</div>
        <h3 className="tutorial-title">
          Step {step.step}: {step.title}
        </h3>
        <p className="tutorial-text">{step.text}</p>

        {/* Action Controls */}
        <div className="tutorial-controls">
          <Button variant="ghost" size="sm" onClick={handleFinish}>
            Skip Tutorial
          </Button>

          <div className="tutorial-nav-btns">
            {!isFirst && (
              <Button variant="secondary" size="sm" onClick={handlePrev}>
                Previous
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handleNext}>
              {isLast ? 'Finish Guide' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
