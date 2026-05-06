import { useState } from 'react';

export interface CommonCardStyles {
  borderRadius: string;
  border: string;
  background: string;
  transition: string;
  cursor: string;
}

export interface CommonCardConfig {
  borderWidth?: number;
  defaultBorderColor?: string;
  hoverBorderColor?: string;
  defaultBackground?: string;
  hoverBackground?: string;
}

const DEFAULT_CONFIG: Required<CommonCardConfig> = {
  borderWidth: 1,
  defaultBorderColor: 'var(--color-text-3)',
  hoverBorderColor: 'var(--color-primary)',
  defaultBackground: 'var(--color-bg-1)',
  hoverBackground: 'var(--color-primary-light)',
};

export const useCommonCardStyle = (config: CommonCardConfig = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const [hovered, setHovered] = useState(false);

  const cardStyle: CommonCardStyles = {
    borderRadius: '16px',
    border: `${mergedConfig.borderWidth}px solid ${hovered ? mergedConfig.hoverBorderColor : mergedConfig.defaultBorderColor}`,
    background: hovered ? mergedConfig.hoverBackground : mergedConfig.defaultBackground,
    transition: 'border-color 0.2s, background 0.2s',
    cursor: 'pointer',
  };

  return {
    hovered,
    setHovered,
    cardStyle,
  };
};

interface CommonCardProps {
  hovered: boolean;
  setHovered: (hovered: boolean) => void;
  cardStyle: CommonCardStyles;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
  'aria-label'?: string;
  'aria-disabled'?: boolean | 'true' | 'false';
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const CommonCard = ({
  hovered,
  setHovered,
  cardStyle,
  children,
  style,
  className,
  onClick,
  role,
  tabIndex,
  'aria-label': ariaLabel,
  'aria-disabled': ariaDisabled,
  onKeyDown,
}: CommonCardProps) => {
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={role}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      aria-disabled={ariaDisabled}
      className={className}
      style={{
        ...cardStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export { SECONDARY_COLOR, PRIMARY_COLOR } from '../theme-constants';
