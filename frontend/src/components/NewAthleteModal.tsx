import React, { useState } from 'react';
import { httpClient } from '../config/httpClient';
import { useToast } from './Toast';
import './NewAthleteModal.css';
import type { MyAthlete } from './MyAthleteDropdown';

interface NewAthleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (athlete: MyAthlete) => void;
}

const NewAthleteModal: React.FC<NewAthleteModalProps> = ({ isOpen, onClose, onCreated }) => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [clubName, setClubName] = useState('');
  const [dominance, setDominance] = useState('');
  const [backhand, setBackhand] = useState('');
  const [ranking, setRanking] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await httpClient.post<MyAthlete>('/athletes', {
        name: name.trim(),
        gender: gender || null,
        age: age ? parseInt(age) : null,
        clubName: clubName.trim() || null,
        dominance: dominance || null,
        backhand: backhand || null,
        ranking: ranking ? parseInt(ranking) : null,
      });

      const athlete = response.data;
      toast.success(`Atleta ${athlete.name} cadastrado com sucesso!`);
      onCreated(athlete);
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('[NewAthleteModal] error creating athlete:', err);
      toast.error(err?.response?.data?.error || 'Erro ao cadastrar atleta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setGender('');
    setAge('');
    setClubName('');
    setDominance('');
    setBackhand('');
    setRanking('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="new-athlete-modal-overlay" onClick={handleClose} onKeyDown={handleKeyDown}>
      <div className="new-athlete-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="new-athlete-modal-header">
          <h2 className="new-athlete-modal-title">Cadastrar Novo Atleta</h2>
          <button
            type="button"
            className="new-athlete-modal-close"
            onClick={handleClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form className="new-athlete-modal-form" onSubmit={handleSubmit}>
          {/* Nome (obrigatório) */}
          <div className="new-athlete-form-group">
            <label htmlFor="athlete-name">
              Nome <span className="required">*</span>
            </label>
            <input
              id="athlete-name"
              type="text"
              placeholder="Ex: João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {/* Sexo */}
          <div className="new-athlete-form-group">
            <label htmlFor="athlete-gender">Sexo</label>
            <select
              id="athlete-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">—</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>

          {/* Idade */}
          <div className="new-athlete-form-group">
            <label htmlFor="athlete-age">Idade</label>
            <input
              id="athlete-age"
              type="number"
              min="1"
              max="99"
              placeholder="Ex: 25"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Clube */}
          <div className="new-athlete-form-group">
            <label htmlFor="athlete-club">Clube</label>
            <input
              id="athlete-club"
              type="text"
              placeholder="Ex: Club Atlético"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Dominância */}
          <div className="new-athlete-form-group">
            <label htmlFor="athlete-dominance">Dominância</label>
            <select
              id="athlete-dominance"
              value={dominance}
              onChange={(e) => setDominance(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">—</option>
              <option value="RIGHT">Direita</option>
              <option value="LEFT">Esquerda</option>
              <option value="AMBIDEXTROUS">Ambidestro</option>
            </select>
          </div>

          {/* Backhand */}
          <div className="new-athlete-form-group">
            <label htmlFor="athlete-backhand">Backhand</label>
            <select
              id="athlete-backhand"
              value={backhand}
              onChange={(e) => setBackhand(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">—</option>
              <option value="ONE_HAND">1 mão</option>
              <option value="TWO_HAND">2 mãos</option>
            </select>
          </div>

          {/* Ranking */}
          <div className="new-athlete-form-group">
            <label htmlFor="athlete-ranking">Posição no Ranking</label>
            <input
              id="athlete-ranking"
              type="number"
              min="1"
              placeholder="Ex: 150"
              value={ranking}
              onChange={(e) => setRanking(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Buttons */}
          <div className="new-athlete-modal-footer">
            <button
              type="button"
              className="new-athlete-modal-btn-cancel"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="new-athlete-modal-btn-save"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Atleta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewAthleteModal;
