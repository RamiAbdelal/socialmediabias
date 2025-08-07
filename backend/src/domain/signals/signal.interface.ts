import { BiasScore } from '../analysis/bias-score';

export interface SignalResult {
  signalType: string;
  score: BiasScore;
  summary: string;
  examples: string[];
}

export interface Signal {
  name: string;
  analyze(communityName: string, platform: string): Promise<SignalResult>;
}
