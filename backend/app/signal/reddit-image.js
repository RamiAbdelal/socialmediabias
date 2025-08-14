// Reddit Image Post Signal: Analyzes image posts (including galleries) for political content.
//
// Steps:
// 1. Extract the image URL(s) from the Reddit post (single image or gallery).
// 2. For each image, use the Image Signal (signal/image.js) to extract text and analyze for political leaning.
// 3. Aggregate results across all images (if gallery).
// 4. Return the combined analysis, including any detected political sentiment or bias.
//
// Meme detection is a future step and not included here.

const { analyzeImage } = require('./image');

async function analyzeRedditImagePost(post) {
  // post.url (single image) or post.gallery (array of image URLs)
  const imageUrls = post.gallery || (post.url ? [post.url] : []);
  const results = [];
  for (const url of imageUrls) {
    results.push(await analyzeImage(url));
  }
  // Aggregate or summarize results as needed
  return {
    images: imageUrls,
    analyses: results
  };
}

module.exports = { analyzeRedditImagePost };
