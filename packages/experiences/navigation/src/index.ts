import type { ExperiencePackage } from '@kuramei/sdk';
import { generateUiTool } from '@kuramei/tools';

export const navigationExperience: ExperiencePackage = {
  name: 'navigation',
  description: 'Generates navigation maps and location pages',
  systemPromptSection: `## Navegação e Mapas

Após chamar generate_ui, responder sempre com texto contextual amigável em PT-BR além do link. Nunca enviar só a URL sem contexto.`,
  tools: [generateUiTool],
};
