// frontend/api/health.js - Serverless Function para Health Check

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async function handler(req, res) {
  // Timeout de 8 segundos para evitar exceder limite da Vercel
  const timeout = setTimeout(() => {
    res.status(504).json({ error: "Timeout na requisição" });
  }, 8000);

  try {
    // Lida com CORS preflight requests
    Object.entries(corsHeaders).forEach(([key, value]) =>
      res.setHeader(key, value)
    );
    if (req.method === "OPTIONS") {
      clearTimeout(timeout);
      return res.status(200).end();
    }

    if (req.method !== "GET") {
      clearTimeout(timeout);
      return res.status(405).json({ error: "Método não permitido" });
    }

    clearTimeout(timeout);
    return res.json({
      status: "ok",
      message: "Backend RacketApp rodando na Vercel!",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    clearTimeout(timeout);
    console.error("Erro na API health:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
