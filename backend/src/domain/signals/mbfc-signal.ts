import { Signal, SignalResult } from './signal.interface';
import { BiasScore } from '../analysis/bias-score';
import mysql from 'mysql2/promise';

export class MBFCSignal implements Signal {
  name = 'MBFCSignal';
  private connection: mysql.Connection | null = null;

  private async getConnection(): Promise<mysql.Connection | null> {
    try {
      if (!this.connection) {
        this.connection = await mysql.createConnection({
          host: process.env.MYSQL_HOST,
          user: process.env.MYSQL_USER,
          password: process.env.MYSQL_PASSWORD,
          database: process.env.MYSQL_DATABASE
        });
      }
      return this.connection;
    } catch (error) {
      console.warn('MBFC database connection failed, using mock data:', error);
      return null;
    }
  }

  async analyze(communityName: string, platform: string): Promise<SignalResult> {
    // For MVP, we'll simulate URL extraction
    // In full implementation, this would extract URLs from Reddit posts
    const mockUrls = ['news.sky.com', 'bbc.com', 'foxnews.com'];
    
    const sourceScores = await Promise.all(
      mockUrls.map(url => this.getSourceBias(url))
    );

    const validScores = sourceScores.filter(score => score !== null);
    const averageScore = validScores.length > 0 
      ? validScores.reduce((sum, score) => sum + score!.score, 0) / validScores.length
      : 5;

    return {
      signalType: this.name,
      score: new BiasScore(averageScore, 0.8, this.getLabelFromScore(averageScore)),
      summary: `Analyzed ${validScores.length} media sources from ${communityName}`,
      examples: mockUrls
    };
  }

  private async getSourceBias(url: string): Promise<BiasScore | null> {
    try {
      const connection = await this.getConnection();
      if (!connection) {
        // Return mock bias scores when database is not available
        const mockBiasMap: Record<string, string> = {
          'news.sky.com': 'Least Biased',
          'bbc.com': 'Left-Center',
          'foxnews.com': 'Right'
        };
        const bias = mockBiasMap[url] || 'Least Biased';
        return BiasScore.fromBiasLabel(bias);
      }

      const [rows] = await connection.execute(
        'SELECT bias FROM mbfc_sources WHERE source_url LIKE ?',
        [`%${url}%`]
      );
      
      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0] as any;
        return BiasScore.fromBiasLabel(row.bias);
      }
      return null;
    } catch (error) {
      console.error(`Error querying MBFC for ${url}:`, error);
      return null;
    }
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
