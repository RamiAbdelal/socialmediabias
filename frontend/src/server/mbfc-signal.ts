import mysql from 'mysql2/promise';

export interface MBFCRow {
  source_url: string;
  source_name?: string;
  bias?: string;
  credibility?: string;
  factual_reporting?: string;
  media_type?: string;
  country?: string;
  mbfc_url?: string;
  id?: number;
  created_at?: string;
}

export interface MBFCResult extends Partial<MBFCRow> {
  url: string;
}

let pool: mysql.Pool | null = null;

function getPool() {
  if (!pool) {
    const { MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = process.env;
    if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_PASSWORD || !MYSQL_DATABASE) {
      throw new Error('Missing MySQL env vars (MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE)');
    }
    pool = mysql.createPool({
      host: MYSQL_HOST,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

function toHostname(u: string): string | null {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export async function getMBFCBiasForUrls(urls: string[]): Promise<MBFCResult[]> {
  const connection = await getPool().getConnection();
  try {
    const domains = urls.map(toHostname).filter(Boolean) as string[];
    if (domains.length === 0) return [];

    const likeClauses = domains.map(() => `source_url = ? OR ? LIKE CONCAT('%', source_url)`).join(' OR ');
  const params: Array<string> = [];
    domains.forEach(domain => {
      const parts = domain.split('.');
      const root = parts.slice(-2).join('.');
      params.push(root, domain);
    });

    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT * FROM mbfc_sources WHERE ${likeClauses}`,
      params
    );

    const rowMap: Record<string, MBFCRow> = {};
    for (const r of rows as unknown as MBFCRow[]) {
      rowMap[r.source_url] = r;
    }

    return urls.map((url) => {
      const domain = toHostname(url);
      if (!domain) return { url };
      if (rowMap[domain]) return { url, ...(rowMap[domain] as MBFCRow) };
      const parts = domain.split('.');
      const root = parts.slice(-2).join('.');
      if (rowMap[root]) return { url, ...(rowMap[root] as MBFCRow) };
      for (const key in rowMap) {
        if (domain.endsWith(key)) return { url, ...(rowMap[key] as MBFCRow) };
      }
      return { url };
    });
  } finally {
    connection.release();
  }
}
