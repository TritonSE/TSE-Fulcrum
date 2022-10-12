/**
 * Create a comparator for sorting objects.
 * @param keyFunc Map each object to an array of values to sort by.
 */
function makeComparator<T, K extends (number | string)[]>(
  keyFunc: (v: T) => K
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

export { makeComparator };
