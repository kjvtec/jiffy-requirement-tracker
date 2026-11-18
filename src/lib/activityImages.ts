import type { RequirementImage } from '@/types';

/**
 * Progress updates can carry pictures. They are stored inside the activity message as
 * marker lines (`[[img:<url>|<name>]]`) so no database change is needed.
 */
const MARKER = /\[\[img:([^\]|]+)\|([^\]]*)\]\]/g;

export function encodeMessage(text: string, images: RequirementImage[]): string {
  const markers = images.map((i) => `[[img:${i.file_url}|${i.file_name.replace(/[\]|]/g, '_')}]]`);
  return [text.trim(), ...markers].filter(Boolean).join('\n');
}

export function splitMessage(message: string | null | undefined): { text: string; images: RequirementImage[] } {
  const raw = message || '';
  const images: RequirementImage[] = [];
  const text = raw
    .replace(MARKER, (_m, url: string, name: string) => {
      images.push({ file_url: url, file_name: name || 'image' });
      return '';
    })
    .replace(/\n{2,}/g, '\n')
    .trim();
  return { text, images };
}
