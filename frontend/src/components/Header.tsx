import React from 'react';

const Header: React.FC = () => (
  <div className="header text-center mb-8">
    <h1 className="header__title inline-block text-5xl mb-4 bg-gradient-to-t from-white via-blue-100 to-blue-200 bg-clip-text text-transparent drop-shadow-lg">
      Social Media Bias
    </h1>
    <p className="header__subtitle text-lg text-white/80">
      Analyze political bias in social media communities
    </p>
  </div>
);

export default Header;
