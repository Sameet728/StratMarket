import React from "react";

interface StratMarketLogoProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}

export function StratMarketLogo({
  size = 22,
  className = "",
  style,
  color = "currentColor",
}: StratMarketLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 118"
      fill={color}
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        ...style,
      }}
      aria-label="StratMarket Logo"
    >
      {/* Top Geometric Ribbon Segment */}
      <path d="M 99.32 12.66 L 74.40 0.68 L 68.26 0.00 L 2.05 38.65 L 0.00 43.10 L 0.00 60.54 L 1.37 63.62 L 3.41 65.67 L 30.03 79.01 L 47.78 68.75 L 23.55 57.80 L 22.18 56.09 Z" />
      {/* Bottom Geometric Ribbon Segment */}
      <path d="M 99.32 59.17 L 96.59 55.41 L 66.55 41.04 L 43.34 54.38 L 70.99 68.06 L 3.07 104.66 L 28.33 116.97 L 35.15 116.97 L 97.27 82.43 L 99.66 77.64 Z" />
    </svg>
  );
}

export default StratMarketLogo;

