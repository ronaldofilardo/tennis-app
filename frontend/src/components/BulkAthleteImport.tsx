// frontend/src/components/BulkAthleteImport.tsx
// Componente de importação em massa de atletas via XLSX
// Faz parsing do arquivo no frontend e envia JSON para a API

import React, { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import httpClient from "../config/httpClient";
import { useToast } from "./Toast";
import "./BulkAthleteImport.css";

// ── Mapeamento de colunas (PT-BR → campo interno) ──
const COLUMN_MAP: Record<string, string> = {
  // Português
  nome: "name",
  "nome completo": "name",
  email: "email",
  "e-mail": "email",
  sexo: "gender",
  gênero: "gender",
  genero: "gender",
  cpf: "cpf",
  "data de nascimento": "birthDate",
  "data nascimento": "birthDate",
  nascimento: "birthDate",
  "dt nascimento": "birthDate",
  "dt. nascimento": "birthDate",
  categoria: "category",
  entidade: "entity",
  "nome do pai": "fatherName",
  "nome pai": "fatherName",
  pai: "fatherName",
  "cpf do pai": "fatherCpf",
  "cpf pai": "fatherCpf",
  "nome da mãe": "motherName",
  "nome da mae": "motherName",
  "nome mãe": "motherName",
  "nome mae": "motherName",
  mãe: "motherName",
  mae: "motherName",
  "cpf da mãe": "motherCpf",
  "cpf da mae": "motherCpf",
  "cpf mãe": "motherCpf",
  "cpf mae": "motherCpf",
  // Inglês (fallback)
  name: "name",
  gender: "gender",
  "birth date": "birthDate",
  birthdate: "birthDate",
  category: "category",
  entity: "entity",
  "father name": "fatherName",
  "father cpf": "fatherCpf",
  "mother name": "motherName",
  "mother cpf": "motherCpf",
};

const REQUIRED_FIELDS = ["name", "email"];

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  email: "E-mail",
  gender: "Sexo",
  cpf: "CPF",
  birthDate: "Data Nasc.",
  category: "Categoria",
  entity: "Entidade",
  fatherName: "Nome do Pai",
  fatherCpf: "CPF do Pai",
  motherName: "Nome da Mãe",
  motherCpf: "CPF da Mãe",
};

interface AthleteRow {
  name: string;
  email: string;
  gender?: string;
  cpf?: string;
  birthDate?: string;
  category?: string;
  entity?: string;
  fatherName?: string;
  fatherCpf?: string;
  motherName?: string;
  motherCpf?: string;
  _valid?: boolean;
  _error?: string;
}

interface ImportResult {
  message: string;
  created: number;
  skipped: number;
  errors: Array<{ row: number; name?: string; error: string }>;
}

interface BulkAthleteImportProps {
  clubId: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

// ── Helpers ──

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mapHeaders(rawHeaders: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  rawHeaders.forEach((raw, idx) => {
    const normalized = normalizeHeader(raw);
    // Tenta sem acento
    const field = COLUMN_MAP[normalized];
    if (field) {
      mapping[idx] = field;
    }
  });
  return mapping;
}

function parseExcelDate(value: unknown): string | undefined {
  if (!value) return undefined;
  // Número serial do Excel
  if (typeof value === "number") {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0];
  }
  // String
  const str = String(value).trim();
  // DD/MM/YYYY
  const brDate = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brDate) {
    return `${brDate[3]}-${brDate[2].padStart(2, "0")}-${brDate[1].padStart(2, "0")}`;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  return str;
}

function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function validateRow(row: AthleteRow): AthleteRow {
  const errors: string[] = [];

  if (!row.name?.trim()) errors.push("Nome obrigatório");
  if (!row.email?.trim()) errors.push("E-mail obrigatório");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim()))
    errors.push("E-mail inválido");

  if (row.cpf) {
    const digits = row.cpf.replace(/\D/g, "");
    if (digits.length !== 11) errors.push("CPF deve ter 11 dígitos");
  }

  return {
    ...row,
    _valid: errors.length === 0,
    _error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}

// ── Template XLSX ──
function downloadTemplate() {
  const headers = [
    "Nome",
    "Email",
    "Sexo",
    "CPF",
    "Data de Nascimento",
    "Categoria",
    "Entidade",
    "Nome do Pai",
    "CPF do Pai",
    "Nome da Mãe",
    "CPF da Mãe",
  ];
  const example = [
    "João Silva",
    "joao@email.com",
    "MALE",
    "12345678901",
    "15/03/2000",
    "ADULTO",
    "CBT",
    "Carlos Silva",
    "98765432100",
    "Maria Silva",
    "11122233344",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Atletas");

  // Largura das colunas
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));

  XLSX.writeFile(wb, "template_importacao_atletas.xlsx");
}

