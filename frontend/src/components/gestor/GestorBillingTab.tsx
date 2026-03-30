import React from 'react';
import { PLAN_LIMITS, type PlanType } from '../../hooks/useSubscription';
import type { InvoiceRow } from '../../types/gestor';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from '../../types/gestor';

interface SubscriptionData {
  loading: boolean;
  error: string | null;
  planLabel: string;
  planType: PlanType;
  isActive: boolean;
  isPastDue: boolean;
  athleteUsage: { current: number; max: number; percentage: number } | null;
  canAddAthlete: boolean;
  daysRemaining: number | null;
  refresh: () => void;
}

interface GestorBillingTabProps {
  subscription: SubscriptionData;
  invoices: InvoiceRow[];
  loadingInvoices: boolean;
  onRefreshInvoices: () => void;
}

const GestorBillingTab: React.FC<GestorBillingTabProps> = ({
  subscription,
  invoices,
  loadingInvoices,
  onRefreshInvoices,
}) => (
  <div className="gestor-billing-tab">
    <div className="section-header">
      <h3>Assinatura do Clube</h3>
    </div>

    {subscription.loading ? (
      <div className="gestor-loading">
        <div className="gestor-loading-spinner" />
        Carregando dados da assinatura...
      </div>
    ) : subscription.error ? (
      <div className="gestor-error">
        <p>{subscription.error}</p>
        <button className="gestor-btn-secondary" onClick={subscription.refresh}>
          Tentar novamente
        </button>
      </div>
    ) : (
      <>
        {/* Plan Card */}
        <div className="gestor-kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon">📋</div>
            <div className="kpi-value">{subscription.planLabel}</div>
            <div className="kpi-label">Plano Atual</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">
              {subscription.isActive ? '✅' : subscription.isPastDue ? '⚠️' : '❌'}
            </div>
            <div className="kpi-value">
              {subscription.isActive ? 'Ativo' : subscription.isPastDue ? 'Pendente' : 'Inativo'}
            </div>
            <div className="kpi-label">Status</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">👥</div>
            <div className="kpi-value">
              {subscription.athleteUsage
                ? `${subscription.athleteUsage.current}/${subscription.athleteUsage.max}`
                : '—'}
            </div>
            <div className="kpi-label">Atletas</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon">📅</div>
            <div className="kpi-value">
              {subscription.daysRemaining !== null ? `${subscription.daysRemaining}d` : '∞'}
            </div>
            <div className="kpi-label">Dias Restantes</div>
          </div>
        </div>

        {/* Athlete Quota Bar */}
        {subscription.athleteUsage && (
          <div className="gestor-section">
            <h4>Uso de Atletas</h4>
            <div className="quota-bar-container">
              <div className="quota-bar">
                <div
                  className={`quota-bar-fill ${subscription.athleteUsage.percentage > 90 ? 'quota-danger' : subscription.athleteUsage.percentage > 70 ? 'quota-warning' : ''}`}
                  style={{
                    width: `${Math.min(subscription.athleteUsage.percentage, 100)}%`,
                  }}
                />
              </div>
              <span className="quota-text">
                {subscription.athleteUsage.current} de {subscription.athleteUsage.max} atletas (
                {Math.round(subscription.athleteUsage.percentage)}%)
              </span>
            </div>
            {!subscription.canAddAthlete && (
              <p className="gestor-warning">
                Limite de atletas atingido. Faça upgrade para adicionar mais.
              </p>
            )}
          </div>
        )}

        {/* Plan Comparison */}
        <div className="gestor-section">
          <h4>Planos Disponíveis</h4>
          <div className="plan-comparison-grid">
            {(['FREE', 'PREMIUM', 'ENTERPRISE'] as PlanType[]).map((plan) => {
              const config = PLAN_LIMITS[plan];
              const isCurrent = plan === subscription.planType;
              return (
                <div key={plan} className={`plan-card ${isCurrent ? 'plan-current' : ''}`}>
                  <div className="plan-card-name">{config.label}</div>
                  <div className="plan-card-athletes">
                    Até {config.maxAthletes === 999999 ? 'Ilimitados' : config.maxAthletes} atletas
                  </div>
                  <ul className="plan-card-features">
                    {config.features.map((f) => (
                      <li key={f}>✓ {f.replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <span className="plan-card-badge">Plano Atual</span>
                  ) : (
                    <button className="gestor-btn-secondary plan-upgrade-btn">
                      {PLAN_LIMITS[subscription.planType] &&
                      (['FREE', 'PREMIUM', 'ENTERPRISE'] as PlanType[]).indexOf(plan) >
                        (['FREE', 'PREMIUM', 'ENTERPRISE'] as PlanType[]).indexOf(
                          subscription.planType,
                        )
                        ? 'Upgrade'
                        : 'Mudar'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoices */}
        <div className="gestor-section">
          <div className="section-header">
            <h4>Faturas</h4>
            <button className="gestor-link-btn" onClick={onRefreshInvoices}>
              Atualizar
            </button>
          </div>
          {loadingInvoices ? (
            <div className="gestor-loading">
              <div className="gestor-loading-spinner" />
              Carregando faturas...
            </div>
          ) : invoices.length === 0 ? (
            <p className="gestor-muted">Nenhuma fatura encontrada.</p>
          ) : (
            <div className="gestor-members-table">
              <div className="members-table-header">
                <span>Descrição</span>
                <span>Valor</span>
                <span>Status</span>
                <span>Vencimento</span>
                <span>Pago em</span>
              </div>
              {invoices.map((inv) => (
                <div key={inv.id} className="members-table-row">
                  <span>{inv.description || 'Assinatura'}</span>
                  <span>R$ {(inv.amount / 100).toFixed(2)}</span>
                  <span>
                    <span
                      className={`match-status-badge ${INVOICE_STATUS_COLORS[inv.status] || 'badge-neutral'}`}
                    >
                      {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                    </span>
                  </span>
                  <span>{new Date(inv.dueDate).toLocaleDateString('pt-BR')}</span>
                  <span>{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('pt-BR') : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    )}
  </div>
);

export default GestorBillingTab;
