export function createIntaSendReference(orderId) {
  return `INTA-${orderId}-${Date.now()}`;
}

export function simulateCollection({ orderId, amount, customerName }) {
  return {
    status: "successful",
    paymentProvider: "intasend",
    paymentReference: createIntaSendReference(orderId),
    amount,
    customerName
  };
}
