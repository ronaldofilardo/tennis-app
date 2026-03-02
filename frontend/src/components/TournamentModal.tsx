// frontend/src/components/TournamentModal.tsx
// Modal de criação/edição de torneio com categorias — Fase 3

import React, { useState } from "react";
import httpClient from "../config/httpClient";
import "./TournamentModal.css";

interface TournamentCategory {
  name: string;
  gender?: string;
  ageGroup?: string;
  maxPlayers?: number;
  bracketType?: string;
}

interface TournamentFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  format: string;
  sportType: string;
  courtType: string;
  maxPlayers: string;
  categories: TournamentCategory[];
}

interface TournamentModalProps {
  onClose: () => void;
  onCreated: () => void;
  /** Para edição — dados existentes */
  editData?: {
    id: string;
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    format?: string;
    sportType?: string;
    courtType?: string;
    maxPlayers?: number;
    categories?: TournamentCategory[];
  };
}

const FORMATS = [
  { value: "SINGLE_ELIMINATION", label: "Eliminação Simples" },
  { value: "DOUBLE_ELIMINATION", label: "Eliminação Dupla" },
  { value: "ROUND_ROBIN", label: "Todos contra Todos" },
  { value: "GROUP_STAGE", label: "Fase de Grupos" },
];

const COURT_TYPES = [
  { value: "", label: "Não especificado" },
  { value: "GRASS", label: "Grama" },
  { value: "CLAY", label: "Saibro" },
  { value: "HARD", label: "Dura" },
  { value: "INDOOR", label: "Indoor" },
];

const GENDERS = [
  { value: "", label: "Misto" },
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
];

const BRACKET_TYPES = [
  { value: "", label: "Padrão do torneio" },
  { value: "SINGLE_ELIMINATION", label: "Eliminação Simples" },
  { value: "ROUND_ROBIN", label: "Todos contra Todos" },
  { value: "GROUP_STAGE", label: "Fase de Grupos" },
];

const EMPTY_CATEGORY: TournamentCategory = {
  name: "",
  gender: "",
  ageGroup: "",
  maxPlayers: undefined,
  bracketType: "",
};

