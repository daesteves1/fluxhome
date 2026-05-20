/**
 * Generate a standardised storage filename for uploaded documents.
 * Pattern: {doc_type}_{first_name}_{unix_timestamp}.{ext}
 * Falls back to {doc_type}_{unix_timestamp}.{ext} when no proponent name is given.
 */
export function buildDocumentFileName(
  docType: string,
  proponenteName: string | null,
  originalFileName: string,
): string {
  const ext = originalFileName.split('.').pop()?.toLowerCase() ?? 'pdf';
  const typeSlug = docType
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const ts = Math.floor(Date.now() / 1000);
  if (proponenteName) {
    const firstName = proponenteName.trim().split(/\s+/)[0]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    return `${typeSlug}_${firstName}_${ts}.${ext}`;
  }
  return `${typeSlug}_${ts}.${ext}`;
}

/**
 * Generate a standardised filename for a bank-share document.
 * Pattern: {doc_type}_{proponente}_{unix_timestamp}[_{index}].{ext}
 */
export function formatDocFileName(
  docType: string | null,
  proponente: 'p1' | 'p2' | 'shared',
  originalFileName: string | null,
  index?: number,
): string {
  const ext = originalFileName?.split('.').pop()?.toLowerCase() ?? 'pdf';
  const typeSlug = (docType ?? 'documento')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const proponenteStr = proponente === 'shared' ? 'partilhado' : proponente;
  const ts = Math.floor(Date.now() / 1000);
  const suffix = index !== undefined && index > 0 ? `_${index}` : '';
  return `${typeSlug}_${proponenteStr}_${ts}${suffix}.${ext}`;
}
