// frontend/src/components/ScorerRegisterModal.tsx
// Modal de auto-cadastro para Anotador (Scorer) independente.
// Não requer vínculo a clube. Senha gerada automaticamente = DDMMAAAA.

import React, { useState } from 'react';
import useConfirmClose from '../hooks/useConfirmClose';
import ConfirmCloseDialog from './ConfirmCloseDialog';
import './AddAthleteModal.css'; // reutiliza estilos do modal existente

interface ScorerRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (loginResult: unknown) => void;
}

interface ScorerForm {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string;
}

const EMPTY: ScorerForm = {
  name: '',
  email: '',
  cpf: '',
  phone: '',
  birthDate: '',
};

const ScorerRegisterModal: React.FC<ScorerRegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [form, setForm] = useState<ScorerForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<ScorerForm>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const isFormDirty =
    form.name !== '' ||
    form.email !== '' ||
    form.cpf !== '' ||
    form.phone !== '' ||
    form.birthDate !== '';
  const { isConfirmOpen, handleOverlayClick, confirmClose, cancelClose } = useConfirmClose(
    isFormDirty,
    onClose,
  );

  if (!isOpen) return null;

  const set = (field: keyof ScorerForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    setApiError(null);
  };

  const validate = (): boolean => {
    const errs: Partial<ScorerForm> = {};
    if (!form.name.trim()) errs.name = 'Nome é obrigatório';
    if (!form.email.trim() && !form.cpf.trim())
      errs.email = 'Informe e-mail ou CPF para criar a conta';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'E-mail inválido';
    if (form.cpf) {
      const d = form.cpf.replace(/\D/g, '');
      if (d.length !== 11) errs.cpf = 'CPF deve ter 11 dígitos';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError(null);
    try {
      const payload: Record<string, string | undefined> = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        cpf: form.cpf.replace(/\D/g, '') || undefined,
        phone: form.phone.trim() || undefined,
        birthDate: form.birthDate || undefined,
      };
      // Remover chaves undefined
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      const resp = await fetch('/api/auth/register-scorer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setApiError(data.error || 'Erro ao cadastrar. Tente novamente.');
        return;
      }
      onSuccess(data);
      onClose();
      setForm(EMPTY);
    } catch {
      setApiError('Erro de conexão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const senhaExibida = form.birthDate
    ? (() => {
        const [yyyy, mm, dd] = form.birthDate.split('-');
        return dd && mm && yyyy ? `${dd}${mm}${yyyy}` : 'DDMMAAAA';
      })()
    : 'DDMMAAAA';

  return (
    <div
      className="add-athlete-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scorer-modal-title"
      onClick={handleOverlayClick}
      style={{ position: 'relative' }}
    >
      <ConfirmCloseDialog isOpen={isConfirmOpen} onConfirm={confirmClose} onCancel={cancelClose} />
      <div className="add-athlete-modal">
        <div className="add-athlete-header">
          <div>
            <h2 id="scorer-modal-title">Cadastrar como Anotador</h2>
            <p className="add-athlete-subtitle">
              Anotadores podem criar e pontuar partidas livremente, sem precisar de um clube.
            </p>
          </div>
          <button
            type="button"
            className="add-athlete-close"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>

        <form className="add-athlete-form" onSubmit={handleSubmit} noValidate>
          <div className="add-athlete-section">
            <div className="add-athlete-section-title">Dados do Anotador</div>
            <div className="add-athlete-grid">
              <div className="add-athlete-field required">
                <label htmlFor="sc-name">Nome completo</label>
                <input
                  id="sc-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Seu nome completo"
                  autoComplete="name"
                  disabled={saving}
                />
                {errors.name && <span className="add-athlete-error">{errors.name}</span>}
              </div>

              <div className="add-athlete-field">
                <label htmlFor="sc-email">E-mail</label>
                <input
                  id="sc-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  disabled={saving}
                />
                {errors.email && <span className="add-athlete-error">{errors.email}</span>}
              </div>

              <div className="add-athlete-field">
                <label htmlFor="sc-cpf">CPF</label>
                <input
                  id="sc-cpf"
                  type="text"
                  value={form.cpf}
                  onChange={(e) => set('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  disabled={saving}
                />
                {errors.cpf && <span className="add-athlete-error">{errors.cpf}</span>}
                <span className="add-athlete-hint">
                  Use CPF <strong>ou</strong> e-mail para acessar o sistema.
                </span>
              </div>

              <div className="add-athlete-field">
                <label htmlFor="sc-phone">Telefone</label>
                <input
                  id="sc-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  disabled={saving}
                />
              </div>

              <div className="add-athlete-field">
                <label htmlFor="sc-birth">Data de nascimento</label>
                <input
                  id="sc-birth"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => set('birthDate', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <div
            className="add-athlete-section"
            style={{
              background: 'var(--clr-surface-2, #f5f5f5)',
              borderRadius: 8,
              padding: '12px 16px',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'var(--clr-text-muted, #666)',
              }}
            >
              🔑 <strong>Sua senha de acesso</strong> será:{' '}
              <code
                style={{
                  background: 'var(--clr-surface-3, #e8e8e8)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontWeight: 700,
                }}
              >
                {senhaExibida}
              </code>
              {form.birthDate
                ? ' (sua data de nascimento no formato DDMMAAAA)'
                : ' — informe sua data de nascimento acima para visualizar'}
            </p>
          </div>

          {apiError && (
            <div className="auth-error" role="alert">
              {apiError}
            </div>
          )}

          <div className="add-athlete-footer">
            <button
              type="button"
              className="add-athlete-btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="submit" className="add-athlete-btn-save" disabled={saving}>
              {saving ? (
                <>
                  <span className="add-athlete-spinner" />
                  Cadastrando...
                </>
              ) : (
                '✅ Cadastrar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScorerRegisterModal;
