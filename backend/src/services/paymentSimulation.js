function normalizeMode(value) {
  return String(value || "test").toLowerCase() === "live" ? "live" : "test";
}

export function getPaymentSimulationConfig() {
  const mode = normalizeMode(process.env.PAYMENT_SIMULATION_MODE);

  return {
    mode,
    configured: true,
    provider: "simulation"
  };
}

export function createSimulatedPaymentReference(orderId) {
  return `SIM-${orderId}-${Date.now()}`;
}

export function createSimulatedCheckoutSession({ amount, email, customerName, reference, metadata }) {
  return {
    checkoutUrl: null,
    providerReference: reference,
    rawPayload: {
      provider: "simulation",
      status: "pending",
      amount: Number(amount),
      email,
      customer_name: customerName,
      created_at: new Date().toISOString(),
      metadata: metadata ?? null
    }
  };
}
