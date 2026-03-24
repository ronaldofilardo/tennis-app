// frontend/src/services/asaasService.js
// Serviço de integração com gateway Asaas
//
// STUB: Preparado para futura integração.
// Este arquivo define a interface e contratos que serão implementados
// quando o gateway Asaas for ativado.
//
// Documentação Asaas API: https://docs.asaas.com/
// Variáveis de ambiente necessárias (configurar quando for integrar):
//   - ASAAS_API_KEY: Chave de API do Asaas
//   - ASAAS_API_URL: URL da API (sandbox: https://sandbox.asaas.com/api/v3)
//   - ASAAS_WEBHOOK_TOKEN: Token de autenticação dos webhooks

const ASAAS_API_URL =
  process.env.ASAAS_API_URL || "https://sandbox.asaas.com/api/v3";
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";

/**
 * Verifica se a integração Asaas está configurada.
 * @returns {boolean}
 */
export function isAsaasConfigured() {
  return !!ASAAS_API_KEY;
}

/**
 * Helper para chamadas à API do Asaas.
 * @param {string} endpoint — ex: "/customers"
 * @param {object} options — fetch options
 * @returns {Promise<object>}
 */
async function asaasRequest(endpoint, options = {}) {
  if (!isAsaasConfigured()) {
    throw new Error(
      "ASAAS_NOT_CONFIGURED: Set ASAAS_API_KEY environment variable",
    );
  }

  const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `ASAAS_API_ERROR: ${response.status} - ${JSON.stringify(error)}`,
    );
  }

  return response.json();
}

// ============================================================
// Customer Management
// ============================================================

/**
 * Cria um customer no Asaas para o clube.
 * @param {{ name: string, email: string, cpfCnpj?: string, phone?: string }} data
 * @returns {Promise<{ id: string, name: string }>}
 * @stub Retorna mock em modo não-configurado
 */
export async function createCustomer({ name, email, cpfCnpj, phone }) {
  if (!isAsaasConfigured()) {
    return {
      id: `cus_stub_${Date.now()}`,
      name,
      email,
      stub: true,
    };
  }

  return asaasRequest("/customers", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      cpfCnpj,
      phone,
      notificationDisabled: false,
    }),
  });
}

/**
 * Busca um customer no Asaas pelo email.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function findCustomerByEmail(email) {
  if (!isAsaasConfigured()) {
    return null;
  }

  const result = await asaasRequest(
    `/customers?email=${encodeURIComponent(email)}`,
  );
  return result.data?.[0] || null;
}

// ============================================================
// Subscription Management
// ============================================================

/**
 * Cria uma assinatura recorrente no Asaas.
 * @param {{ customerId: string, billingType: string, value: number, cycle: string, description: string, nextDueDate?: string }} data
 * @returns {Promise<{ id: string, status: string }>}
 * @stub Retorna mock em modo não-configurado
 */
export async function createAsaasSubscription({
  customerId,
  billingType = "UNDEFINED", // BOLETO, CREDIT_CARD, PIX, UNDEFINED (cliente escolhe)
  value,
  cycle = "MONTHLY",
  description,
  nextDueDate,
}) {
  if (!isAsaasConfigured()) {
    return {
      id: `sub_stub_${Date.now()}`,
      status: "ACTIVE",
      customerId,
      value,
      cycle,
      stub: true,
    };
  }

  const dueDate =
    nextDueDate ||
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  return asaasRequest("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: customerId,
      billingType,
      value,
      cycle,
      description,
      nextDueDate: dueDate,
    }),
  });
}

/**
 * Cancela uma assinatura no Asaas.
 * @param {string} subscriptionId — ID da subscription no Asaas
 * @returns {Promise<{ deleted: boolean }>}
 */
export async function cancelAsaasSubscription(subscriptionId) {
  if (!isAsaasConfigured()) {
    return { deleted: true, stub: true };
  }

  return asaasRequest(`/subscriptions/${subscriptionId}`, {
    method: "DELETE",
  });
}

// ============================================================
// Payment / Invoice
// ============================================================

/**
 * Lista cobranças de uma subscription.
 * @param {string} subscriptionId
 * @returns {Promise<object[]>}
 */
export async function getSubscriptionPayments(subscriptionId) {
  if (!isAsaasConfigured()) {
    return [];
  }

  const result = await asaasRequest(`/payments?subscription=${subscriptionId}`);
  return result.data || [];
}

/**
 * Gera URL de pagamento (checkout ou boleto/pix).
 * @param {string} paymentId — ID do pagamento no Asaas
 * @returns {Promise<{ invoiceUrl: string, bankSlipUrl?: string, pixQrCode?: string }>}
 */
export async function getPaymentDetails(paymentId) {
  if (!isAsaasConfigured()) {
    return {
      invoiceUrl: `https://sandbox.asaas.com/i/${paymentId}`,
      stub: true,
    };
  }

  const payment = await asaasRequest(`/payments/${paymentId}`);

  // Buscar QR Code Pix se disponível
  let pixQrCode = null;
  if (payment.billingType === "PIX") {
    try {
      const pix = await asaasRequest(`/payments/${paymentId}/pixQrCode`);
      pixQrCode = pix;
    } catch {
      // Pix QR Code pode não estar disponível
    }
  }

  return {
    invoiceUrl: payment.invoiceUrl,
    bankSlipUrl: payment.bankSlipUrl,
    pixQrCode,
  };
}

// ============================================================
// Plan Mapping
// ============================================================

/**
 * Mapeia o plano interno para valores de cobrança do Asaas.
 * @param {string} planType — FREE, PREMIUM, ENTERPRISE
 * @param {string} billingCycle — MONTHLY, QUARTERLY, YEARLY
 * @returns {{ value: number, cycle: string, description: string }}
 */
export function mapPlanToAsaas(planType, billingCycle = "MONTHLY") {
  const plans = {
    FREE: { MONTHLY: 0, QUARTERLY: 0, YEARLY: 0 },
    PREMIUM: { MONTHLY: 299, QUARTERLY: 799, YEARLY: 2990 },
    ENTERPRISE: { MONTHLY: 799, QUARTERLY: 2199, YEARLY: 7990 },
  };

  const cycleMap = {
    MONTHLY: "MONTHLY",
    QUARTERLY: "QUARTERLY",
    YEARLY: "YEARLY",
  };

  const value = plans[planType]?.[billingCycle] || 0;

  return {
    value,
    cycle: cycleMap[billingCycle] || "MONTHLY",
    description: `RacketApp - Plano ${planType} (${billingCycle})`,
  };
}
