// MBFC Signal: Given a list of URLs, look up their bias in the MBFC MySQL database
const mysql = require('mysql2/promise');

async function getMBFCBiasForUrls(urls, dbConfig) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    // Normalize URLs to domain only
    const domains = urls.map(url => {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    if (domains.length === 0) return [];
    // Query MBFC database for each domain
    const [rows] = await connection.query(
      `SELECT source_url, bias FROM mbfc_sources WHERE source_url IN (${domains.map(() => '?').join(',')})`,
      domains
    );
    // Map results by domain
    const biasMap = {};
    for (const row of rows) {
      biasMap[row.source_url] = row.bias;
    }
    // Return bias for each input url
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
