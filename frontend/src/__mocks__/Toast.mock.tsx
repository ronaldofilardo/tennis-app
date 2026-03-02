// src/__mocks__/Toast.mock.tsx
// Mock do componente Toast para uso nos testes.
// Substitui a implementação real por um mock funcional que não
// exige ToastProvider como wrapper nos renders de teste.

import React from "react";
import { vi } from "vitest";

export const mockToast = {
  showToast: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  dismiss: vi.fn(),
  dismissAll: vi.fn(),
};

export function resetMockToast() {
  mockToast.showToast.mockReset();
  mockToast.success.mockReset();
  mockToast.error.mockReset();
  mockToast.warning.mockReset();
  mockToast.info.mockReset();
  mockToast.dismiss.mockReset();
  mockToast.dismissAll.mockReset();
}

// Hook mock — não lança erro se não há ToastProvider
export const useToast = () => mockToast;

// Provider mock — apenas renderiza os filhos
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <>{children}</>;
};
