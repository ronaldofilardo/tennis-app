/**
 * Type definitions for DetailsPanel design pattern
 * Used across all detail/modal components in Racket
 */

import type { ReactNode, CSSProperties } from 'react';

/**
 * Props for DetailsPanel (main container)
 */
export interface DetailsPanelProps {
  /** Badge/header content (e.g., "DEVOLVEDOR — ARTHUR") */
  header?: ReactNode;
  /** Main content: DetailsSection elements */
  children: ReactNode;
  /** Footer actions (buttons) */
  footer?: ReactNode;
  /** Optional CSS class for customization */
  className?: string;
  /** Optional inline styles */
  style?: CSSProperties;
  /** Accent color variant: 'green' | 'blue' | 'yellow' */
  accentColor?: 'green' | 'blue' | 'yellow' | 'default';
}

/**
 * Props for DetailsHeader (badge + title)
 */
export interface DetailsHeaderProps {
  /** Badge label (e.g., "DEVOLVEDOR", "SACADOR") */
  label: string;
  /** Secondary text (e.g., player name) */
  subtitle?: string;
  /** Accent color */
  variant?: 'default' | 'winner' | 'loser' | 'server' | 'returner';
  /** Optional icon or custom content */
  icon?: ReactNode;
  /** Optional CSS class */
  className?: string;
}

/**
 * Props for DetailsSection (repeatable section)
 */
export interface DetailsSectionProps {
  /** Section title (e.g., "SITUAÇÃO DO PONTO") */
  title: string;
  /** Section content (buttons, inputs, text, etc.) */
  children: ReactNode;
  /** Optional variant: 'default' | 'input' | 'display' */
  variant?: 'default' | 'input' | 'display';
  /** Optional CSS class */
  className?: string;
  /** Optional inline styles */
  style?: CSSProperties;
}

/**
 * Props for ButtonGroup (reusable button container)
 */
export interface ButtonGroupProps {
  /** Button options (array of {label, value, disabled?}) */
  options: Array<{
    label: string;
    value: string | number;
    disabled?: boolean;
  }>;
  /** Currently selected value */
  selected?: string | number;
  /** Callback when button is clicked */
  onChange: (value: string | number) => void;
  /** Layout direction: 'row' | 'column' */
  direction?: 'row' | 'column';
  /** Button size: 'sm' | 'md' | 'lg' */
  size?: 'sm' | 'md' | 'lg';
  /** Allow multiple selections */
  multi?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Optional CSS class */
  className?: string;
  /** Optional inline styles */
  style?: CSSProperties;
}

/**
 * Props for ButtonGroup individual button
 */
export interface ButtonProps {
  /** Button label */
  label: string;
  /** Button value/id */
  value: string | number;
  /** Is button currently selected */
  isSelected?: boolean;
  /** Button disabled state */
  disabled?: boolean;
  /** Click handler */
  onClick: () => void;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Optional CSS class */
  className?: string;
}

/**
 * Context type for DetailsPanel state
 */
export interface DetailsPanelContextType {
  accentColor: 'green' | 'blue' | 'yellow' | 'default';
}
