export const isImageUrl = (url: string) => {
  return /\.(jpe?g|png|gif|bmp|webp|avif)$/i.test(url) || url.includes('i.redd.it/');
};

export const isGalleryUrl = (url: string) => {
  return url.includes('reddit.com/gallery/');
};