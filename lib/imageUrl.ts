/** Resolve a catalog image reference to the configured image host. */
export function getPaintingImageUrl(reference: string): string {
  if (/^https?:\/\//i.test(reference)) return reference;

  const filename = reference.replace(/^\/+/, '').replace(/^images\//i, '');
  const imageBaseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/+$/, '');

  return imageBaseUrl ? `${imageBaseUrl}/${filename}` : `/images/${filename}`;
}
