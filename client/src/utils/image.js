export function imageVariant(src, width) {
  if (!src?.startsWith('https://res.cloudinary.com/')) return src;
  return src.replace('/image/upload/', `/image/upload/c_limit,w_${width}/`);
}
