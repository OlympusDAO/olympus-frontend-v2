// Helper function to format price for display
export function formatTickPrice(price: bigint): string {
  // Price is in 18 decimals, format to 4 decimal places
  return (Number(price) / 1e18).toFixed(4);
}

// Helper function to format capacity for display
export function formatTickCapacity(capacity: bigint): string {
  // Capacity is in 9 decimals, format to 2 decimal places
  return (Number(capacity) / 1e9).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
