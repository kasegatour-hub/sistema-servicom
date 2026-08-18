export function normalizeFuzzySearchText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isSubsequence(search: string, candidate: string): boolean {
  let searchIndex = 0;
  for (const character of candidate) {
    if (character === search[searchIndex]) searchIndex += 1;
    if (searchIndex === search.length) return true;
  }
  return search.length === 0;
}

function editDistance(first: string, second: string): number {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    let diagonal = previous[0];
    previous[0] = firstIndex;
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const saved = previous[secondIndex];
      previous[secondIndex] = Math.min(
        previous[secondIndex] + 1,
        previous[secondIndex - 1] + 1,
        diagonal + (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1),
      );
      diagonal = saved;
    }
  }
  return previous[second.length];
}

function tokenScore(token: string, word: string): number {
  if (word === token) return 100;
  if (word.startsWith(token)) return 88;
  if (word.includes(token)) return 72;
  if (isSubsequence(token, word)) return 48;
  const allowedDistance = token.length >= 8 ? 2 : token.length >= 5 ? 1 : 0;
  return allowedDistance > 0 && Math.abs(word.length - token.length) <= allowedDistance && editDistance(token, word) <= allowedDistance ? 56 : 0;
}

/** Devuelve cero cuando no hay coincidencia y un puntaje mayor para el resultado más relacionado. */
export function getFuzzySearchScore(query: string, candidate: string): number {
  const normalizedQuery = normalizeFuzzySearchText(query);
  if (!normalizedQuery) return 1;
  const normalizedCandidate = normalizeFuzzySearchText(candidate);
  const candidateWords = normalizedCandidate.split(" ").filter(Boolean);
  const tokenScores = normalizedQuery.split(" ").filter(Boolean).map(token => Math.max(0, ...candidateWords.map(word => tokenScore(token, word))));
  if (tokenScores.some(score => score === 0)) return 0;
  return tokenScores.reduce((total, score) => total + score, 0) + (normalizedCandidate.startsWith(normalizedQuery) ? 20 : 0);
}

export function matchesFuzzySearch(query: string, candidate: string): boolean {
  return getFuzzySearchScore(query, candidate) > 0;
}

export function rankFuzzyMatches<T>(items: T[], query: string, getSearchText: (item: T) => string): T[] {
  return items
    .map(item => ({ item, score: getFuzzySearchScore(query, getSearchText(item)) }))
    .filter(result => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .map(result => result.item);
}
