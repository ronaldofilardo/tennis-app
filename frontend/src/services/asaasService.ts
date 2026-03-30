// frontend/src/services/asaasService.ts
// Serviço de integração com gateway Asaas
//
// STUB: Preparado para futura integração.
// Documentação Asaas API: https://docs.asaas.com/
// Variáveis de ambiente necessárias (configurar quando for integrar):
//   - ASAAS_API_KEY: Chave de API do Asaas
//   - ASAAS_API_URL: URL da API (sandbox: https://sandbox.asaas.com/api/v3)
//   - ASAAS_WEBHOOK_TOKEN: Token de autenticação dos webhooks

const ASAAS_API_URL = process.env.ASAAS_API_URL ?? 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY ?? '';

export function isAsaasConfigured(): boolean {
  return typeof ASAAS_API_KEY === 'string' && ASAAS_API_KEY.trim().length >= 10;
}

async function asaasRequest(endpoint: string, options: RequestInit = {}): Promise<unknown> {
  if (!isAsaasConfigured()) {
    throw new Error('ASAAS_NOT_CONFIGURED: Set ASAAS_API_KEY environment variable');
  }

  const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      access_token: ASAAS_API_KEY,
      ...(options.headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as object;
    throw new Error(`ASAAS_API_ERROR: ${response.status} - ${JSON.stringify(error)}`);
  }

  return response.json();
}

// ============================================================
// Customer Management
// ============================================================

export interface AsaasCustomer {
  id: string;
  name: string;
  email?: string;
  stub?: boolean;
}

export async function createCustomer({
  name,
  email,
  cpfCnpj,
  phone,
}: {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
}): Promise<AsaasCustomer> {
  if (!isAsaasConfigured()) {
    return {
      id: `cus_stub_${Date.now()}`,
      name,
      email,
      stub: true,
    };
  }

  return asaasRequest('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name,
      email,
      cpfCnpj,
      phone,
      notificationDisabled: false,
    }),
  }) as Promise<AsaasCustomer>;
}

export async function findCustomerByEmail(email: string): Promise<AsaasCustomer | null> {
  if (!isAsaasConfigured()) {
    return null;
  }

  const result = (await asaasRequest(`/customers?email=${encodeURIComponent(email)}`)) as {
    data?: AsaasCustomer[];
  };
  return result.data?.[0] ?? null;
}

// ============================================================
// Subscription Management
// ============================================================

export interface AsaasSubscription {
  id: string;
  status: string;
  customerId?: string;
  value?: number;
  cycle?: string;
  stub?: boolean;
}

export async function createAsaasSubscription({
  customerId,
  billingType = 'UNDEFINED',
  value,
  cycle = 'MONTHLY',
  description,
  nextDueDate,
}: {
  customerId: string;
  billingType?: string;
  value: number;
  cycle?: string;
  description: string;
  nextDueDate?: string;
}): Promise<AsaasSubscription> {
  if (!isAsaasConfigured()) {
    return {
      id: `sub_stub_${Date.now()}`,
      status: 'ACTIVE',
      customerId,
      value,
      cycle,
      stub: true,
    };
  }

  const dueDate =
    nextDueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return asaasRequest('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      billingType,
      value,
      cycle,
      description,
      nextDueDate: dueDate,
    }),
  }) as Promise<AsaasSubscription>;
}

export async function cancelAsaasSubscription(
  subscriptionId: string,
): Promise<{ deleted: boolean; stub?: boolean }> {
  if (!isAsaasConfigured()) {
    return { deleted: true, stub: true };
  }

  return asaasRequest(`/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
  }) as Promise<{ deleted: boolean }>;
}

// ============================================================
// Payment / Invoice
// ============================================================

export async function getSubscriptionPayments(subscriptionId: string): Promise<unknown[]> {
  if (!isAsaasConfigured()) {
    return [];
  }

  const result = (await asaasRequest(`/payments?subscription=${subscriptionId}`)) as {
    data?: unknown[];
  };
  return result.data ?? [];
}

export interface PaymentDetails {
  invoiceUrl: string;
  bankSlipUrl?: string;
  pixQrCode?: unknown;
  stub?: boolean;
}

export async function getPaymentDetails(paymentId: string): Promise<PaymentDetails> {
  if (!isAsaasConfigured()) {
    return {
      invoiceUrl: `https://sandbox.asaas.com/i/${paymentId}`,
      stub: true,
    };
  }

  const payment = (await asaasRequest(`/payments/${paymentId}`)) as {
    billingType?: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
  };

  let pixQrCode: unknown = null;
  if (payment.billingType === 'PIX') {
    try {
      pixQrCode = await asaasRequest(`/payments/${paymentId}/pixQrCode`);
    } catch {
      // Pix QR Code pode não estar disponível
    }
  }

  return {
    invoiceUrl: payment.invoiceUrl ?? '',
    bankSlipUrl: payment.bankSlipUrl,
    pixQrCode,
  };
}

// ============================================================
// Plan Mapping
// ============================================================

type PlanType = 'FREE' | 'PREMIUM' | 'ENTERPRISE';
type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export function mapPlanToAsaas(
  planType: string,
  billingCycle: string = 'MONTHLY',
): {
  value: number;
  cycle: string;
  description: string;
} {
  const plans: Record<PlanType, Record<BillingCycle, number>> = {
    FREE: { MONTHLY: 0, QUARTERLY: 0, YEARLY: 0 },
    PREMIUM: { MONTHLY: 299, QUARTERLY: 799, YEARLY: 2990 },
    ENTERPRISE: { MONTHLY: 799, QUARTERLY: 2199, YEARLY: 7990 },
  };

  const cycleMap: Record<string, string> = {
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    YEARLY: 'YEARLY',
  };

  const planValue = plans[planType as PlanType];
  const value = planValue?.[billingCycle as BillingCycle] ?? 0;

  return {
    value,
    cycle: cycleMap[billingCycle] ?? 'MONTHLY',
    description: `RacketApp - Plano ${planType} (${billingCycle})`,
  };
}
