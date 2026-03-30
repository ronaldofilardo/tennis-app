// frontend/src/components/EditMemberModal.tsx
// Modal para o GESTOR editar dados de um atleta ou técnico do clube.
// Atleta: edita AthleteProfile (nome, apelido, telefone, sexo, nascimento, categoria, ranking).
// Técnico: edita User (nome, email).

import React, { useState, useEffect, useRef } from 'react';
import { httpClient } from '../config/httpClient';
import { useToast } from './Toast';
import useConfirmClose from '../hooks/useConfirmClose';
import ConfirmCloseDialog from './ConfirmCloseDialog';
import './AddAthleteModal.css';

export interface EditableMember {
  id: string; // membership ID
  userId: string | null;
  clubId: string;
  role: string;
  user: {
    id: string | null;
    email: string | null;
    name: string;
    athleteProfile?: {
      id: string;
      globalId: string;
      cpf?: string | null;
      birthDate?: string | null;
    } | null;
  };
}

interface EditMemberModalProps {
  isOpen: boolean;
  member: EditableMember | null;
  clubId: string;
  onClose: () => void;
  onSuccess: () => void;
}

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

interface AthleteFullProfile {
  name: string;
  nickname?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  category?: string | null;
  gender?: string | null;
  ranking?: number | null;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({
  isOpen,
  member,
  clubId,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Shared
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Athlete-only
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState('');
  const [ranking, setRanking] = useState('');

  // Track initial values to detect dirty state
  const initialRef = useRef({
    name: '',
    email: '',
    cpf: '',
    birthDate: '',
    nickname: '',
    phone: '',
    category: '',
    gender: '',
    ranking: '',
  });

  const isCoach = member?.role === 'COACH';
  const isAthlete = member?.role === 'ATHLETE';

  const isFormDirty =
    name !== initialRef.current.name ||
    email !== initialRef.current.email ||
    cpf !== initialRef.current.cpf ||
    birthDate !== initialRef.current.birthDate ||
    nickname !== initialRef.current.nickname ||
    phone !== initialRef.current.phone ||
    category !== initialRef.current.category ||
    gender !== initialRef.current.gender ||
    ranking !== initialRef.current.ranking;

  const { isConfirmOpen, handleOverlayClick, confirmClose, cancelClose } = useConfirmClose(
    isFormDirty,
    onClose,
  );

  useEffect(() => {
    if (!isOpen || !member) return;

    if (isCoach) {
      const initName = member.user.name ?? '';
      const initEmail = member.user.email?.includes('@') ? member.user.email : '';
      const initCpf = member.user.athleteProfile?.cpf ?? '';
      const initBirthDate = member.user.athleteProfile?.birthDate
        ? String(member.user.athleteProfile.birthDate).substring(0, 10)
        : '';
      setName(initName);
      setEmail(initEmail);
      setCpf(initCpf);
      setBirthDate(initBirthDate);
      initialRef.current = {
        name: initName,
        email: initEmail,
        cpf: initCpf,
        birthDate: initBirthDate,
        nickname: '',
        phone: '',
        category: '',
        gender: '',
        ranking: '',
      };
    } else if (isAthlete) {
      const profileId = member.user.athleteProfile?.id;
      if (profileId) {
        setLoadingProfile(true);
        httpClient
          .get<AthleteFullProfile>(`/athletes/${profileId}`)
          .then((res) => {
            const p = res.data;
            const initName = p.name ?? '';
            const initNickname = p.nickname ?? '';
            const initBirthDate = p.birthDate ? String(p.birthDate).substring(0, 10) : '';
            const initPhone = p.phone ?? '';
            const initCategory = p.category ?? '';
            const initGender = p.gender ?? '';
            const initRanking = p.ranking != null ? String(p.ranking) : '';
            setName(initName);
            setNickname(initNickname);
            setBirthDate(initBirthDate);
            setPhone(initPhone);
            setCategory(initCategory);
            setGender(initGender);
            setRanking(initRanking);
            initialRef.current = {
              name: initName,
              email: '',
              cpf: '',
              birthDate: initBirthDate,
              nickname: initNickname,
              phone: initPhone,
              category: initCategory,
              gender: initGender,
              ranking: initRanking,
            };
          })
          .catch(() => toast.error('Erro ao carregar dados do atleta'))
          .finally(() => setLoadingProfile(false));
      } else {
        // Atleta convidado sem AthleteProfile ligado
        const initName = member.user.name ?? '';
        setName(initName);
        initialRef.current = { ...initialRef.current, name: initName };
      }
    }
  }, [isOpen, member]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !member) return null;

  const roleLabel = isCoach ? 'Técnico' : 'Atleta';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      if (isCoach) {
        await httpClient.patch(`/clubs/${clubId}/members/${member.id}/profile`, {
          name: name.trim(),
          email: email.trim() || undefined,
          cpf: cpf.replace(/\D/g, '') || undefined,
          birthDate: birthDate || undefined,
        });
      } else {
        const profileId = member.user.athleteProfile?.id;
        if (!profileId) throw new Error('Perfil de atleta não encontrado');
        await httpClient.patch(`/athletes/${profileId}`, {
          name: name.trim(),
          nickname: nickname.trim() || undefined,
          birthDate: birthDate || undefined,
          phone: phone.trim() || undefined,
          category: category || undefined,
          gender: gender || undefined,
          ranking: ranking ? parseInt(ranking, 10) : undefined,
        });
      }
      toast.success('Dados atualizados com sucesso!');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Erro ao salvar. Tente novamente.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="add-athlete-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-member-title"
      onClick={handleOverlayClick}
      style={{ position: 'relative' }}
    >
      <ConfirmCloseDialog isOpen={isConfirmOpen} onConfirm={confirmClose} onCancel={cancelClose} />
      <div className="add-athlete-modal">
        {/* Header */}
        <div className="add-athlete-header">
          <div>
            <h2 id="edit-member-title">Editar {roleLabel}</h2>
            <p className="add-athlete-subtitle">{member.user.name}</p>
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

        {loadingProfile ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: 'var(--clr-text-muted, #6b7280)',
            }}
          >
            <div className="add-athlete-spinner" style={{ margin: '0 auto 8px' }} />
            Carregando dados...
          </div>
        ) : (
          <form className="add-athlete-form" onSubmit={handleSubmit} noValidate>
            {/* Dados Principais */}
            <div className="add-athlete-section">
              <div className="add-athlete-section-title">Dados Principais</div>
              <div className="add-athlete-grid">
                <div className="add-athlete-field required">
                  <label htmlFor="em-name">Nome completo</label>
                  <input
                    id="em-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome do membro"
                    autoComplete="off"
                  />
                </div>

                {isCoach && (
                  <>
                    <div className="add-athlete-field">
                      <label htmlFor="em-email">E-mail</label>
                      <input
                        id="em-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        autoComplete="off"
                      />
                    </div>
                    <div className="add-athlete-field">
                      <label htmlFor="em-cpf">CPF</label>
                      <input
                        id="em-cpf"
                        type="text"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        autoComplete="off"
                        maxLength={14}
                      />
                    </div>
                    <div className="add-athlete-field">
                      <label htmlFor="em-birthdate-coach">Data de nascimento</label>
                      <input
                        id="em-birthdate-coach"
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {isAthlete && (
                  <>
                    <div className="add-athlete-field">
                      <label htmlFor="em-nickname">Apelido</label>
                      <input
                        id="em-nickname"
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Apelido (opcional)"
                      />
                    </div>
                    <div className="add-athlete-field">
                      <label htmlFor="em-phone">Telefone</label>
                      <input
                        id="em-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Dados Pessoais — apenas atleta */}
            {isAthlete && (
              <div className="add-athlete-section">
                <div className="add-athlete-section-title">Dados Pessoais</div>
                <div className="add-athlete-grid">
                  <div className="add-athlete-field">
                    <label htmlFor="em-gender">Sexo</label>
                    <select
                      id="em-gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="">Não informado</option>
                      <option value="MALE">Masculino</option>
                      <option value="FEMALE">Feminino</option>
                      <option value="OTHER">Outro</option>
                    </select>
                  </div>
                  <div className="add-athlete-field">
                    <label htmlFor="em-birthdate">Data de nascimento</label>
                    <input
                      id="em-birthdate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Dados Esportivos — apenas atleta */}
            {isAthlete && (
              <div className="add-athlete-section">
                <div className="add-athlete-section-title">Dados Esportivos</div>
                <div className="add-athlete-grid">
                  <div className="add-athlete-field">
                    <label htmlFor="em-category">Categoria</label>
                    <select
                      id="em-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
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
                    <label htmlFor="em-ranking">Ranking</label>
                    <input
                      id="em-ranking"
                      type="number"
                      value={ranking}
                      onChange={(e) => setRanking(e.target.value)}
                      placeholder="Ex: 42"
                      min={1}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
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
                    Salvando...
                  </>
                ) : (
                  '✅ Salvar'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditMemberModal;
