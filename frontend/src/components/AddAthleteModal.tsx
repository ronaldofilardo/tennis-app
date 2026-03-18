// frontend/src/components/AddAthleteModal.tsx
// Modal para cadastro manual de atleta ou técnico pelo gestor.
// Campos equivalentes à importação XLSX. O globalId é gerado automaticamente pelo backend.

import React, { useState, useEffect } from "react";
import httpClient from "../config/httpClient";
import { useToast } from "./Toast";
import "./AddAthleteModal.css";

export type AthleteRole = "ATHLETE" | "COACH" | "SPECTATOR";

interface AddAthleteForm {
  name: string;
  email: string;
  role: AthleteRole;
  gender: string;
  cpf: string;
  birthDate: string;
  category: string;
  entity: string;
  nickname: string;
  phone: string;
  ranking: string;
  fatherName: string;
  fatherCpf: string;
  motherName: string;
  motherCpf: string;
}

interface AddAthleteModalProps {
  isOpen: boolean;
  clubId: string;
  onClose: () => void;
  onSuccess: () => void;
  /** Papél pré-selecionado ao abrir o modal. Default: ATHLETE */
  defaultRole?: AthleteRole;
}

const EMPTY_FORM: AddAthleteForm = {
  name: "",
  email: "",
  role: "ATHLETE",
  gender: "",
  cpf: "",
  birthDate: "",
  category: "",
  entity: "",
  nickname: "",
  phone: "",
  ranking: "",
  fatherName: "",
  fatherCpf: "",
  motherName: "",
  motherCpf: "",
};

const ROLE_OPTIONS: { value: AthleteRole; label: string; icon: string }[] = [
  { value: "ATHLETE", label: "Atleta", icon: "🎾" },
  { value: "COACH", label: "Técnico", icon: "🎯" },
  { value: "SPECTATOR", label: "Espectador", icon: "👁️" },
];

const CATEGORY_OPTIONS = [
  "SUB-10",
  "SUB-12",
  "SUB-14",
  "SUB-16",
  "SUB-18",
  "ADULTO",
  "SENIOR",
  "MASTER",
];

