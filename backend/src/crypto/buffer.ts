/**
 * Determine whether two Buffers are equal, using the same amount of time for
 * any two inputs of the same length. This reduces the risk of timing attacks.
 * 
 * This function returns early if the Buffers have different lengths, but this
 * shouldn't matter for comparing hash digests, since those should have the same
 * length.
 *   
 * https://security.stackexchange.com/questions/83660/simple-string-comparisons-not-secure-against-timing-attacks
 */
function buffersEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.readUInt8(i) ^ b.readUInt8(i);
  }
  return result == 0;
}

export {
  buffersEqual,
}
