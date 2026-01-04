/**
 * Create a comparator for sorting objects.
 * @param keyFunc Map each object to an array of values to sort by.
 */
function makeComparator<T, K extends (number | string)[]>(
  keyFunc: (v: T) => K,
): (v1: T, v2: T) => number {
  return (value1, value2) => {
    const key1 = keyFunc(value1);
    const key2 = keyFunc(value2);
    for (let i = 0; i < key1.length; i++) {
      if (key1[i] < key2[i]) return -1;
      if (key1[i] > key2[i]) return 1;
    }
    return 0;
  };
}

function formatQuarter(quarter: number): string {
  const quarterNames = ["Winter", "Spring", "Fall"];
  return `${quarterNames[quarter % 4]} ${Math.floor(quarter / 4)}`;
}

function countWords(text: string): number {
  const trimmed = text.trim();

  if (trimmed === "") return 0;

  return trimmed.split(/\s+/).length;
}

function isNotesField(fieldName: string): boolean {
  const NOTES_REGEX = /^(?:.*_)?notes$/;

  return NOTES_REGEX.test(fieldName.toLowerCase());
}

function isScoreOrRatingField(fieldName: string): boolean {
  const SCORE_REGEX = /^(?:.*_)?score$/;
  const RATING_REGEX = /^(?:.*_)?rating$/;

  return SCORE_REGEX.test(fieldName.toLowerCase()) || RATING_REGEX.test(fieldName.toLowerCase());
}

export { countWords, formatQuarter, isNotesField, isScoreOrRatingField, makeComparator };
