// frontend/api/webhooks.js
// Router consolidado — todas as rotas /api/webhooks/*
//   POST /api/webhooks/asaas → Webhook para eventos de pagamento Asaas

import prisma from "./_lib/prisma.js";
import { corsHeaders, sendJson } from "./_lib/authMiddleware.js";
import {
  suspendClubMembers,
  reactivateClubMembers,
} from "../src/services/subscriptionService.js";

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

function validateWebhookAuth(req) {
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!webhookToken) {
    console.warn("[webhooks] ASAAS_WEBHOOK_TOKEN not configured — stub mode");
    return true;
  }
  return req.headers["asaas-access-token"] === webhookToken;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(200, corsHeaders);
    return res.end();
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!validateWebhookAuth(req)) {
    console.error("[webhooks] Invalid webhook token");
    return sendJson(res, 401, { error: "Invalid webhook token" });
  }

  try {
    const { event, payment, subscription: asaasSub } = req.body || {};

    if (!event) return sendJson(res, 400, { error: "Missing event field" });

    if (!SUPPORTED_EVENTS.includes(event)) {
      console.log(`[webhooks] Ignoring unsupported event: ${event}`);
      return sendJson(res, 200, { received: true, ignored: true });
    }

    console.log(`[webhooks] Processing event: ${event}`, {
      paymentId: payment?.id,
      subscriptionId: asaasSub?.id || payment?.subscription,
    });

    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        console.log(
          `[webhooks] STUB: Would activate subscription for payment ${payment?.id}`,
        );
        break;
      case "PAYMENT_OVERDUE":
        console.log(
          `[webhooks] STUB: Would mark subscription PAST_DUE for payment ${payment?.id}`,
        );
        break;
      case "PAYMENT_DELETED":
      case "PAYMENT_REFUNDED":
        console.log(
          `[webhooks] STUB: Would update invoice for payment ${payment?.id}`,
        );
        break;
      case "SUBSCRIPTION_DELETED":
        console.log(
          `[webhooks] STUB: Would cancel subscription ${asaasSub?.id}`,
        );
        break;
      case "SUBSCRIPTION_UPDATED":
        console.log(
          `[webhooks] STUB: Would update subscription ${asaasSub?.id}`,
        );
        break;
      default:
        break;
    }

    return sendJson(res, 200, { received: true, event });
  } catch (error) {
    console.error("[webhooks] Error:", error);
    return sendJson(res, 500, { error: "Internal server error" });
  }
}
