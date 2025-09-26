export function slugify(input: string): string {
  return input.trim().replace(/\s+/g, '-').toLowerCase();
}
