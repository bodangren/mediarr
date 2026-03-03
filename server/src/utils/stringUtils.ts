/**
 * Normalize a title for fuzzy comparison: lowercase, strip non-alphanumeric, strip leading articles.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^(the|a|an)/, '');
}

/**
 * Calculate the Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1,
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}

/**
 * Strip characters that are illegal in filesystem paths and normalize whitespace.
 * Suitable for use in folder/file name segments derived from media titles.
 */
export function sanitizeTitle(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Produce a sort key for a title by moving leading articles to the end.
 * e.g. "The Matrix" → "Matrix, The"
 */
export function toSortTitle(title: string): string {
  const articles = ['the ', 'a ', 'an '];
  const lower = title.toLowerCase();

  for (const article of articles) {
    if (lower.startsWith(article)) {
      return title.slice(article.length) + ', ' + title.slice(0, article.length - 1);
    }
  }

  return title;
}
