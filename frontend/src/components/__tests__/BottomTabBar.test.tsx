import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BottomTabBar, { type TabId } from '../BottomTabBar';

vi.mock('../BottomTabBar.css', () => ({}));

const mockOnTabChange = vi.fn();

describe('BottomTabBar', () => {
  it('renderiza todas as 5 abas', () => {
    render(<BottomTabBar activeTab="home" onTabChange={mockOnTabChange} />);

    expect(screen.getByTestId('tab-home')).toBeInTheDocument();
    expect(screen.getByTestId('tab-stats')).toBeInTheDocument();
    expect(screen.getByTestId('tab-ranking')).toBeInTheDocument();
    expect(screen.getByTestId('tab-tournaments')).toBeInTheDocument();
    expect(screen.getByTestId('tab-profile')).toBeInTheDocument();
  });

  it('aplica classe bottom-tab-item--active com espaço correto na aba ativa', () => {
    render(<BottomTabBar activeTab="home" onTabChange={mockOnTabChange} />);

    const homeTab = screen.getByTestId('tab-home');
    // O bug era a ausência do espaço: 'bottom-tab-itembottom-tab-item--active'
    expect(homeTab.className).toBe('bottom-tab-item bottom-tab-item--active');
  });

  it('não aplica bottom-tab-item--active nas abas inativas', () => {
    render(<BottomTabBar activeTab="home" onTabChange={mockOnTabChange} />);

    const statsTab = screen.getByTestId('tab-stats');
    expect(statsTab.className).toBe('bottom-tab-item');
    expect(statsTab.className).not.toContain('bottom-tab-item--active');
  });

  it('define aria-selected=true apenas na aba ativa', () => {
    render(<BottomTabBar activeTab="tournaments" onTabChange={mockOnTabChange} />);

    expect(screen.getByTestId('tab-tournaments')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('tab-home')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('tab-profile')).toHaveAttribute('aria-selected', 'false');
  });

  it('chama onTabChange com o id correto ao clicar em uma aba', async () => {
    const user = userEvent.setup();
    render(<BottomTabBar activeTab="home" onTabChange={mockOnTabChange} />);

    await user.click(screen.getByTestId('tab-ranking'));
    expect(mockOnTabChange).toHaveBeenCalledWith('ranking');
  });

  it('exibe badge quando count > 0', () => {
    render(
      <BottomTabBar
        activeTab="home"
        onTabChange={mockOnTabChange}
        badges={[{ tabId: 'stats', count: 3 }]}
      />,
    );

    expect(screen.getByTestId('badge-stats')).toHaveTextContent('3');
  });

  it('não exibe badge quando count = 0', () => {
    render(<BottomTabBar activeTab="home" onTabChange={mockOnTabChange} badges={[]} />);

    expect(screen.queryByTestId('badge-home')).not.toBeInTheDocument();
  });

  it('exibe "99+" quando badge count ultrapassa 99', () => {
    render(
      <BottomTabBar
        activeTab="home"
        onTabChange={mockOnTabChange}
        badges={[{ tabId: 'home', count: 150 }]}
      />,
    );

    expect(screen.getByTestId('badge-home')).toHaveTextContent('99+');
  });

  it('renderiza como nav com role tablist', () => {
    render(<BottomTabBar activeTab="home" onTabChange={mockOnTabChange} />);

    const nav = screen.getByTestId('bottom-tab-bar');
    expect(nav.tagName).toBe('NAV');
    expect(nav).toHaveAttribute('role', 'tablist');
  });

  it('troca a aba ativa ao receber nova prop activeTab', () => {
    const { rerender } = render(<BottomTabBar activeTab="home" onTabChange={mockOnTabChange} />);

    expect(screen.getByTestId('tab-home')).toHaveAttribute('aria-selected', 'true');

    rerender(<BottomTabBar activeTab="profile" onTabChange={mockOnTabChange} />);

    expect(screen.getByTestId('tab-home')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('tab-profile')).toHaveAttribute('aria-selected', 'true');
  });
});
