import React from 'react';

const Header: React.FC = () => (
  <div className="header text-center mb-8">
    <h1 className="header__title text-4xl font-extrabold mb-4 bg-gradient-to-r from-green-300 via-yellow-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg">
      Social Media Bias Analyzerssa
    </h1>
    <p className="header__subtitle text-lg text-emerald-200">
      Analyze political bias in social media communities
    </p>
  </div>
);

export default Header;
