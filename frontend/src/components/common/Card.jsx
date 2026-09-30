import React from 'react';
import './Card.css';

/**
 * Reusable Card / Surface Container
 * 
 * @param {{
 *   children: React.ReactNode,
 *   className?: string,
 *   title?: string,
 *   subtitle?: string,
 *   glowColor?: 'primary' | 'red' | 'blue' | 'green' | 'yellow' | 'none'
 * }} props
 */
export function Card({
  children,
  className = '',
  title,
  subtitle,
  glowColor = 'none',
}) {
  return (
    <div className={`arena-card glow-${glowColor} ${className}`}>
      {(title || subtitle) && (
        <div className="arena-card-header">
          {title && <h3 className="arena-card-title">{title}</h3>}
          {subtitle && <p className="arena-card-subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="arena-card-body">{children}</div>
    </div>
  );
}
