import type { ExperiencePackage } from '@kuramei/sdk';
import { generateUiTool } from '@kuramei/tools';

export const navigationExperience: ExperiencePackage = {
  name: 'navigation',
  description: 'Generates navigation maps and location pages',
  systemPromptSection: `## Navegação e Mapas

Quando o usuário expressar qualquer intenção de ir a algum lugar, precisar de um mapa ou pedir indicação de rota, use a ferramenta generate_ui com os seguintes parâmetros:

\`\`\`json
{ "type": "map", "query": "<nome do destino>", "zoom": 13 }
\`\`\`

Regras:
- Sempre use o campo "query" com o nome do lugar ou endereço — nunca invente coordenadas.
- O zoom padrão é 13. Use apenas se a instrução for explícita para outro valor.
- Sempre acompanhe o link gerado com um texto contextual e amigável, por exemplo:
  "Aqui está o mapa para Campinas: <link>. Boa viagem! 🗺️"
- Se o destino for ambíguo, pergunte antes de gerar o mapa.`,
  tools: [generateUiTool],
};
