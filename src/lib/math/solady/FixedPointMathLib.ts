export const WAD = 10n ** 18n;

/**
 * Multiplies `x` and `y`, divides by `d`, and floors the result.
 * Throws an error if `x * y` overflows or `d` is zero.
 * @param x - The first operand (bigint).
 * @param y - The second operand (bigint).
 * @param d - The divisor (bigint).
 * @returns The result of `floor(x * y / d)`.
 */
export function mulDiv(x: bigint, y: bigint, d: bigint): bigint {
  if (d === 0n) {
    throw new Error("Division by zero");
  }

  const product = x * y;
  if (y !== 0n && product / y !== x) {
    throw new Error("Multiplication overflow");
  }

  return product / d;
}

/**
 * Multiplies `x` and `y`, divides by `d`, and rounds up the result.
 * Throws an error if `x * y` overflows or `d` is zero.
 * @param x - The first operand (bigint).
 * @param y - The second operand (bigint).
 * @param d - The divisor (bigint).
 * @returns The result of `ceil(x * y / d)`.
 */
export function mulDivUp(x: bigint, y: bigint, d: bigint): bigint {
  if (d === 0n) {
    throw new Error("Division by zero");
  }

  const product = x * y;
  if (y !== 0n && product / y !== x) {
    throw new Error("Multiplication overflow");
  }

  const remainder = product % d;
  return product / d + (remainder > 0n ? 1n : 0n);
}

/**
 * Returns the minimum of `x` and `y` using bitwise operations.
 * @param x - The first number (bigint).
 * @param y - The second number (bigint).
 * @returns The smaller of `x` and `y`.
 */
export function min(x: bigint, y: bigint): bigint {
  const condition = y < x ? 1n : 0n;
  return x ^ ((x ^ y) * condition);
}

export function zeroFloorSub(x: bigint, y: bigint): bigint {
  return x > y ? x - y : 0n;
}

/**
 * Computes `base^exponent` using the binary exponentiation algorithm
 * @param base The base value (bigint)
 * @param exponent The exponent (bigint)
 * @param precision The precision base (bigint, typically 1e18)
 * @returns The result of base^exponent with given precision
 */
export function rpow(base: bigint, exponent: bigint, precision: bigint): bigint {
  if (exponent === 0n) {
    return precision;
  }

  if (base === 0n) {
    return 0n;
  }

  if (base === precision) {
    return precision;
  }

  let result = precision;
  let currentBase = base;
  let currentExponent = exponent;

  while (currentExponent > 0n) {
    if (currentExponent % 2n === 1n) {
      result = mulDiv(result, currentBase, precision);
    }
    currentBase = mulDiv(currentBase, currentBase, precision);
    currentExponent = currentExponent / 2n;
  }

  return result;
}
