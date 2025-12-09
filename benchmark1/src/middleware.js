export const syncMiddlewares = {
  validate: (webhook) => {
    if (!webhook.url) throw new Error("Missing URL");
    if (!webhook.payload) throw new Error("Missing payload");

    webhook.validatedAt = Date.now();
    return webhook;
  },

  transform: (webhook) => {
    webhook.transformed = true;
    webhook.headers = {
      "Content-Type": "application/json",
      ...webhook.headers,
    };
    return webhook;
  },

  addMetadata: (webhook) => {
    webhook.metadata = {
      processedAt: new Date().toISOString(),
      version: "1.0",
    };
    return webhook;
  },
};

// Asynchronous middlewares (simulate I/O)
export const asyncMiddlewares = {
  sign: async (webhook) => {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 2));

    webhook.signature = "signed_" + Math.random().toString(36).slice(2);
    return webhook;
  },

  rateLimit: async (webhook) => {
    await new Promise((resolve) => setTimeout(resolve, 1));

    webhook.rateLimitChecked = true;
    return webhook;
  },

  enrich: async (webhook) => {
    // Simulate database lookup
    await new Promise((resolve) => setTimeout(resolve, 5));

    webhook.customerId = "cust_" + Math.random().toString(36).slice(2);
    return webhook;
  },

  heavyProcessing: async (webhook) => {
    // Simulate CPU-intensive task
    await new Promise((resolve) => setTimeout(resolve, 10));

    let result = 0;
    for (let i = 0; i < 1000; i++) {
      result += Math.sqrt(i);
    }
    webhook.heavyResult = result;
    return webhook;
  },
};
