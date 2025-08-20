"use client";

import { useTheme } from '../context/ThemeContext';

const Header: React.FC = () => {
  const { colors } = useTheme();
  return (
    <div className="header text-center mb-8">
      <h1 className={`header__title text-4xl font-extrabold mb-4 ${colors.accent} drop-shadow-lg`}>
        Social Media Bias Analyzer
      </h1>
      <p className={`header__subtitle text-lg ${colors.muted}`}>
        Analyze political bias in social media communities
      </p>
    </div>
  );
};

export default Header;
