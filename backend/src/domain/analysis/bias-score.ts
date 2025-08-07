export class BiasScore {
  constructor(
    public readonly score: number, // 0-10
    public readonly confidence: number, // 0-1
    public readonly label: string // e.g., "center-left"
  ) {
    if (score < 0 || score > 10) throw new Error('Bias score must be between 0-10');
    if (confidence < 0 || confidence > 1) throw new Error('Confidence must be between 0-1');
  }

  static fromBiasLabel(bias: string, confidence: number = 0.8): BiasScore {
    const biasMap: Record<string, number> = {
      'Far Left': 1,
      'Left': 2.5,
      'Left-Center': 4,
      'Least Biased': 5,
      'Right-Center': 6,
      'Right': 7.5,
      'Far Right': 9
    };
    
    const score = biasMap[bias] || 5;
    const label = this.getLabelFromScore(score);
    return new BiasScore(score, confidence, label);
  }

  private static getLabelFromScore(score: number): string {
    if (score <= 1.5) return 'far-left';
    if (score <= 3) return 'left';
    if (score <= 4.5) return 'center-left';
    if (score <= 5.5) return 'center';
    if (score <= 7) return 'center-right';
    if (score <= 8.5) return 'right';
    return 'far-right';
  }
}
