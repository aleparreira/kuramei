import { z } from 'zod';
import { generateUI } from '@kuramei/sdk';
import { defineTool } from '@kuramei/tools';
import type { ExperiencePackage } from '@kuramei/sdk';

const GetWeatherInputSchema = z.object({
  location: z.string().min(1),
});

// Minimal shape we care about from wttr.in ?format=j1
interface WttrResponse {
  current_condition: Array<{
    temp_C: string;
    FeelsLikeC: string;
    weatherDesc: Array<{ value: string }>;
  }>;
  weather: Array<{
    maxtempC: string;
    mintempC: string;
  }>;
}

const getWeatherTool = defineTool({
  name: 'get_weather',
  description:
    "Gets current weather and today's forecast for any city. " +
    'Use for any question about weather, temperature, rain, or climate — ' +
    'como está o tempo em X, vai chover em Y, que roupa usar em Z, temperatura de W. ' +
    'Requires location name.',
  inputSchema: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City or location name' },
    },
    required: ['location'],
  },
  handler: async (input, context) => {
    const parsed = GetWeatherInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: `Invalid input: ${parsed.error.message}` };
    }

    const { location } = parsed.data;
    const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;

    let data: WttrResponse;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`wttr.in returned HTTP ${response.status}`);
      }
      data = (await response.json()) as WttrResponse;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const { url: pageUrl } = await generateUI(
        {
          type: 'message',
          title: '🌧️ Não foi possível obter o clima',
          body: `Não consegui buscar o clima para "${location}". Tente novamente em instantes.`,
          actions: [],
        },
        { userId: context.userId },
      );
      console.error('get_weather fetch error', { location, error: msg });
      return { success: true, data: { url: pageUrl } };
    }

    const current = data.current_condition[0];
    const today = data.weather[0];

    if (!current || !today) {
      const { url: pageUrl } = await generateUI(
        {
          type: 'message',
          title: '🌧️ Local não encontrado',
          body: `Não encontrei informações de clima para "${location}". Verifique o nome do local e tente novamente.`,
          actions: [],
        },
        { userId: context.userId },
      );
      return { success: true, data: { url: pageUrl } };
    }

    const temp = current.temp_C;
    const feelsLike = current.FeelsLikeC;
    const condition = current.weatherDesc[0]?.value ?? 'Desconhecido';
    const max = today.maxtempC;
    const min = today.mintempC;

    const { url: pageUrl } = await generateUI(
      {
        type: 'message',
        title: `🌤️ Tempo em ${location}`,
        body: `${condition} • ${temp}°C (sensação ${feelsLike}°C)\nMáx ${max}°C / Mín ${min}°C hoje`,
        actions: [],
      },
      { userId: context.userId },
    );

    return { success: true, data: { url: pageUrl } };
  },
});

export const weatherExperience: ExperiencePackage = {
  name: 'weather',
  description: 'Gets current weather and forecast for any location via wttr.in',
  systemPromptSection: `## Clima

Após retornar clima, adicionar dica contextual amigável em PT-BR se relevante (ex: leve guarda-chuva! se vai chover).`,
  tools: [getWeatherTool],
};
