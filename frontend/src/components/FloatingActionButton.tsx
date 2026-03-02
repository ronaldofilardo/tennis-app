import React from "react";
import "./FloatingActionButton.css";

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: string;
  label?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  icon = "+",
  label = "Nova Partida",
}) => {
  return (
    <>
      <button
        className="fab"
        onClick={onClick}
        aria-label={label}
        data-testid="fab-new-match"
      >
        <span className="fab-icon">{icon}</span>
      </button>
      <span className="fab-tooltip">{label}</span>
    </>
  );
};

export default FloatingActionButton;
