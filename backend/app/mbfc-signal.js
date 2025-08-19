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
    // For each domain, try to match source_url by suffix (so subdomains match)
    // Build a query with ORs and LIKEs
    const likeClauses = domains.map(() => `source_url = ? OR ? LIKE CONCAT('%', source_url)`).join(' OR ');
    const params = [];
    domains.forEach(domain => {
      // Remove subdomains for fallback matching
      const parts = domain.split('.');
      const rootDomain = parts.slice(-2).join('.');
      params.push(rootDomain, domain);
    });
    const [rows] = await connection.query(
      `SELECT * FROM mbfc_sources WHERE ${likeClauses}`,
      params
    );
    // Map results by source_url, but keep the full row
    const rowMap = {};
    for (const row of rows) {
      rowMap[row.source_url] = row;
    }
    // For each input url, find the best matching row (prefer exact, else suffix)
    return urls.map(url => {
      let domain = null;
      try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch {}
      if (!domain) return { url };
      // Try exact match first
      if (rowMap[domain]) return { url, ...rowMap[domain] };
      // Try root domain match (cnn.com for edition.cnn.com)
      const parts = domain.split('.');
      const rootDomain = parts.slice(-2).join('.');
      if (rowMap[rootDomain]) return { url, ...rowMap[rootDomain] };
      // Try any suffix match
      for (const key in rowMap) {
        if (domain.endsWith(key)) return { url, ...rowMap[key] };
      }
      return { url };
    });
  } finally {
    await connection.end();
  }
}

module.exports = { getMBFCBiasForUrls };
