import { Signal, SignalResult } from '../signals/signal.interface';
import { AnalysisResult } from './analysis-result';
import { BiasScore } from './bias-score';

export class BiasAnalyzer {
  constructor(private signals: Signal[]) {}

  async analyze(communityName: string, platform: string): Promise<AnalysisResult> {
    const signalResults = await Promise.all(
      this.signals.map(signal => signal.analyze(communityName, platform))
    );

    const overallScore = this.calculateOverallScore(signalResults);
    
    return new AnalysisResult(
      communityName,
      platform,
      overallScore,
      signalResults
    );
  }

  private calculateOverallScore(signalResults: SignalResult[]): BiasScore {
    if (signalResults.length === 0) {
      return new BiasScore(5, 0, 'center');
    }

    const totalScore = signalResults.reduce((sum, result) => sum + result.score.score, 0);
    const averageScore = totalScore / signalResults.length;
    
    const totalConfidence = signalResults.reduce((sum, result) => sum + result.score.confidence, 0);
    const averageConfidence = totalConfidence / signalResults.length;

    return new BiasScore(averageScore, averageConfidence, this.getLabelFromScore(averageScore));
  }

  private getLabelFromScore(score: number): string {
    if (score <= 1.5) return 'far-left';
    if (score <= 3) return 'left';
    if (score <= 4.5) return 'center-left';
    if (score <= 5.5) return 'center';
    if (score <= 7) return 'center-right';
    if (score <= 8.5) return 'right';
    return 'far-right';
  }
}
