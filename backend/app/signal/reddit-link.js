// Reddit Link Post Signal: Analyzes external link posts for political bias using MBFC.
//
// Steps:
// 1. Extract the URL from the Reddit post.
// 2. Use the MBFC signal (signal/mbfc.js) to look up the bias for the URL's domain.
// 3. Return the bias result, including source and confidence if available.
//
// This function is called for each Reddit link post to determine its political leaning.

const { getMBFCBiasForUrls } = require('./mbfc');

async function analyzeRedditLinkPost(post, dbConfig) {
  // post.url should be the external link
  if (!post.url) return { bias: null };
  const results = await getMBFCBiasForUrls([post.url], dbConfig);
  return results[0] || { bias: null };
}

module.exports = { analyzeRedditLinkPost };
