// http://en.wikipedia.org/wiki/Greatest_common_divisor
// Use Euclid's algorithm
const gcd = (numerator: number, denominator: number): number => {
  if (denominator < 0.0000001) {
    // Since there is a limited precision we need to limit the value.
    return numerator;
  }

  return gcd(denominator, Math.floor(numerator % denominator)); // Discard any fractions due to limitations in precision.
};

export const numberToString = (number: number): string => {
  const wholeNumber = Math.floor(number);
  // only format fraction part of the number
  // otherwise 1.5 will format to 3/2
  const fraction = number - wholeNumber;
  const len = fraction.toString().length - 2;
  let denominator = Math.pow(10, len);
  let numerator = fraction * denominator;
  const divisor = gcd(numerator, denominator);

  numerator /= divisor;
  denominator /= divisor;

  const formattedWholeNumber = wholeNumber === 0 ? "" : wholeNumber;
  const formattedFraction =
    numerator && denominator
      ? `${Math.floor(numerator)}/${Math.floor(denominator)}`
      : "";
  const spacer = formattedWholeNumber && formattedFraction ? " " : "";

  return `${formattedWholeNumber}${spacer}${formattedFraction}`;
};
