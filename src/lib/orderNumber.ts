/**
 * Collision-safe, human-friendly order number generator.
 * Example: P1001, P1002, P1042
 */

export function incrementOrderNumber(orderNum: string): string {
  if (!orderNum) return 'P1001';
  const match = orderNum.toUpperCase().match(/^P?(\d+)$/);
  if (match) {
    const val = parseInt(match[1], 10);
    return `P${val + 1}`;
  }
  return `P${Date.now().toString().slice(-4)}`;
}

export function generateNextOrderNumber(existingOrderNumbers: string[]): string {
  let highest = 1000;

  for (const num of existingOrderNumbers) {
    if (typeof num === 'string') {
      const match = num.toUpperCase().match(/^P?(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > highest) {
          highest = val;
        }
      }
    }
  }

  return `P${highest + 1}`;
}
