
import { GoogleGenAI } from "@google/genai";
import { Account, JournalEntry } from "../types";

export const getAIInsights = async (accounts: Account[], ledger: JournalEntry[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const financialData = {
    contas: accounts.map(a => ({ nome: a.name, tipo: a.type, saldo: a.balance })),
    transacoesRecentes: ledger.slice(-5).map(e => ({ desc: e.description, data: e.date, total: e.lines[0].amount }))
  };

  const prompt = `
    Como um consultor financeiro sênior, analise estes dados contábeis e forneça 3 insights ou recomendações concisas.
    Foque no patrimônio líquido, padrões de gastos e liquidez.
    Dados: ${JSON.stringify(financialData)}
    Retorne a resposta estritamente como uma lista simples em Português do Brasil.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Erro no Insight de IA:", error);
    return "Não foi possível gerar insights no momento. Verifique sua conexão ou chave de API.";
  }
};
