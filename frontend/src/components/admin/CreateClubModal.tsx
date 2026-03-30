import React from 'react';
import type { CreateClubForm } from '../../types/admin';

interface CreateClubModalProps {
  form: CreateClubForm;
  creating: boolean;
  onFieldChange: (field: keyof CreateClubForm, value: string | boolean) => void;
  onCreate: () => void;
  onClose: () => void;
}

const CreateClubModal: React.FC<CreateClubModalProps> = ({
  form,
  creating,
  onFieldChange,
  onCreate,
  onClose,
}) => (
  <div
    className="admin-modal-overlay"
    onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div className="admin-modal">
      <div className="admin-modal-header">
        <h3>Criar Novo Clube</h3>
        <button className="admin-modal-close" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="admin-modal-body">
        <fieldset className="admin-modal-fieldset">
          <legend>Dados do Clube</legend>
          <label>
            Nome do Clube *
            <input
              type="text"
              value={form.name}
              onChange={(e) => onFieldChange('name', e.target.value)}
              placeholder="Ex: Clube Harmonia"
              className="admin-modal-input"
            />
          </label>
          <label>
            Slug (URL)
            <input
              type="text"
              value={form.slug}
              onChange={(e) => onFieldChange('slug', e.target.value)}
              placeholder="clube-harmonia"
              className="admin-modal-input"
            />
          </label>
          <label>
            Plano
            <select
              value={form.planType}
              onChange={(e) => onFieldChange('planType', e.target.value)}
              className="admin-modal-input"
            >
              <option value="FREE">Gratuito</option>
              <option value="PREMIUM">Premium</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </label>
        </fieldset>

        <fieldset className="admin-modal-fieldset">
          <legend>Dados do Gestor</legend>
          <label>
            Nome Completo *
            <input
              type="text"
              value={form.gestorName}
              onChange={(e) => onFieldChange('gestorName', e.target.value)}
              placeholder="Nome do gestor"
              className="admin-modal-input"
            />
          </label>
          <label>
            E-mail *
            <input
              type="email"
              value={form.gestorEmail}
              onChange={(e) => onFieldChange('gestorEmail', e.target.value)}
              placeholder="gestor@clube.com"
              className="admin-modal-input"
            />
          </label>
          <label>
            Senha *
            <input
              type="password"
              value={form.gestorPassword}
              onChange={(e) => onFieldChange('gestorPassword', e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="admin-modal-input"
            />
          </label>
          <label className="admin-modal-checkbox-label">
            <input
              type="checkbox"
              checked={form.alsoCoach}
              onChange={(e) => onFieldChange('alsoCoach', e.target.checked)}
            />
            <span>Também exerce função de Técnico</span>
          </label>
        </fieldset>
      </div>
      <div className="admin-modal-footer">
        <button className="admin-btn-secondary" onClick={onClose} disabled={creating}>
          Cancelar
        </button>
        <button className="admin-btn-primary" onClick={onCreate} disabled={creating}>
          {creating ? 'Criando...' : 'Criar Clube'}
        </button>
      </div>
    </div>
  </div>
);

export default CreateClubModal;
