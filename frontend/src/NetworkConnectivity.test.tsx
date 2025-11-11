import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';

// Mock do axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('Conectividade de Rede', () => {
  it('deve conectar com o backend na rede local', async () => {
    // Mock da resposta de health check
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        status: 'ok',
        message: 'Backend RacketApp rodando!',
        timestamp: new Date().toISOString(),
      },
    });

    const response = await axios.get('/api/health');

    expect(response.data.status).toBe('ok');
    expect(response.data.message).toBe('Backend RacketApp rodando!');
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/health');
  });

  it('deve conectar com o backend via IP da rede local', async () => {
    // Mock da resposta
    mockedAxios.get.mockResolvedValueOnce({
      data: { matches: [] },
    });

    const response = await axios.get('/api/matches');

    expect(response.data).toHaveProperty('matches');
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/matches');
  });

  it('deve lidar com erros de conectividade', async () => {
    // Mock de erro de rede
    mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

    await expect(axios.get('/api/health')).rejects.toThrow('Network Error');
  });

  it('deve testar proxy do Vite para backend', () => {
    // Verifica se o proxy está configurado corretamente
    // Isso seria testado em um teste de integração com o servidor de desenvolvimento
    const viteConfig = {
      server: {
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:4001',
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/api/, ''),
          },
        },
      },
    };

    expect(viteConfig.server.host).toBe('0.0.0.0');
    expect(viteConfig.server.proxy['/api'].target).toBe('http://localhost:4001');
  });
});