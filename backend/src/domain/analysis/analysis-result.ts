import { BiasScore } from './bias-score';
import { SignalResult } from '../signals/signal.interface';

export class AnalysisResult {
  constructor(
    public readonly communityName: string,
    public readonly platform: string,
    public readonly overallScore: BiasScore,
    public readonly signalResults: SignalResult[],
    public readonly analysisDate: Date = new Date()
  ) {}
}
