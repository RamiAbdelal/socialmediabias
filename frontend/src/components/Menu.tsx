

"use client";
import React from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { useRouter } from 'next/navigation';
import { Input, Button, ButtonGroup, Card, CardBody } from '@heroui/react';

type Subreddit = { name: string; url: string };
interface MenuProps {
  popularSubreddits: Subreddit[];
}

const Menu: React.FC<MenuProps> = ({ popularSubreddits }) => {
  const { communityName, setCommunityName, isLoading, analyzeCommunity } = useAnalysis();
  const router = useRouter();
  return (
    <Card className="mb-8">
      <CardBody>
        <div className="flex gap-4 mb-4">
          <Input
            type="text"
            value={communityName}
            onValueChange={setCommunityName}
            placeholder="Enter subreddit URL (e.g., https://www.reddit.com/r/politics/)"
            fullWidth
            onKeyDown={(e) => e.key === 'Enter' && analyzeCommunity(communityName)}
          />
          <Button
            color="primary"
            isLoading={isLoading}
            isDisabled={isLoading || !communityName.trim()}
            onPress={() => analyzeCommunity(communityName)}
          >
            Analyze
          </Button>
        </div>
        <ButtonGroup className="flex flex-wrap gap-2">
          {popularSubreddits.map((sub: Subreddit) => {
            const match = sub.url.match(/\/r\/([^/]+)/i);
            const subredditSlug = match ? match[1].toLowerCase() : '';
            return (
              <Button
                key={sub.name}
                size="sm"
                variant="flat"
                onPress={() => router.push(`/reddit/r/${subredditSlug}`)}
                className="rounded-full min-w-fit"
              >
                {sub.name}
              </Button>
            );
          })}
        </ButtonGroup>
      </CardBody>
    </Card>
  );
};

export default Menu;
