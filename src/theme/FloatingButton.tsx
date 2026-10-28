import React from "react";
import { AppColors } from "./AppTheme"; // Adjust path to your theme constants

interface FloatingButtonProps {
  onClick?: () => void;
  label?: string;
  color?: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  ariaLabel?: string;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  onClick,
  label = "☰",
  color = AppColors.lime,
  position = "bottom-right",
  ariaLabel = "Floating action button",
}) => {
  const [pressed, setPressed] = React.useState(false);

  // Position offsets based on the selected screen corner
  const getPositionStyles = (): React.CSSProperties => {
    switch (position) {
      case "bottom-left":
        return { bottom: 24, left: 24 };
      case "top-right":
        return { top: 24, right: 24 };
      case "top-left":
        return { top: 24, left: 24 };
      case "bottom-right":
      default:
        return { bottom: 24, right: 24 };
    }
  };

  const shadowOffset = 4;
  const shift = pressed ? shadowOffset : 0;

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 1000,
        width: 56,
        height: 56,
        ...getPositionStyles(),
      }}
    >
      {/* Neo Shadow Layer */}
      {!pressed && (
        <div
          style={{
            position: "absolute",
            top: shadowOffset,
            left: shadowOffset,
            right: -shadowOffset,
            bottom: -shadowOffset,
            backgroundColor: AppColors.ink,
            borderRadius: "50%",
            border: `2px solid ${AppColors.ink}`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Interactive Button */}
      <button
        aria-label={ariaLabel}
        onClick={onClick}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          backgroundColor: color,
          border: `2px solid ${AppColors.ink}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transform: `translate(${shift}px, ${shift}px)`,
          transition: "transform 0.05s ease-in-out",
          outline: "none",
          boxSizing: "border-box",
          fontSize: 22,
          fontWeight: 900
        }}
      >
        {label}
      </button>
    </div>
  );
};