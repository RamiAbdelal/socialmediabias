"use client";

const Header: React.FC = () => (
  <div className="header text-center mb-8">
    <h1 className="header__title inline-block text-5xl mb-4 bg-gradient-to-t from-primary/90 via-primary to-accent bg-clip-text text-transparent drop-shadow">
      Social Media Bias
    </h1>
    <p className="header__subtitle text-lg text-muted-foreground">
      Analyze political bias in social media communities
    </p>
  </div>
);

export default Header;
