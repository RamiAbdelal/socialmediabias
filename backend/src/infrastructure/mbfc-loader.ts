import fs from 'fs';
import mysql from 'mysql2/promise';

export class MBFCLoader {
  private connection: mysql.Connection | null = null;

  private async getConnection(): Promise<mysql.Connection> {
    if (!this.connection) {
      this.connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
      });
    }
    return this.connection;
  }

  async loadMBFCData(): Promise<void> {
    try {
      const data = JSON.parse(fs.readFileSync('./mbfc-dataset-2025-08-05.json', 'utf8'));
      
      console.log(`Loading ${data.length} MBFC records...`);
      
      const connection = await this.getConnection();
      
      for (const record of data) {
        await connection.execute(
          'INSERT INTO mbfc_sources (source_name, mbfc_url, bias, country, factual_reporting, media_type, source_url, credibility, source_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            record.Source, 
            record['MBFC URL'], 
            record.Bias, 
            record.Country, 
            record['Factual Reporting'], 
            record['Media Type'], 
            record['Source URL'], 
            record.Credibility, 
            record['Source ID#']
          ]
        );
      }
      
      console.log('MBFC data loaded successfully!');
    } catch (error) {
      console.error('Error loading MBFC data:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
}
