/**
 * ButtonGroup — Reusable button group component
 * Handles active state, sizing, direction, multi-select
 */

import React, { useState, useCallback } from 'react';
import './ButtonGroup.css';
import type { ButtonGroupProps } from './types';

const ButtonGroup: React.FC<ButtonGroupProps> = ({
  options,
  selected,
  onChange,
  direction = 'row',
  size = 'md',
  multi = false,
  disabled = false,
  className = '',
  style,
}) => {
  const [multiSelected, setMultiSelected] = useState<Set<string | number>>(
    new Set(Array.isArray(selected) ? selected : []),
  );

  const handleClick = useCallback(
    (value: string | number) => {
      if (disabled) return;

      if (multi) {
        const newSet = new Set(multiSelected);
        if (newSet.has(value)) {
          newSet.delete(value);
        } else {
          newSet.add(value);
        }
        setMultiSelected(newSet);
        onChange(Array.from(newSet));
      } else {
        onChange(value);
      }
    },
    [multi, multiSelected, onChange, disabled],
  );

  const isSelected = useCallback(
    (value: string | number) => {
      if (multi) return multiSelected.has(value);
      return selected === value;
    },
    [selected, multiSelected, multi],
  );

  const directionClass = `button-group--${direction}`;
  const sizeClass = `button-group--${size}`;
  const disabledClass = disabled ? 'button-group--disabled' : '';

  return (
    <div
      className={`button-group ${directionClass} ${sizeClass} ${disabledClass} ${className}`.trim()}
      style={style}
      role="group"
    >
      {options.map((option) => (
        <button
          key={option.value}
          className={`button-group__btn${isSelected(option.value) ? 'button-group__btn--active' : ''}${option.disabled ? 'button-group__btn--disabled' : ''}`}
          onClick={() => handleClick(option.value)}
          disabled={disabled || option.disabled}
          type="button"
          aria-pressed={isSelected(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default ButtonGroup;
