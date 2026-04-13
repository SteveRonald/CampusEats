export function calculateSplit(totalAmount) {
  const amount = Number(totalAmount);
  const commission = Number((amount * 0.1).toFixed(2));
  const vendorPayout = Number((amount - commission).toFixed(2));

  return {
    commission,
    vendorPayout,
    payoutReference: `PAYOUT-${Date.now()}`
  };
}
