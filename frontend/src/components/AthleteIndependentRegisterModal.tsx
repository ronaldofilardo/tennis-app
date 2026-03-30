// frontend/src/components/AthleteIndependentRegisterModal.tsx
// Modal de auto-cadastro para Atleta independente (sem vínculo a clube).
// Mesmos campos do AddAthleteModal. Senha gerada automaticamente = DDMMAAAA.

import React, { useState } from 'react';
import useConfirmClose from '../hooks/useConfirmClose';
import ConfirmCloseDialog from './ConfirmCloseDialog';
import './AddAthleteModal.css';

interface AthleteIndependentRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (loginResult: unknown) => void;
}

interface AthleteIndForm {
  name: string;
  email: string;
  cpf: string;
  birthDate: string;
  gender: string;
  category: string;
  nickname: string;
  phone: string;
  ranking: string;
  entity: string;
  fatherName: string;
  fatherCpf: string;
  motherName: string;
  motherCpf: string;
}

const EMPTY: AthleteIndForm = {
  name: '',
  email: '',
  cpf: '',
  birthDate: '',
  gender: '',
  category: '',
  nickname: '',
  phone: '',
  ranking: '',
  entity: '',
  fatherName: '',
  fatherCpf: '',
  motherName: '',
  motherCpf: '',
};

const CATEGORY_OPTIONS = [
  'SUB-10',
  'SUB-12',
  'SUB-14',
  'SUB-16',
  'SUB-18',
  'ADULTO',
  'SENIOR',
  'MASTER',
];

