import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';
import { z } from 'zod';
import { generateUI } from '@kuramei/sdk';
import { defineTool } from '@kuramei/tools';
import type { ExperiencePackage } from '@kuramei/sdk';

const CreateReminderInputSchema = z.object({
  text: z.string().min(1),
  when: z.string().min(1),
});

const createReminderTool = defineTool({
  name: 'create_reminder',
  description:
    'Create a reminder for the user and return a confirmation page link. ' +
    'Use when the user asks to be reminded of something. ' +
    'Always ask for the time/date (when) if not provided before calling this tool.',
  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'What to remind the user about' },
      when: { type: 'string', description: 'When to remind — date, time, or natural language (e.g. "amanhã às 9h")' },
    },
    required: ['text', 'when'],
  },
  handler: async (input, context) => {
    const parsed = CreateReminderInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: `Invalid input: ${parsed.error.message}` };
    }

    const { text, when } = parsed.data;
    const id = ulid();
    const createdAt = new Date().toISOString();

    const table = process.env['REMINDERS_TABLE'];
    if (!table) {
      throw new Error('Missing required environment variable: REMINDERS_TABLE');
    }

    const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    await client.send(
      new PutCommand({
        TableName: table,
        Item: {
          PK: `USER#${context.userId}`,
          SK: `REMINDER#${id}`,
          text,
          when,
          createdAt,
          status: 'pending',
        },
      }),
    );

    const { url } = await generateUI(
      { type: 'message', title: 'Lembrete criado ✅', body: `${text} — ${when}`, actions: [] },
      { userId: context.userId },
    );

    return { success: true, data: { url } };
  },
});

export const reminderExperience: ExperiencePackage = {
  name: 'reminder',
  description: 'Creates reminders for the user and returns a confirmation page link',
  systemPromptSection: `## Lembretes

Quando o usuário pedir para ser lembrado de algo, use a ferramenta \`create_reminder\`.

Regras:
- Nunca crie um lembrete sem saber **quando** — se o usuário não informar, pergunte antes de chamar a ferramenta.
- Após criar o lembrete, confirme com o link: "Lembrete criado! Confira aqui: <link>"
- \`create_reminder\` serve exclusivamente para **criar** lembretes — não use para consultar lembretes existentes.`,
  tools: [createReminderTool],
};
