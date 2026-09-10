/**
 * Image URL helper — Cloudinary transformation params for smaller payloads.
 * This is a normal performance optimization (not Low Data Mode).
 */
export function optimizeImage(url, { width = 300 } = {}) {
  if (!url) return url;
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url; // not a Cloudinary URL — pass through
  return url.replace(marker, `${marker}q_auto,f_auto,w_${width}/`);
}
