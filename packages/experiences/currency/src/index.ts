import { z } from 'zod';
import { generateUI } from '@kuramei/sdk';
import { defineTool } from '@kuramei/tools';
import type { ExperiencePackage } from '@kuramei/sdk';

const ConvertCurrencyInputSchema = z.object({
  amount: z.number().positive(),
  from: z.string().length(3).transform((v) => v.toUpperCase()),
  to: z.string().length(3).transform((v) => v.toUpperCase()),
});

interface ExchangeRateResponse {
  result: string;
  base_code: string;
  time_last_update_utc: string;
  rates: Record<string, number>;
}

const MAIN_CURRENCIES = ['USD', 'EUR', 'BRL', 'GBP', 'JPY', 'ARS', 'CLP', 'COP', 'MXN'];

const convertCurrencyTool = defineTool({
  name: 'convert_currency',
  description:
    'Converts currency amounts using real-time exchange rates. ' +
    'Use for any currency conversion question — quanto é X dólares em reais, ' +
    'converte Y euros para BRL, quanto é Z libras, cotação do dólar hoje. ' +
    'Infer from/to currencies from context; default to BRL if destination not specified.',
  inputSchema: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: 'Amount to convert (must be positive)' },
      from: { type: 'string', description: '3-letter ISO currency code to convert from (e.g. USD)' },
      to: { type: 'string', description: '3-letter ISO currency code to convert to (e.g. BRL)' },
    },
    required: ['amount', 'from', 'to'],
  },
  handler: async (input, context) => {
    const parsed = ConvertCurrencyInputSchema.safeParse(input);
    if (!parsed.success) {
      const { url: pageUrl } = await generateUI(
        {
          type: 'message',
          title: '💱 Entrada inválida',
          body: `Não consegui entender a conversão solicitada. Informe o valor e as moedas (ex: 100 USD para BRL).`,
          actions: [],
        },
        { userId: context.userId },
      );
      return { success: true, data: { url: pageUrl } };
    }

    const { amount, from, to } = parsed.data;
    const url = `https://open.er-api.com/v6/latest/${from}`;

    let data: ExchangeRateResponse;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`open.er-api.com returned HTTP ${response.status}`);
      }
      data = (await response.json()) as ExchangeRateResponse;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const { url: pageUrl } = await generateUI(
        {
          type: 'message',
          title: '💱 Erro ao buscar cotação',
          body: `Não foi possível buscar a cotação no momento. Tente novamente em instantes.`,
          actions: [],
        },
        { userId: context.userId },
      );
      console.error('convert_currency fetch error', { from, to, error: msg });
      return { success: true, data: { url: pageUrl } };
    }

    const rate = data.rates[to];

    if (rate === undefined) {
      const currencyList = MAIN_CURRENCIES.join(', ');
      const { url: pageUrl } = await generateUI(
        {
          type: 'message',
          title: '💱 Moeda não encontrada',
          body: `Não encontrei a moeda "${to}". Principais moedas suportadas:\n${currencyList}`,
          actions: [],
        },
        { userId: context.userId },
      );
      return { success: true, data: { url: pageUrl } };
    }

    const result = (amount * rate).toFixed(2);
    const rateFormatted = rate.toFixed(4);
    const updateDate = data.time_last_update_utc;

    const { url: pageUrl } = await generateUI(
      {
        type: 'message',
        title: `💱 ${amount} ${from} = ${result} ${to}`,
        body: `Taxa: 1 ${from} = ${rateFormatted} ${to}\nAtualizado em: ${updateDate}`,
        actions: [],
      },
      { userId: context.userId },
    );

    return { success: true, data: { url: pageUrl } };
  },
});

export const currencyExperience: ExperiencePackage = {
  name: 'currency',
  description: 'Converts currency amounts using real-time exchange rates via open.er-api.com',
  systemPromptSection: `## Cotação de Moedas

Ao responder cotação, adicionar contexto se relevante (ex: taxa de hoje às {hora}).`,
  tools: [convertCurrencyTool],
};