const TournamentModal: React.FC<TournamentModalProps> = ({
  onClose,
  onCreated,
  editData,
}) => {
  const [form, setForm] = useState<TournamentFormData>({
    name: editData?.name || "",
    description: editData?.description || "",
    startDate: editData?.startDate?.split("T")[0] || "",
    endDate: editData?.endDate?.split("T")[0] || "",
    format: editData?.format || "SINGLE_ELIMINATION",
    sportType: editData?.sportType || "TENNIS",
    courtType: editData?.courtType || "",
    maxPlayers: editData?.maxPlayers?.toString() || "",
    categories: editData?.categories?.length
      ? editData.categories
      : [{ ...EMPTY_CATEGORY }],
  });

  const [activeTab, setActiveTab] = useState<"info" | "categories">("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof TournamentFormData>(
    key: K,
    value: TournamentFormData[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateCategory = (
    index: number,
    field: keyof TournamentCategory,
    value: string | number | undefined,
  ) => {
    setForm((prev) => {
      const cats = [...prev.categories];
      cats[index] = { ...cats[index], [field]: value };
      return { ...prev, categories: cats };
    });
  };

  const addCategory = () => {
    setForm((prev) => ({
      ...prev,
      categories: [...prev.categories, { ...EMPTY_CATEGORY }],
    }));
  };

  const removeCategory = (index: number) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Nome do torneio é obrigatório.");
      return;
    }

    // Filtrar categorias válidas (com nome)
    const validCategories = form.categories
      .filter((c) => c.name.trim())
      .map((c) => ({
        name: c.name.trim(),
        gender: c.gender || undefined,
        ageGroup: c.ageGroup || undefined,
        maxPlayers: c.maxPlayers || undefined,
        bracketType: c.bracketType || undefined,
      }));

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      format: form.format,
      sportType: form.sportType,
      courtType: form.courtType || undefined,
      maxPlayers: form.maxPlayers ? parseInt(form.maxPlayers) : undefined,
      categories: validCategories.length > 0 ? validCategories : undefined,
    };

    setLoading(true);

    try {
      if (editData?.id) {
        await httpClient.patch(`/tournaments/${editData.id}`, payload);
      } else {
        await httpClient.post("/tournaments", payload);
      }
      onCreated();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "responseData" in err
          ? ((err as { responseData: { error?: string } }).responseData
              ?.error ?? "Erro ao salvar torneio.")
          : "Erro ao conectar. Tente novamente.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="tournament-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="tournament-modal-title"
      >
        <div className="modal-header">
          <h2 id="tournament-modal-title">
            {editData ? "Editar Torneio" : "Novo Torneio"}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === "info" ? "active" : ""}`}
            onClick={() => setActiveTab("info")}
            type="button"
          >
            Informações
          </button>
          <button
            className={`modal-tab ${activeTab === "categories" ? "active" : ""}`}
            onClick={() => setActiveTab("categories")}
            type="button"
          >
            Categorias ({form.categories.filter((c) => c.name.trim()).length})
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* === Tab: Informações Gerais === */}
          {activeTab === "info" && (
            <div className="modal-tab-content">
              <div className="form-field">
                <label htmlFor="t-name">Nome do Torneio *</label>
                <input
                  id="t-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Ex: Copa Primavera 2025"
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="t-desc">Descrição</label>
                <textarea
                  id="t-desc"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Detalhes do torneio..."
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="t-start">Data Início</label>
                  <input
                    id="t-start"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => updateField("startDate", e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="t-end">Data Fim</label>
                  <input
                    id="t-end"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => updateField("endDate", e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="t-format">Formato</label>
                  <select
                    id="t-format"
                    value={form.format}
                    onChange={(e) => updateField("format", e.target.value)}
                    disabled={loading}
                  >
                    {FORMATS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="t-court">Tipo de Quadra</label>
                  <select
                    id="t-court"
                    value={form.courtType}
                    onChange={(e) => updateField("courtType", e.target.value)}
                    disabled={loading}
                  >
                    {COURT_TYPES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="t-max">Máximo de Jogadores</label>
                <input
                  id="t-max"
                  type="number"
                  min="2"
                  max="256"
                  value={form.maxPlayers}
                  onChange={(e) => updateField("maxPlayers", e.target.value)}
                  placeholder="Sem limite"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* === Tab: Categorias === */}
          {activeTab === "categories" && (
            <div className="modal-tab-content">
              <p className="categories-hint">
                Categorias permitem dividir o torneio por gênero, faixa etária
                ou nível. Cada categoria pode ter seu próprio chaveamento.
              </p>

              {form.categories.map((cat, idx) => (
                <div key={idx} className="category-row">
                  <div className="category-header">
                    <span className="category-number">Categoria {idx + 1}</span>
                    {form.categories.length > 1 && (
                      <button
                        type="button"
                        className="btn-remove-category"
                        onClick={() => removeCategory(idx)}
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>Nome *</label>
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) =>
                          updateCategory(idx, "name", e.target.value)
                        }
                        placeholder="Ex: Masculino A"
                        disabled={loading}
                      />
                    </div>
                    <div className="form-field">
                      <label>Gênero</label>
                      <select
                        value={cat.gender || ""}
                        onChange={(e) =>
                          updateCategory(idx, "gender", e.target.value)
                        }
                        disabled={loading}
                      >
                        {GENDERS.map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>Faixa Etária</label>
                      <input
                        type="text"
                        value={cat.ageGroup || ""}
                        onChange={(e) =>
                          updateCategory(idx, "ageGroup", e.target.value)
                        }
                        placeholder="Ex: Sub-18, 40+"
                        disabled={loading}
                      />
                    </div>
                    <div className="form-field">
                      <label>Chaveamento</label>
                      <select
                        value={cat.bracketType || ""}
                        onChange={(e) =>
                          updateCategory(idx, "bracketType", e.target.value)
                        }
                        disabled={loading}
                      >
                        {BRACKET_TYPES.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="btn-add-category"
                onClick={addCategory}
                disabled={loading}
              >
                + Adicionar Categoria
              </button>
            </div>
          )}

          {/* Error + Submit */}
          {error && <div className="modal-error">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading
                ? "Salvando..."
                : editData
                  ? "Salvar Alterações"
                  : "Criar Torneio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TournamentModal;