export const AddAthleteModal: React.FC<AddAthleteModalProps> = ({
  isOpen,
  clubId,
  onClose,
  onSuccess,
  defaultRole = "ATHLETE",
}) => {
  const toast = useToast();
  const [form, setForm] = useState<AddAthleteForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<AddAthleteForm>>({});

  useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY_FORM, role: defaultRole });
      setErrors({});
    }
  }, [isOpen, defaultRole]);

  if (!isOpen) return null;

  const set = (field: keyof AddAthleteForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<AddAthleteForm> = {};
    if (!form.name.trim()) newErrors.name = "Nome é obrigatório";
    if (form.cpf) {
      const digits = form.cpf.replace(/\D/g, "");
      if (digits.length !== 11) newErrors.cpf = "CPF deve ter 11 dígitos";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "E-mail inválido";
    }
    if (form.ranking && isNaN(Number(form.ranking))) {
      newErrors.ranking = "Ranking deve ser um número";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        role: form.role,
        gender: form.gender || undefined,
        cpf: form.cpf.replace(/\D/g, "") || undefined,
        birthDate: form.birthDate || undefined,
        category: form.category.trim() || undefined,
        entity: form.entity.trim() || undefined,
        nickname: form.nickname.trim() || undefined,
        phone: form.phone.trim() || undefined,
        ranking: form.ranking ? parseInt(form.ranking, 10) : undefined,
        fatherName: form.fatherName.trim() || undefined,
        fatherCpf: form.fatherCpf.replace(/\D/g, "") || undefined,
        motherName: form.motherName.trim() || undefined,
        motherCpf: form.motherCpf.replace(/\D/g, "") || undefined,
      };

      const res = await httpClient.post<{ globalIdDisplay: string }>(
        `/clubs/${clubId}/athletes`,
        payload,
      );

      const codeDisplay = res.data.globalIdDisplay ?? "";
      toast.success(`✅ Cadastrado com sucesso! Código: ${codeDisplay}`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Erro ao cadastrar. Tente novamente.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="add-athlete-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-athlete-title"
      onClick={handleOverlayClick}
    >
      <div className="add-athlete-modal">
        {/* Header */}
        <div className="add-athlete-header">
          <div>
            <h2 id="add-athlete-title">Cadastrar Atleta / Técnico</h2>
            <p className="add-athlete-subtitle">
              O código global (ID) será gerado automaticamente.
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
          {/* Papel */}
          <div className="add-athlete-section">
            <div className="add-athlete-section-title">Papel no clube</div>
            <div className="add-athlete-role-group">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`add-athlete-role-btn${form.role === opt.value ? " active" : ""}`}
                  onClick={() => set("role", opt.value)}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dados Principais */}
          <div className="add-athlete-section">
            <div className="add-athlete-section-title">Dados Principais</div>
            <div className="add-athlete-grid">
              <div className="add-athlete-field required">
                <label htmlFor="aa-name">Nome completo</label>
                <input
                  id="aa-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Ex: João da Silva"
                  autoComplete="off"
                />
                {errors.name && (
                  <span className="add-athlete-error">{errors.name}</span>
                )}
              </div>

              <div className="add-athlete-field">
                <label htmlFor="aa-nickname">Apelido</label>
                <input
                  id="aa-nickname"
                  type="text"
                  value={form.nickname}
                  onChange={(e) => set("nickname", e.target.value)}
                  placeholder="Ex: Joãozinho"
                />
              </div>

              <div className="add-athlete-field">
                <label htmlFor="aa-email">E-mail</label>
                <input
                  id="aa-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="atleta@email.com"
                  autoComplete="off"
                />
                {errors.email && (
                  <span className="add-athlete-error">{errors.email}</span>
                )}
                <span className="add-athlete-hint">
                  Se informado, cria uma conta para o atleta fazer login.
                </span>
              </div>

              <div className="add-athlete-field">
                <label htmlFor="aa-phone">Telefone</label>
                <input
                  id="aa-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
          </div>

          {/* Dados Pessoais */}
          <div className="add-athlete-section">
            <div className="add-athlete-section-title">Dados Pessoais</div>
            <div className="add-athlete-grid">
              <div className="add-athlete-field">
                <label htmlFor="aa-gender">Sexo</label>
                <select
                  id="aa-gender"
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                >
                  <option value="">Não informado</option>
                  <option value="MALE">Masculino</option>
                  <option value="FEMALE">Feminino</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>

              <div className="add-athlete-field">
                <label htmlFor="aa-birthdate">Data de nascimento</label>
                <input
                  id="aa-birthdate"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => set("birthDate", e.target.value)}
                />
              </div>

              <div className="add-athlete-field">
                <label htmlFor="aa-cpf">CPF</label>
                <input
                  id="aa-cpf"
                  type="text"
                  value={form.cpf}
                  onChange={(e) => set("cpf", e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                {errors.cpf && (
                  <span className="add-athlete-error">{errors.cpf}</span>
                )}
              </div>
            </div>
          </div>

          {/* Dados Esportivos */}
          <div className="add-athlete-section">
            <div className="add-athlete-section-title">Dados Esportivos</div>
            <div className="add-athlete-grid">
              <div className="add-athlete-field">
                <label htmlFor="aa-category">Categoria</label>
                <select
                  id="aa-category"
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                >
                  <option value="">Não informado</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="add-athlete-field">
                <label htmlFor="aa-ranking">Ranking</label>
                <input
                  id="aa-ranking"
                  type="number"
                  value={form.ranking}
                  onChange={(e) => set("ranking", e.target.value)}
                  placeholder="Ex: 42"
                  min={1}
                />
                {errors.ranking && (
                  <span className="add-athlete-error">{errors.ranking}</span>
                )}
              </div>

              <div className="add-athlete-field add-athlete-field--full">
                <label htmlFor="aa-entity">Entidade esportiva</label>
                <input
                  id="aa-entity"
                  type="text"
                  value={form.entity}
                  onChange={(e) => set("entity", e.target.value)}
                  placeholder="Ex: Federação Paulista de Tênis"
                />
              </div>
            </div>
          </div>

          {/* Responsáveis (menores) */}
          {form.role === "ATHLETE" && (
            <div className="add-athlete-section">
              <div className="add-athlete-section-title">
                Responsáveis{" "}
                <span className="add-athlete-section-hint">
                  (menores de 18)
                </span>
              </div>
              <div className="add-athlete-grid">
                <div className="add-athlete-field">
                  <label htmlFor="aa-father">Nome do pai</label>
                  <input
                    id="aa-father"
                    type="text"
                    value={form.fatherName}
                    onChange={(e) => set("fatherName", e.target.value)}
                    placeholder="Nome completo do pai"
                  />
                </div>

                <div className="add-athlete-field">
                  <label htmlFor="aa-fathercpf">CPF do pai</label>
                  <input
                    id="aa-fathercpf"
                    type="text"
                    value={form.fatherCpf}
                    onChange={(e) => set("fatherCpf", e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>

                <div className="add-athlete-field">
                  <label htmlFor="aa-mother">Nome da mãe</label>
                  <input
                    id="aa-mother"
                    type="text"
                    value={form.motherName}
                    onChange={(e) => set("motherName", e.target.value)}
                    placeholder="Nome completo da mãe"
                  />
                </div>

                <div className="add-athlete-field">
                  <label htmlFor="aa-mothercpf">CPF da mãe</label>
                  <input
                    id="aa-mothercpf"
                    type="text"
                    value={form.motherCpf}
                    onChange={(e) => set("motherCpf", e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer com ações */}
          <div className="add-athlete-footer">
            <button
              type="button"
              className="add-athlete-btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="add-athlete-btn-save"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="add-athlete-spinner" />
                  Cadastrando...
                </>
              ) : (
                "✅ Cadastrar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAthleteModal;