const AthleteIndependentRegisterModal: React.FC<AthleteIndependentRegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [form, setForm] = useState<AthleteIndForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<AthleteIndForm>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showGuardians, setShowGuardians] = useState(false);

  const isFormDirty =
    form.name !== '' ||
    form.email !== '' ||
    form.cpf !== '' ||
    form.birthDate !== '' ||
    form.nickname !== '' ||
    form.phone !== '';
  const { isConfirmOpen, handleOverlayClick, confirmClose, cancelClose } = useConfirmClose(
    isFormDirty,
    onClose,
  );

  if (!isOpen) return null;

  const set = (field: keyof AthleteIndForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    setApiError(null);
  };

  const validate = (): boolean => {
    const errs: Partial<AthleteIndForm> = {};
    if (!form.name.trim()) errs.name = 'Nome é obrigatório';
    if (!form.birthDate) errs.birthDate = 'Data de nascimento é obrigatória';
    if (!form.cpf.trim() && !form.email.trim())
      errs.cpf = 'CPF ou e-mail é obrigatório para criar a conta';
    if (form.cpf) {
      const d = form.cpf.replace(/\D/g, '');
      if (d.length !== 11) errs.cpf = 'CPF deve ter 11 dígitos';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'E-mail inválido';
    if (form.ranking && isNaN(Number(form.ranking))) errs.ranking = 'Ranking deve ser um número';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError(null);
    try {
      const payload: Record<string, string | number | undefined> = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        cpf: form.cpf.replace(/\D/g, '') || undefined,
        birthDate: form.birthDate,
        gender: form.gender || undefined,
        category: form.category || undefined,
        nickname: form.nickname.trim() || undefined,
        phone: form.phone.trim() || undefined,
        ranking: form.ranking ? parseInt(form.ranking, 10) : undefined,
        entity: form.entity.trim() || undefined,
        fatherName: form.fatherName.trim() || undefined,
        fatherCpf: form.fatherCpf.replace(/\D/g, '') || undefined,
        motherName: form.motherName.trim() || undefined,
        motherCpf: form.motherCpf.replace(/\D/g, '') || undefined,
      };
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      const resp = await fetch('/api/auth/register-athlete-independent', {
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
      aria-labelledby="ath-ind-modal-title"
      onClick={handleOverlayClick}
      style={{ position: 'relative' }}
    >
      <ConfirmCloseDialog isOpen={isConfirmOpen} onConfirm={confirmClose} onCancel={cancelClose} />
      <div className="add-athlete-modal">
        <div className="add-athlete-header">
          <div>
            <h2 id="ath-ind-modal-title">Cadastrar como Atleta</h2>
            <p className="add-athlete-subtitle">
              Atletas independentes podem participar de partidas e torneios sem pertencer a um
              clube.
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
          {/* Dados Principais */}
          <div className="add-athlete-section">
            <div className="add-athlete-section-title">Dados Principais</div>
            <div className="add-athlete-grid">
              <div className="add-athlete-field required">
                <label htmlFor="ai-name">Nome completo</label>
                <input
                  id="ai-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Ex: João da Silva"
                  autoComplete="name"
                  disabled={saving}
                />
                {errors.name && <span className="add-athlete-error">{errors.name}</span>}
              </div>

              <div className="add-athlete-field">
                <label htmlFor="ai-nickname">Apelido</label>
                <input
                  id="ai-nickname"
                  type="text"
                  value={form.nickname}
                  onChange={(e) => set('nickname', e.target.value)}
                  placeholder="Ex: Joãozinho"
                  disabled={saving}
                />
              </div>

              <div className="add-athlete-field">
                <label htmlFor="ai-email">E-mail</label>
                <input
                  id="ai-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="atleta@email.com"
                  autoComplete="email"
                  disabled={saving}
                />
                {errors.email && <span className="add-athlete-error">{errors.email}</span>}
              </div>

              <div className="add-athlete-field">
                <label htmlFor="ai-phone">Telefone</label>
                <input
                  id="ai-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Dados Pessoais */}
          <div className="add-athlete-section">
            <div className="add-athlete-section-title">Dados Pessoais</div>
            <div className="add-athlete-grid">
              <div className="add-athlete-field">
                <label htmlFor="ai-gender">Sexo</label>
                <select
                  id="ai-gender"
                  value={form.gender}
                  onChange={(e) => set('gender', e.target.value)}
                  disabled={saving}
                >
                  <option value="">Não informado</option>
                  <option value="MALE">Masculino</option>
                  <option value="FEMALE">Feminino</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>

              <div className="add-athlete-field required">
                <label htmlFor="ai-birthdate">Data de nascimento</label>
                <input
                  id="ai-birthdate"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => set('birthDate', e.target.value)}
                  disabled={saving}
                />
                {errors.birthDate && <span className="add-athlete-error">{errors.birthDate}</span>}
              </div>

              <div className="add-athlete-field required">
                <label htmlFor="ai-cpf">CPF</label>
                <input
                  id="ai-cpf"
                  type="text"
                  value={form.cpf}
                  onChange={(e) => set('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  disabled={saving}
                />
                {errors.cpf && <span className="add-athlete-error">{errors.cpf}</span>}
                <span className="add-athlete-hint">
                  Usado como identificador de login (CPF ou e-mail).
                </span>
              </div>

              <div className="add-athlete-field">
                <label htmlFor="ai-category">Categoria</label>
                <select
                  id="ai-category"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  disabled={saving}
                >
                  <option value="">Selecione</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="add-athlete-field">
                <label htmlFor="ai-entity">Entidade / Federação</label>
                <input
                  id="ai-entity"
                  type="text"
                  value={form.entity}
                  onChange={(e) => set('entity', e.target.value)}
                  placeholder="Ex: CBT, FMTE"
                  disabled={saving}
                />
              </div>

              <div className="add-athlete-field">
                <label htmlFor="ai-ranking">Ranking</label>
                <input
                  id="ai-ranking"
                  type="number"
                  value={form.ranking}
                  onChange={(e) => set('ranking', e.target.value)}
                  placeholder="Posição no ranking"
                  min={1}
                  disabled={saving}
                />
                {errors.ranking && <span className="add-athlete-error">{errors.ranking}</span>}
              </div>
            </div>
          </div>

          {/* Responsáveis (colapsável) */}
          <div className="add-athlete-section">
            <button
              type="button"
              className="add-athlete-section-title"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'inherit',
                fontSize: 'inherit',
                fontWeight: 'inherit',
              }}
              onClick={() => setShowGuardians((v) => !v)}
              aria-expanded={showGuardians}
            >
              {showGuardians ? '▾' : '▸'} Dados dos Responsáveis (opcional)
            </button>
            {showGuardians && (
              <div className="add-athlete-grid" style={{ marginTop: 12 }}>
                <div className="add-athlete-field">
                  <label htmlFor="ai-father">Nome do pai</label>
                  <input
                    id="ai-father"
                    type="text"
                    value={form.fatherName}
                    onChange={(e) => set('fatherName', e.target.value)}
                    placeholder="Nome completo do pai"
                    disabled={saving}
                  />
                </div>
                <div className="add-athlete-field">
                  <label htmlFor="ai-fathercpf">CPF do pai</label>
                  <input
                    id="ai-fathercpf"
                    type="text"
                    value={form.fatherCpf}
                    onChange={(e) => set('fatherCpf', e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    disabled={saving}
                  />
                </div>
                <div className="add-athlete-field">
                  <label htmlFor="ai-mother">Nome da mãe</label>
                  <input
                    id="ai-mother"
                    type="text"
                    value={form.motherName}
                    onChange={(e) => set('motherName', e.target.value)}
                    placeholder="Nome completo da mãe"
                    disabled={saving}
                  />
                </div>
                <div className="add-athlete-field">
                  <label htmlFor="ai-mothercpf">CPF da mãe</label>
                  <input
                    id="ai-mothercpf"
                    type="text"
                    value={form.motherCpf}
                    onChange={(e) => set('motherCpf', e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    disabled={saving}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Aviso de senha */}
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
                ? ' (sua data de nascimento — DDMMAAAA)'
                : ' — informe sua data de nascimento acima'}
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

export default AthleteIndependentRegisterModal;
