// Shared hashing, UUID, and domain normalization utilities (zero circular dependencies)

export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `$2a$12$BH.${Math.abs(hash).toString(16).padStart(12, '0')}.${btoa(password.slice(0, 3)).replace(/=/g, '')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  return hashPassword(password) === storedHash;
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Normalizes user-entered research domains so papers of the same domain
 * (e.g. "distributional systems" vs "Distributional Systems") sort into one category.
 */
export function normalizeDomainName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'General Research';

  const acronyms = new Set(['ai', 'ml', 'nlp', 'iot', 'dna', 'rna', '3d', 'hci', 'cs']);
  const minorWords = new Set(['and', 'of', 'the', 'in', 'for', 'on', 'to', 'with']);

  return cleaned
    .split(' ')
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if (acronyms.has(lower)) return word.toUpperCase();
      if (idx > 0 && minorWords.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  odt: 'application/vnd.oasis.opendocument.text',
  odp: 'application/vnd.oasis.opendocument.presentation',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  rtf: 'application/rtf',
  txt: 'text/plain',
  csv: 'text/csv',
  md: 'text/markdown',
  tex: 'application/x-tex',
  epub: 'application/epub+zip',
  html: 'text/html',
  htm: 'text/html',
};

const BLOCKED_EXECUTABLE_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'msi',
  'sh',
  'dll',
  'com',
  'scr',
  'vbs',
  'ps1',
  'apk',
]);

export function isDangerousExecutable(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase().trim() || '';
  return BLOCKED_EXECUTABLE_EXTENSIONS.has(ext);
}

export function inferDocumentMimeType(fileName?: string, providedMime?: string): string {
  const cleanMime = providedMime?.trim();
  if (cleanMime && cleanMime !== 'application/octet-stream') {
    return cleanMime;
  }
  const ext = fileName?.split('.').pop()?.toLowerCase().trim() || '';
  if (ext && MIME_BY_EXTENSION[ext]) {
    return MIME_BY_EXTENSION[ext];
  }
  return cleanMime || 'application/octet-stream';
}

export function getDocumentFormatLabel(fileName?: string, mimeType?: string): string {
  if (fileName && fileName.includes('.')) {
    const ext = fileName.split('.').pop()?.trim().toUpperCase();
    if (ext && ext.length <= 6) {
      return ext;
    }
  }
  const mime = (mimeType || '').toLowerCase();
  if (mime.includes('pdf')) return 'PDF';
  if (mime.includes('wordprocessingml')) return 'DOCX';
  if (mime.includes('msword')) return 'DOC';
  if (mime.includes('presentationml')) return 'PPTX';
  if (mime.includes('powerpoint')) return 'PPT';
  if (mime.includes('spreadsheetml')) return 'XLSX';
  if (mime.includes('excel')) return 'XLS';
  if (mime.includes('opendocument.text')) return 'ODT';
  if (mime.includes('opendocument.presentation')) return 'ODP';
  if (mime.includes('rtf')) return 'RTF';
  if (mime.includes('markdown')) return 'MD';
  if (mime.includes('csv')) return 'CSV';
  if (mime.includes('text/plain')) return 'TXT';
  return 'Document';
}

