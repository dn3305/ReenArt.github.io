/** Resolve a catalog image reference to the configured image host. */
export function getPaintingImageUrl(reference: string): string {
  if (/^https?:\/\//i.test(reference)) return reference;

  const filename = reference.replace(/^\/+/, '').replace(/^images\//i, '');
  const imageBaseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/+$/, '');

  if (!imageBaseUrl) return `/images/${filename}`;

  // The Oracle image service exposes stored files under /images/. Accept
  // either the host root or an already-complete /images base URL.
  const imageBasePath = /\/images$/i.test(imageBaseUrl) ? imageBaseUrl : `${imageBaseUrl}/images`;
  return `${imageBasePath}/${filename}`;
}
