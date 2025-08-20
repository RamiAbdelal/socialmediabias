"use client";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { mode, toggleMode, colors } = useTheme();
  return (
    <button
      className={`fixed top-4 right-4 px-4 py-2 rounded transition-colors border ${colors.button} ${colors.border} z-50 shadow-lg`}
      style={{ minWidth: 100 }}
      onClick={toggleMode}
      aria-label="Toggle dark/light mode"
    >
      {mode === 'dark' ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}
