// MBFC Signal: Looks up the political bias of a given URL using the MBFC MySQL database.
//
// Steps:
// 1. Normalize the input URL to its domain.
// 2. Query the MBFC database for the domain's bias rating.
// 3. Return the bias result (or null if not found).
//
// This function is used by the Reddit Link Post signal to determine the political leaning of external links.

const mysql = require('mysql2/promise');

async function getMBFCBiasForUrls(urls, dbConfig) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const domains = urls.map(url => {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    if (domains.length === 0) return [];
    const [rows] = await connection.query(
      `SELECT source_url, bias FROM mbfc_sources WHERE source_url IN (${domains.map(() => '?').join(',')})`,
      domains
    );
    const biasMap = {};
    for (const row of rows) {
      biasMap[row.source_url] = row.bias;
    }
    return urls.map(url => {
      const domain = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; } })();
      return {
        url,
        bias: domain && biasMap[domain] ? biasMap[domain] : null
      };
    });
  } finally {
    await connection.end();
  }
}

module.exports = { getMBFCBiasForUrls };
