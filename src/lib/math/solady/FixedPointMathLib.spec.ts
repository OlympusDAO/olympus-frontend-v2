// fixedPointMathLib.test.ts
import { mulDiv, mulDivUp } from "./FixedPointMathLib";

// Define BigInt constants for clarity
const ONE_E27 = 1000000000000000000000000000n; // 1e27
const TWO_E27 = 2000000000000000000000000000n; // 2e27
const THREE_E27 = 3000000000000000000000000000n; // 3e27

const ONE_E18 = 1000000000000000000n; // 1e18
const TWO_E18 = 2000000000000000000n; // 2e18
const THREE_E18 = 3000000000000000000n; // 3e18

const ONE_E8 = 100000000n; // 1e8
const TWO_E8 = 200000000n; // 2e8
const THREE_E8 = 300000000n; // 3e8

// Pre-calculate values like 2.5e27, 0.5e27, and 1.25e27 using BigInts
const TWO_POINT_FIVE_E27 = 2500000000000000000000000000n;
const HALF_E27 = 500000000000000000000000000n;
const ONE_POINT_TWO_FIVE_E27 = 1250000000000000000000000000n;

const TWO_POINT_FIVE_E18 = 2500000000000000000n;
const HALF_E18 = 500000000000000000n;
const ONE_POINT_TWO_FIVE_E18 = 1250000000000000000n;

const TWO_POINT_FIVE_E8 = 250000000n;
const HALF_E8 = 50000000n;
const ONE_POINT_TWO_FIVE_E8 = 125000000n;

describe("FixedPointMathLib", () => {
  describe("mulDiv", () => {
    test("computes correct results for typical inputs", () => {
      // (2.5e27 * 0.5e27) / 1e27 = 1.25e27
      expect(mulDiv(TWO_POINT_FIVE_E27, HALF_E27, ONE_E27)).toEqual(ONE_POINT_TWO_FIVE_E27);

      // (2.5e18 * 0.5e18) / 1e18 = 1.25e18
      expect(mulDiv(TWO_POINT_FIVE_E18, HALF_E18, ONE_E18)).toEqual(ONE_POINT_TWO_FIVE_E18);

      // (2.5e8 * 0.5e8) / 1e8 = 1.25e8
      expect(mulDiv(TWO_POINT_FIVE_E8, HALF_E8, ONE_E8)).toEqual(ONE_POINT_TWO_FIVE_E8);

      // (369 * 271) / 100 = 999
      expect(mulDiv(369n, 271n, 100n)).toEqual(999n);

      // Additional tests
      expect(mulDiv(ONE_E27, ONE_E27, TWO_E27)).toEqual(HALF_E27);
      expect(mulDiv(ONE_E18, ONE_E18, TWO_E18)).toEqual(HALF_E18);
      expect(mulDiv(ONE_E8, ONE_E8, TWO_E8)).toEqual(HALF_E8);

      expect(mulDiv(TWO_E27, THREE_E27, TWO_E27)).toEqual(THREE_E27);
      expect(mulDiv(THREE_E18, TWO_E18, THREE_E18)).toEqual(TWO_E18);
      expect(mulDiv(TWO_E8, THREE_E8, TWO_E8)).toEqual(THREE_E8);
    });

    test("handles edge cases with zeros", () => {
      expect(mulDiv(0n, ONE_E18, ONE_E18)).toEqual(0n);
      expect(mulDiv(ONE_E18, 0n, ONE_E18)).toEqual(0n);
      expect(mulDiv(0n, 0n, ONE_E18)).toEqual(0n);
    });
  });

  describe("mulDivUp", () => {
    test("computes correct results for typical inputs", () => {
      // (2.5e27 * 0.5e27) / 1e27 = 1.25e27, no remainder so same as floor
      expect(mulDivUp(TWO_POINT_FIVE_E27, HALF_E27, ONE_E27)).toEqual(ONE_POINT_TWO_FIVE_E27);

      // (2.5e18 * 0.5e18) / 1e18 = 1.25e18
      expect(mulDivUp(TWO_POINT_FIVE_E18, HALF_E18, ONE_E18)).toEqual(ONE_POINT_TWO_FIVE_E18);

      // (2.5e8 * 0.5e8) / 1e8 = 1.25e8
      expect(mulDivUp(TWO_POINT_FIVE_E8, HALF_E8, ONE_E8)).toEqual(ONE_POINT_TWO_FIVE_E8);

      // For (369 * 271) / 100, floor division gives 999,
      // but since there's a remainder, mulDivUp rounds up to 1000.
      expect(mulDivUp(369n, 271n, 100n)).toEqual(1000n);

      // Additional tests
      expect(mulDivUp(ONE_E27, ONE_E27, TWO_E27)).toEqual(HALF_E27);
      expect(mulDivUp(ONE_E18, ONE_E18, TWO_E18)).toEqual(HALF_E18);
      expect(mulDivUp(ONE_E8, ONE_E8, TWO_E8)).toEqual(HALF_E8);

      expect(mulDivUp(TWO_E27, THREE_E27, TWO_E27)).toEqual(THREE_E27);
      expect(mulDivUp(THREE_E18, TWO_E18, THREE_E18)).toEqual(TWO_E18);
      expect(mulDivUp(TWO_E8, THREE_E8, TWO_E8)).toEqual(THREE_E8);
    });

    test("handles edge cases with zeros", () => {
      expect(mulDivUp(0n, ONE_E18, ONE_E18)).toEqual(0n);
      expect(mulDivUp(ONE_E18, 0n, ONE_E18)).toEqual(0n);
      expect(mulDivUp(0n, 0n, ONE_E18)).toEqual(0n);
    });
  });

  // Optionally, add tests for `min` and `zeroFloorSub` as needed.
});
