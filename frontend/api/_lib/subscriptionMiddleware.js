// frontend/api/_lib/subscriptionMiddleware.js
// Subscription check is not enforced in this version — always passes through.

export async function requireActiveSubscription(req, res, ctx) {
  return ctx;
}
