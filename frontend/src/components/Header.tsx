"use client";
import { Card, CardHeader } from "@heroui/react";

const Header: React.FC = () => {
  return (
    <Card className="text-center mb-8 p-8">
      <CardHeader>
        <h1 className="text-4xl font-extrabold mb-2">Social Media Bias Analyzer</h1>
        <p className="text-lg text-gray-400">Analyze political bias in social media communities</p>
      </CardHeader>
    </Card>
  );
};

export default Header;
