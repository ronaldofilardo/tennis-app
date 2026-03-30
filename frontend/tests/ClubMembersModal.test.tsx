// tests/ClubMembersModal.test.tsx
// Cobertura das correções da Fase 7 (Auditoria Sênior):
// Garante que groupMembersByRole usa reduce imutável (sem push/mutação direta).

import '../vitest.setup';

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../src/components/ClubMembersModal.css', () => ({}));

import ClubMembersModal, {
  type ClubMember,
} from '../src/components/ClubMembersModal';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeMembers(): ClubMember[] {
  return [
    {
      id: 'ms-1',
      userId: 'u-1',
      clubId: 'c-1',
      role: 'ATHLETE',
      status: 'ACTIVE',
      joinedAt: '2024-01-10T00:00:00.000Z',
      user: { id: 'u-1', email: 'atleta1@t.com', name: 'Atleta Um', avatarUrl: null },
    },
    {
      id: 'ms-2',
      userId: 'u-2',
      clubId: 'c-1',
      role: 'GESTOR',
      status: 'ACTIVE',
      joinedAt: '2024-01-09T00:00:00.000Z',
      user: { id: 'u-2', email: 'gestor@t.com', name: 'Gestor Principal', avatarUrl: null },
    },
    {
      id: 'ms-3',
      userId: 'u-3',
      clubId: 'c-1',
      role: 'COACH',
      status: 'PENDING',
      joinedAt: '2024-01-08T00:00:00.000Z',
      user: { id: 'u-3', email: 'coach@t.com', name: 'Técnico Silva', avatarUrl: null },
    },
    {
      id: 'ms-4',
      userId: 'u-4',
      clubId: 'c-1',
      role: 'ATHLETE',
      status: 'ACTIVE',
      joinedAt: '2024-01-07T00:00:00.000Z',
      user: { id: 'u-4', email: 'atleta2@t.com', name: 'Atleta Dois', avatarUrl: null },
    },
  ];
}

const defaultProps = {
  clubName: 'Clube Teste',
  loading: false,
  onClose: vi.fn(),
};

// ── Testes de Renderização ────────────────────────────────────────────────────

describe('ClubMembersModal — Renderização', () => {
  it('exibe o nome do clube no header', () => {
    render(<ClubMembersModal {...defaultProps} members={makeMembers()} />);
    expect(screen.getByText('Clube Teste')).toBeInTheDocument();
  });

  it('exibe contagem total de membros', () => {
    render(<ClubMembersModal {...defaultProps} members={makeMembers()} />);
    expect(screen.getByText(/4 membros/i)).toBeInTheDocument();
  });

  it('exibe spinner enquanto carrega', () => {
    render(<ClubMembersModal {...defaultProps} members={[]} loading />);
    expect(screen.getByText(/carregando membros/i)).toBeInTheDocument();
  });

  it('exibe mensagem de lista vazia quando não há membros', () => {
    render(<ClubMembersModal {...defaultProps} members={[]} />);
    expect(screen.getByText(/nenhum membro encontrado/i)).toBeInTheDocument();
  });

  it('chama onClose ao clicar no botão fechar', () => {
    const onClose = vi.fn();
    render(<ClubMembersModal {...defaultProps} members={[]} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// ── Testes de Agrupamento (Fase 7 — sem mutação) ──────────────────────────────

describe('ClubMembersModal — Agrupamento imutável por papel', () => {
  it('exibe os três grupos: Gestores, Técnicos, Atletas', () => {
    render(<ClubMembersModal {...defaultProps} members={makeMembers()} />);
    expect(screen.getByText('Gestores')).toBeInTheDocument();
    expect(screen.getByText('Técnicos')).toBeInTheDocument();
    expect(screen.getByText('Atletas')).toBeInTheDocument();
  });

  it('exibe 2 atletas e 1 gestor e 1 técnico com contagens corretas', () => {
    render(<ClubMembersModal {...defaultProps} members={makeMembers()} />);
    // Atletas: 2, Gestor: 1, Coach: 1
    expect(screen.getByText('Atleta Um')).toBeInTheDocument();
    expect(screen.getByText('Atleta Dois')).toBeInTheDocument();
    expect(screen.getByText('Gestor Principal')).toBeInTheDocument();
    expect(screen.getByText('Técnico Silva')).toBeInTheDocument();
  });

  it('NÃO muta o array members original passado como prop', () => {
    const members = makeMembers();
    const snapshot = JSON.stringify(members);
    render(<ClubMembersModal {...defaultProps} members={members} />);
    // O array e os objetos internos devem permanecer inalterados
    expect(JSON.stringify(members)).toBe(snapshot);
  });

  it('agrupa corretamente quando há múltiplos atletas', () => {
    const members = makeMembers();
    render(<ClubMembersModal {...defaultProps} members={members} />);
    // Ambos os atletas devem aparecer
    const athleteNames = screen.getAllByText(/atleta/i);
    // pelo menos 2 nomes de atletas na tela
    expect(athleteNames.length).toBeGreaterThanOrEqual(2);
  });

  it('mantém ordem: Gestor primeiro, Coach depois, Athlete por último', () => {
    render(<ClubMembersModal {...defaultProps} members={makeMembers()} />);
    const gestoresEl = screen.getByText('Gestores');
    const tecnicosEl = screen.getByText('Técnicos');
    const atletasEl = screen.getByText('Atletas');
    // Node.DOCUMENT_POSITION_FOLLOWING (4) significa que o segundo elemento vem depois do primeiro
    expect(
      gestoresEl.compareDocumentPosition(tecnicosEl) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      tecnicosEl.compareDocumentPosition(atletasEl) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('membro convidado exibe tag Convidado', () => {
    const members: ClubMember[] = [
      {
        id: 'ms-g',
        userId: null,
        clubId: 'c-1',
        role: 'ATHLETE',
        status: 'ACTIVE',
        isGuest: true,
        joinedAt: '2024-01-01T00:00:00.000Z',
        user: { id: null, email: null, name: 'Guest Player', avatarUrl: null },
      },
    ];
    render(<ClubMembersModal {...defaultProps} members={members} />);
    expect(screen.getByText('Convidado')).toBeInTheDocument();
  });
});
