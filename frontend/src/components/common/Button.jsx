import React from 'react';
import './Button.css';

/**
 * Reusable Button component for UNO Arena
 * 
 * @param {{
 *   children: React.ReactNode,
 *   variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost',
 *   size?: 'sm' | 'md' | 'lg',
 *   onClick?: () => void,
 *   disabled?: boolean,
 *   className?: string,
 *   type?: 'button' | 'submit' | 'reset'
 * }} props
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  isLoading = false,
  className = '',
  type = 'button',
  ...rest
}) {
  const isBusy = loading || isLoading;

  return (
    <button
      type={type}
      className={`arena-btn btn-${variant} btn-${size} ${isBusy ? 'is-loading' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled || isBusy}
      aria-busy={isBusy}
      {...rest}
    >
      {isBusy && <span className="btn-spinner" aria-hidden="true" />}
      <span className="btn-content">{children}</span>
    </button>
  );
}
