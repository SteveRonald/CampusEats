function normalizeMode(value) {
  return String(value || "test").toLowerCase() === "live" ? "live" : "test";
}

export function getIntaSendConfig() {
  const mode = normalizeMode(process.env.INTASEND_MODE);

  const publicKey =
    mode === "live"
      ? process.env.INTASEND_PUBLIC_KEY_LIVE || process.env.INTASEND_PUBLISHABLE_KEY || ""
      : process.env.INTASEND_PUBLIC_KEY_TEST || process.env.INTASEND_PUBLISHABLE_KEY || "";
  const secretKey =
    mode === "live"
      ? process.env.INTASEND_SECRET_KEY_LIVE || process.env.INTASEND_SECRET_KEY || ""
      : process.env.INTASEND_SECRET_KEY_TEST || process.env.INTASEND_SECRET_KEY || "";
  const baseUrl = mode === "live" ? "https://payment.intasend.com" : "https://sandbox.intasend.com";

  return {
    mode,
    publicKey,
    secretKey,
    baseUrl,
    configured: Boolean(publicKey && secretKey)
  };
}

export function createIntaSendReference(orderId) {
  return `INTA-${orderId}-${Date.now()}`;
}

export async function createCheckoutSession({ amount, email, customerName, reference, callbackUrl, redirectUrl, metadata }) {
  const config = getIntaSendConfig();

  if (!config.configured) {
    throw new Error(`IntaSend ${config.mode.toUpperCase()} mode is not configured`);
  }

  const payload = {
    public_key: config.publicKey,
    amount: Number(amount),
    currency: "KES",
    email,
    first_name: customerName,
    api_ref: reference,
    metadata
  };

  if (typeof callbackUrl === "string" && /^https:\/\//i.test(callbackUrl)) {
    payload.callback_url = callbackUrl;
  }

  if (typeof redirectUrl === "string" && /^https:\/\//i.test(redirectUrl)) {
    payload.redirect_url = redirectUrl;
  }

  const response = await fetch(`${config.baseUrl}/api/v1/checkout/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.secretKey}`
    },
    body: JSON.stringify(payload)
  });

  const responsePayload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(responsePayload?.detail || responsePayload?.message || responsePayload?.error || "Failed to create IntaSend checkout session");
  }

  return {
    checkoutUrl: responsePayload.url || responsePayload.checkout_url || responsePayload.hosted_url || null,
    providerReference: responsePayload.invoice?.invoice_id || responsePayload.id || responsePayload.invoice_id || reference,
    rawPayload: responsePayload
  };
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
