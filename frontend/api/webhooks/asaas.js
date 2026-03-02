// frontend/api/webhooks/asaas.js
// POST /api/webhooks/asaas — Webhook para receber eventos de pagamento do Asaas
//
// STUB: Preparado para futura integração com gateway Asaas.
// Quando integrado, este endpoint processará eventos como:
//   - PAYMENT_CONFIRMED  → Ativa subscription, reativa membros
//   - PAYMENT_OVERDUE    → Marca subscription como PAST_DUE
//   - PAYMENT_DELETED    → Atualiza invoice
//   - PAYMENT_REFUNDED   → Registra reembolso
//   - SUBSCRIPTION_DELETED → Cancela subscription, suspende membros

import prisma from "../_lib/prisma.js";
import { corsHeaders, sendJson } from "../_lib/authMiddleware.js";
import {
  suspendClubMembers,
  reactivateClubMembers,
} from "../../src/services/subscriptionService.js";

// Eventos Asaas suportados
const SUPPORTED_EVENTS = [
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
  "PAYMENT_RESTORED",
  "SUBSCRIPTION_DELETED",
  "SUBSCRIPTION_UPDATED",
];

/**
 * Valida a autenticidade do webhook Asaas.
 * Em produção, verificar o header `asaas-access-token` contra a chave configurada.
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
function validateWebhookAuth(req) {
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;

  // Se não há token configurado, está no modo de desenvolvimento/stub
  if (!webhookToken) {
    console.warn(
      "[asaas-webhook] ASAAS_WEBHOOK_TOKEN not configured — running in stub mode",
    );
    return true;
  }

  const receivedToken = req.headers["asaas-access-token"];
  return receivedToken === webhookToken;
}

export default async function handler(req, res) {
  // Webhook não usa CORS padrão — é chamado server-to-server
  if (req.method === "OPTIONS") {
    res.writeHead(200, corsHeaders);
    return res.end();
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  // Validar autenticação do webhook
  if (!validateWebhookAuth(req)) {
    console.error("[asaas-webhook] Invalid webhook token");
    return sendJson(res, 401, { error: "Invalid webhook token" });
  }

  try {
    const { event, payment, subscription: asaasSub } = req.body || {};

    if (!event) {
      return sendJson(res, 400, { error: "Missing event field" });
    }

    if (!SUPPORTED_EVENTS.includes(event)) {
      // Evento não suportado — ACK silencioso
      console.log(`[asaas-webhook] Ignoring unsupported event: ${event}`);
      return sendJson(res, 200, { received: true, ignored: true });
    }

    console.log(`[asaas-webhook] Processing event: ${event}`, {
      paymentId: payment?.id,
      subscriptionId: asaasSub?.id || payment?.subscription,
    });

    // ================================================================
    // TODO: Implementar processamento real quando Asaas for integrado
    // Por enquanto, loga o evento e retorna ACK
    // ================================================================

    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED": {
        // Futura implementação:
        // 1. Buscar subscription pelo asaasSubscriptionId
        // 2. Atualizar status para ACTIVE
        // 3. Criar/atualizar Invoice com status CONFIRMED
        // 4. Reativar membros suspensos: await reactivateClubMembers(clubId)
        console.log(
          `[asaas-webhook] STUB: Would activate subscription for payment ${payment?.id}`,
        );
        break;
      }

      case "PAYMENT_OVERDUE": {
        // Futura implementação:
        // 1. Buscar subscription pelo asaasSubscriptionId
        // 2. Atualizar status para PAST_DUE
        // 3. Atualizar Invoice com status OVERDUE
        // 4. Notificar GESTOR por email
        console.log(
          `[asaas-webhook] STUB: Would mark subscription PAST_DUE for payment ${payment?.id}`,
        );
        break;
      }

      case "PAYMENT_DELETED":
      case "PAYMENT_REFUNDED": {
        // Futura implementação:
        // 1. Atualizar Invoice com status REFUNDED
        console.log(
          `[asaas-webhook] STUB: Would update invoice for payment ${payment?.id}`,
        );
        break;
      }

      case "SUBSCRIPTION_DELETED": {
        // Futura implementação:
        // 1. Buscar subscription pelo asaasSubscriptionId
        // 2. Atualizar status para CANCELED
        // 3. Suspender membros: await suspendClubMembers(clubId)
        console.log(
          `[asaas-webhook] STUB: Would cancel subscription ${asaasSub?.id}`,
        );
        break;
      }

      case "SUBSCRIPTION_UPDATED": {
        // Futura implementação:
        // 1. Atualizar dados da subscription (plano, ciclo, etc.)
        console.log(
          `[asaas-webhook] STUB: Would update subscription ${asaasSub?.id}`,
        );
        break;
      }

      default:
        break;
    }

    // Sempre retornar 200 para o Asaas não reenviar
    return sendJson(res, 200, {
      received: true,
      event,
      processed: true,
      stub: true, // Remover quando implementação real estiver pronta
    });
  } catch (err) {
    console.error("[asaas-webhook] Error processing webhook:", err);
    // Retorna 200 mesmo em erro para evitar retry infinito do Asaas
    return sendJson(res, 200, {
      received: true,
      error: "Internal processing error",
    });
  }
}
