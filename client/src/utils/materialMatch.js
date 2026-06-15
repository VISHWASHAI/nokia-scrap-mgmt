// Fuzzy-match a free-text material name to one of a given list of categories.
// Mirrors the server-side disposal matcher so imports behave consistently.

const STOPWORDS = new Set([
  'waste', 'scrap', 'and', 'the', 'of', 'with', 'general', 'damaged', 'used', 'spent',
  'wastes', 'residues', 'residue', 'empty', 'contaminated', 'for', 'day', 'kgs', 'kg', 'nos',
]);

const SYNONYMS = {
  '&': 'and', plywood: 'wooden', ply: 'wooden', pallets: 'pallet',
  cartons: 'carton', plastics: 'plastic', etching: 'itching',
};

function tokenize(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .map(t => SYNONYMS[t] ?? t)
    .filter(t => t && !STOPWORDS.has(t));
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[m];
}

function tokenSim(a, b) {
  if (a === b) return 1;
  const dist = levenshtein(a, b);
  const sim = 1 - dist / Math.max(a.length, b.length);
  return sim >= 0.8 ? sim : 0;
}

function score(invoiceTokens, categoryTokens) {
  if (!invoiceTokens.length || !categoryTokens.length) return 0;
  let matched = 0;
  for (const ct of categoryTokens) {
    let best = 0;
    for (const it of invoiceTokens) best = Math.max(best, tokenSim(it, ct));
    matched += best;
  }
  const recall = matched / categoryTokens.length;
  const precision = matched / invoiceTokens.length;
  return recall * 0.7 + precision * 0.3;
}

/**
 * Best-match `material` against `categories` (array of strings).
 * Returns { category, confidence } or null when nothing scores above `threshold`.
 */
export function matchToCategories(material, categories, threshold = 0.5) {
  const tokens = tokenize(material);
  let best = null;
  for (const category of categories) {
    const s = score(tokens, tokenize(category));
    if (!best || s > best.confidence) best = { category, confidence: s };
  }
  if (!best || best.confidence < threshold) return null;
  return best;
}
