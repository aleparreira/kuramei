import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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
    'Use for any reminder or "don\'t forget" request, including linguistic variations such as: ' +
    '"me lembra de X", "lembra eu de Y às Z", "não me deixa esquecer de W", ' +
    '"me avisa na sexta", "me manda mensagem amanhã cedo". ' +
    'The "when" field is required — if the user does not specify when, ask before calling this tool.',
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
          // context.userId is the raw WhatsApp phone number (from field)
          phoneNumber: context.userId,
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

interface ReminderItem {
  SK: string;
  text: string;
  when: string;
}

function getTodayPrefix(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatWhenPtBr(when: string): string {
  const date = new Date(when);
  if (isNaN(date.getTime())) {
    return when;
  }

  const tz = 'America/Sao_Paulo';
  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat('pt-BR', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const fmtTime = (d: Date) =>
    new Intl.DateTimeFormat('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(d);

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateStr = fmtDate(date);
  const timeStr = fmtTime(date);

  if (dateStr === fmtDate(now)) return `Hoje às ${timeStr}`;
  if (dateStr === fmtDate(tomorrow)) return `Amanhã às ${timeStr}`;
  return `${dateStr} às ${timeStr}`;
}

const ListRemindersInputSchema = z.object({
  filter: z.enum(['today', 'upcoming', 'all']).default('upcoming'),
});

const listRemindersTool = defineTool({
  name: 'list_reminders',
  description:
    "Lists the user's pending reminders as a visual page. " +
    'Use when the user asks about their reminders, schedule, or what they have coming up. ' +
    'Filter: today for today only, upcoming for all future (default), all for everything.',
  inputSchema: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        enum: ['today', 'upcoming', 'all'],
        description: "Filter scope: 'today' for today only, 'upcoming' for all future (default), 'all' for everything",
      },
    },
  },
  handler: async (input, context) => {
    const parsed = ListRemindersInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: `Invalid input: ${parsed.error.message}` };
    }

    const { filter } = parsed.data;

    const table = process.env['REMINDERS_TABLE'];
    if (!table) {
      throw new Error('Missing required environment variable: REMINDERS_TABLE');
    }

    const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    const response = await client.send(
      new QueryCommand({
        TableName: table,
        KeyConditionExpression: 'PK = :pk',
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':pk': `USER#${context.userId}`,
          ':status': 'pending',
        },
      }),
    );

    let items = (response.Items ?? []) as ReminderItem[];

    items.sort((a, b) => a.when.localeCompare(b.when));

    if (filter === 'today') {
      const todayPrefix = getTodayPrefix();
      items = items.filter((r) => r.when.startsWith(todayPrefix));
    } else if (filter === 'upcoming') {
      const now = new Date().toISOString();
      items = items.filter((r) => r.when >= now);
    }

    if (items.length === 0) {
      const { url } = await generateUI(
        { type: 'message', title: 'Nenhum lembrete pendente', body: 'Você está em dia! ✅', actions: [] },
        { userId: context.userId },
      );
      return { success: true, data: { url, reminders: [] } };
    }

    const { url } = await generateUI(
      {
        type: 'list',
        title: 'Seus lembretes ⏰',
        items: items.map((r) => ({ label: r.text, description: formatWhenPtBr(r.when) })),
      },
      { userId: context.userId },
    );

    const reminders = items.map((r) => ({
      id: r.SK.replace('REMINDER#', ''),
      text: r.text,
      when: r.when,
    }));

    return { success: true, data: { url, reminders } };
  },
});

const CancelReminderInputSchema = z.object({
  reminderId: z.string().min(1),
});

const cancelReminderTool = defineTool({
  name: 'cancel_reminder',
  description:
    'Cancels a pending reminder by ID. Use when the user wants to delete, remove, or cancel a specific reminder. ' +
    'IMPORTANT: requires the exact reminder ID — call list_reminders first if you do not have the ID yet. ' +
    'If the user refers to a reminder by description (e.g. "the medication reminder"), use list_reminders to find the matching ID before cancelling.',
  inputSchema: {
    type: 'object',
    properties: {
      reminderId: { type: 'string', description: 'The exact reminder ID to cancel' },
    },
    required: ['reminderId'],
  },
  handler: async (input, context) => {
    const parsed = CancelReminderInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: `Invalid input: ${parsed.error.message}` };
    }

    const { reminderId } = parsed.data;

    const table = process.env['REMINDERS_TABLE'];
    if (!table) {
      throw new Error('Missing required environment variable: REMINDERS_TABLE');
    }

    const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

    const getResult = await client.send(
      new GetCommand({
        TableName: table,
        Key: {
          PK: `USER#${context.userId}`,
          SK: `REMINDER#${reminderId}`,
        },
      }),
    );

    if (!getResult.Item || getResult.Item['status'] !== 'pending') {
      const { url } = await generateUI(
        {
          type: 'message',
          title: 'Lembrete não encontrado',
          body: 'Não encontrei esse lembrete. Use a lista de lembretes para ver os pendentes.',
          actions: [],
        },
        { userId: context.userId },
      );
      return { success: true, data: { url } };
    }

    const reminderText = String(getResult.Item['text'] ?? '');

    await client.send(
      new UpdateCommand({
        TableName: table,
        Key: {
          PK: `USER#${context.userId}`,
          SK: `REMINDER#${reminderId}`,
        },
        UpdateExpression: 'SET #status = :cancelled, cancelledAt = :cancelledAt',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':cancelled': 'cancelled',
          ':cancelledAt': new Date().toISOString(),
        },
      }),
    );

    const { url } = await generateUI(
      {
        type: 'message',
        title: 'Lembrete cancelado ✅',
        body: `${reminderText} — removido`,
        actions: [],
      },
      { userId: context.userId },
    );

    return { success: true, data: { url } };
  },
});

export const reminderExperience: ExperiencePackage = {
  name: 'reminder',
  description: 'Creates, lists, and cancels reminders for the user, returning visual page links',
  systemPromptSection: `## Lembretes

Se when não especificado, perguntar em uma única mensagem antes de chamar create_reminder. Nunca criar sem when. Não listar reminders logo após criar um no mesmo turn — aguardar próxima interação do usuário.

Ao cancelar lembrete: se não souber o ID exato, chamar list_reminders primeiro para obter os IDs. Se houver múltiplos lembretes que podem corresponder à descrição do usuário, mostrar a lista e pedir confirmação antes de cancelar. Nunca cancelar sem ter o ID correto.`,
  tools: [createReminderTool, listRemindersTool, cancelReminderTool],
};