// ── Componente Principal ──
const BulkAthleteImport: React.FC<BulkAthleteImportProps> = ({
  clubId,
  onComplete,
  onCancel,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [fileName, setFileName] = useState("");
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [unmappedCols, setUnmappedCols] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // ── Processar arquivo XLSX ──
  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array", cellDates: false });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];

          // Pegar como array de arrays para mapear headers
          const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: "",
          });

          if (raw.length < 2) {
            toast.error(
              "Planilha vazia ou sem dados. A primeira linha deve conter os cabeçalhos.",
            );
            return;
          }

          const rawHeaders = (raw[0] as string[]).map(String);
          const headerMap = mapHeaders(rawHeaders);

          // Detectar colunas não mapeadas
          const unmapped = rawHeaders.filter(
            (_, idx) => !headerMap[idx] && rawHeaders[idx]?.trim(),
          );
          setUnmappedCols(unmapped);

          // Verificar campos obrigatórios
          const mappedFields = new Set(Object.values(headerMap));
          const missingRequired = REQUIRED_FIELDS.filter(
            (f) => !mappedFields.has(f),
          );
          if (missingRequired.length > 0) {
            toast.error(
              `Colunas obrigatórias não encontradas: ${missingRequired.map((f) => FIELD_LABELS[f]).join(", ")}. ` +
                `Verifique os cabeçalhos da planilha.`,
            );
            return;
          }

          // Converter rows
          const rows: AthleteRow[] = [];
          for (let r = 1; r < raw.length; r++) {
            const rowData = raw[r] as unknown[];
            if (!rowData || rowData.every((cell) => !cell)) continue; // pular linhas vazias

            const athlete: Record<string, string | undefined> = {};
            Object.entries(headerMap).forEach(([colIdx, field]) => {
              const cellValue = rowData[Number(colIdx)];
              if (field === "birthDate") {
                athlete[field] = parseExcelDate(cellValue);
              } else {
                athlete[field] =
                  cellValue != null ? String(cellValue).trim() : undefined;
              }
            });

            rows.push(validateRow(athlete as unknown as AthleteRow));
          }

          if (rows.length === 0) {
            toast.error("Nenhum registro encontrado na planilha.");
            return;
          }

          if (rows.length > 500) {
            toast.error(
              `Máximo de 500 registros por importação. A planilha tem ${rows.length}.`,
            );
            return;
          }

          setAthletes(rows);
          setStep("preview");
          toast.success(`${rows.length} registro(s) carregado(s) da planilha.`);
        } catch (err) {
          console.error("[BulkImport] Parse error:", err);
          toast.error("Erro ao ler a planilha. Verifique se o formato é XLSX.");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [toast],
  );

  // ── Enviar para API ──
  const handleImport = useCallback(async () => {
    const validAthletes = athletes.filter((a) => a._valid);
    if (validAthletes.length === 0) {
      toast.error("Nenhum registro válido para importar.");
      return;
    }

    setImporting(true);
    try {
      // Remover campos internos antes de enviar
      const payload = validAthletes.map(({ _valid, _error, ...rest }) => rest);

      const response = await httpClient.post<ImportResult>(
        `/clubs/${clubId}/members/import`,
        { athletes: payload },
      );

      setResult(response.data);
      setStep("result");

      if (response.data.created > 0) {
        toast.success(
          `${response.data.created} atleta(s) importado(s) com sucesso!`,
        );
      }
      if (response.data.skipped > 0) {
        toast.warning(`${response.data.skipped} registro(s) ignorado(s).`);
      }
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: { error?: string } } })
        ?.response?.data;
      toast.error(errorData?.error || "Erro ao importar atletas.");
    } finally {
      setImporting(false);
    }
  }, [athletes, clubId, toast]);

  // ── Reset ──
  const handleReset = useCallback(() => {
    setStep("upload");
    setFileName("");
    setAthletes([]);
    setUnmappedCols([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const validCount = athletes.filter((a) => a._valid).length;
  const invalidCount = athletes.filter((a) => !a._valid).length;

  // ══════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════

  return (
    <div className="bulk-import-container">
      <div className="bulk-import-header">
        <h3>📤 Importação em Massa de Atletas</h3>
        <p className="bulk-import-subtitle">
          Envie uma planilha XLSX com os dados dos atletas. Cada atleta receberá
          uma conta com senha temporária (6 primeiros dígitos do CPF ou
          "123456").
        </p>
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === "upload" && (
        <div className="bulk-import-upload">
          <div className="bulk-import-actions-top">
            <button
              type="button"
              className="bulk-import-btn-template"
              onClick={downloadTemplate}
            >
              📋 Baixar Template
            </button>
          </div>

          <div
            className="bulk-import-dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file && fileInputRef.current) {
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInputRef.current.files = dt.files;
                fileInputRef.current.dispatchEvent(
                  new Event("change", { bubbles: true }),
                );
              }
            }}
          >
            <div className="dropzone-icon">📂</div>
            <p>Clique ou arraste um arquivo XLSX aqui</p>
            <span className="dropzone-hint">
              Máximo 500 registros por importação
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              style={{ display: "none" }}
            />
          </div>

          <div className="bulk-import-fields-info">
            <h4>Colunas esperadas:</h4>
            <div className="fields-grid">
              {Object.entries(FIELD_LABELS).map(([key, label]) => (
                <span
                  key={key}
                  className={`field-tag ${REQUIRED_FIELDS.includes(key) ? "required" : ""}`}
                >
                  {label}
                  {REQUIRED_FIELDS.includes(key) && " *"}
                </span>
              ))}
            </div>
            <div className="fields-docs-preview">
              <span className="field-tag disabled">📄 RG (em breve)</span>
              <span className="field-tag disabled">
                🏥 Atestado Médico (em breve)
              </span>
            </div>
          </div>

          {onCancel && (
            <button
              type="button"
              className="bulk-import-btn-cancel"
              onClick={onCancel}
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {/* ── STEP 2: Preview ── */}
      {step === "preview" && (
        <div className="bulk-import-preview">
          <div className="preview-summary">
            <span className="preview-file">📄 {fileName}</span>
            <span className="preview-stats">
              <span className="stat-valid">✅ {validCount} válidos</span>
              {invalidCount > 0 && (
                <span className="stat-invalid">
                  ❌ {invalidCount} com erros
                </span>
              )}
              <span className="stat-total">Total: {athletes.length}</span>
            </span>
          </div>

          {unmappedCols.length > 0 && (
            <div className="preview-warning">
              ⚠️ Colunas ignoradas (não reconhecidas):{" "}
              <strong>{unmappedCols.join(", ")}</strong>
            </div>
          )}

          <div className="preview-table-wrapper">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Status</th>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>CPF</th>
                  <th>Sexo</th>
                  <th>Data Nasc.</th>
                  <th>Categoria</th>
                  <th>Entidade</th>
                  <th>Pai</th>
                  <th>Mãe</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map((a, idx) => (
                  <tr key={idx} className={a._valid ? "" : "row-invalid"}>
                    <td>{idx + 1}</td>
                    <td>
                      {a._valid ? (
                        <span className="status-ok">✅</span>
                      ) : (
                        <span className="status-err" title={a._error}>
                          ❌
                        </span>
                      )}
                    </td>
                    <td>{a.name}</td>
                    <td>{a.email}</td>
                    <td>{a.cpf ? formatCpf(a.cpf) : "—"}</td>
                    <td>
                      {a.gender === "MALE"
                        ? "M"
                        : a.gender === "FEMALE"
                          ? "F"
                          : a.gender || "—"}
                    </td>
                    <td>
                      {a.birthDate
                        ? new Date(
                            a.birthDate + "T00:00:00",
                          ).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td>{a.category || "—"}</td>
                    <td>{a.entity || "—"}</td>
                    <td>{a.fatherName || "—"}</td>
                    <td>{a.motherName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Erros detalhados */}
          {invalidCount > 0 && (
            <div className="preview-errors">
              <h4>❌ Registros com erros ({invalidCount}):</h4>
              <ul>
                {athletes
                  .map((a, idx) => ({ ...a, _idx: idx + 1 }))
                  .filter((a) => !a._valid)
                  .map((a) => (
                    <li key={a._idx}>
                      <strong>Linha {a._idx}</strong>
                      {a.name ? ` (${a.name})` : ""}: {a._error}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="preview-actions">
            <button
              type="button"
              className="bulk-import-btn-cancel"
              onClick={handleReset}
            >
              ← Voltar
            </button>
            <button
              type="button"
              className="bulk-import-btn-import"
              onClick={handleImport}
              disabled={importing || validCount === 0}
            >
              {importing
                ? "Importando..."
                : `Importar ${validCount} Atleta${validCount !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Result ── */}
      {step === "result" && result && (
        <div className="bulk-import-result">
          <div className="result-summary">
            <div className="result-card success">
              <span className="result-number">{result.created}</span>
              <span className="result-label">Importados</span>
            </div>
            <div className="result-card warning">
              <span className="result-number">{result.skipped}</span>
              <span className="result-label">Ignorados</span>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="result-errors">
              <h4>Detalhes dos erros:</h4>
              <ul>
                {result.errors.map((err, idx) => (
                  <li key={idx}>
                    <strong>Linha {err.row}</strong>
                    {err.name ? ` (${err.name})` : ""}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="result-actions">
            <button
              type="button"
              className="bulk-import-btn-cancel"
              onClick={() => {
                handleReset();
                onComplete?.();
              }}
            >
              Fechar
            </button>
            <button
              type="button"
              className="bulk-import-btn-template"
              onClick={handleReset}
            >
              Nova Importação
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkAthleteImport;
