/**
 * Interactive Message Builders
 */

import type {
  OutgoingInteractive,
  InteractiveButton,
  ListSection,
  ListRow,
} from './types.js';

export const MAX_BUTTONS = 3;
export const MAX_LIST_SECTIONS = 10;
export const MAX_ROWS_PER_SECTION = 10;
export const MAX_BUTTON_TITLE_LENGTH = 20;
export const MAX_BODY_LENGTH = 1024;
export const MAX_HEADER_LENGTH = 60;
export const MAX_FOOTER_LENGTH = 60;

export class InteractiveMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InteractiveMessageError';
  }
}

export interface ButtonDefinition {
  id: string;
  title: string;
}

export interface ButtonMessageOptions {
  header?: string;
  footer?: string;
}

export function buildButtonMessage(
  body: string,
  buttons: ButtonDefinition[],
  options: ButtonMessageOptions = {}
): OutgoingInteractive {
  if (!body || body.length === 0) {
    throw new InteractiveMessageError('Body text is required');
  }
  if (body.length > MAX_BODY_LENGTH) {
    throw new InteractiveMessageError(
      `Body text exceeds maximum length of ${MAX_BODY_LENGTH} characters`
    );
  }

  if (!buttons || buttons.length === 0) {
    throw new InteractiveMessageError('At least one button is required');
  }
  if (buttons.length > MAX_BUTTONS) {
    throw new InteractiveMessageError(
      `Maximum ${MAX_BUTTONS} buttons allowed, got ${buttons.length}`
    );
  }

  const interactiveButtons: InteractiveButton[] = buttons.map((btn, index) => {
    if (!btn.id) {
      throw new InteractiveMessageError(`Button at index ${index} missing id`);
    }
    if (!btn.title) {
      throw new InteractiveMessageError(`Button at index ${index} missing title`);
    }
    if (btn.title.length > MAX_BUTTON_TITLE_LENGTH) {
      throw new InteractiveMessageError(
        `Button "${btn.id}" title exceeds maximum length of ${MAX_BUTTON_TITLE_LENGTH} characters`
      );
    }
    return {
      type: 'reply' as const,
      reply: { id: btn.id, title: btn.title },
    };
  });

  const interactive: OutgoingInteractive = {
    type: 'button',
    body: { text: body },
    action: { buttons: interactiveButtons },
  };

  if (options.header) {
    if (options.header.length > MAX_HEADER_LENGTH) {
      throw new InteractiveMessageError(
        `Header text exceeds maximum length of ${MAX_HEADER_LENGTH} characters`
      );
    }
    interactive.header = { type: 'text', text: options.header };
  }

  if (options.footer) {
    if (options.footer.length > MAX_FOOTER_LENGTH) {
      throw new InteractiveMessageError(
        `Footer text exceeds maximum length of ${MAX_FOOTER_LENGTH} characters`
      );
    }
    interactive.footer = { text: options.footer };
  }

  return interactive;
}

export interface ListMessageOptions {
  header?: string;
  footer?: string;
}

export function buildListMessage(
  body: string,
  buttonText: string,
  sections: ListSection[],
  options: ListMessageOptions = {}
): OutgoingInteractive {
  if (!body || body.length === 0) {
    throw new InteractiveMessageError('Body text is required');
  }
  if (body.length > MAX_BODY_LENGTH) {
    throw new InteractiveMessageError(
      `Body text exceeds maximum length of ${MAX_BODY_LENGTH} characters`
    );
  }

  if (!buttonText || buttonText.length === 0) {
    throw new InteractiveMessageError('Button text is required');
  }
  if (buttonText.length > MAX_BUTTON_TITLE_LENGTH) {
    throw new InteractiveMessageError(
      `Button text exceeds maximum length of ${MAX_BUTTON_TITLE_LENGTH} characters`
    );
  }

  if (!sections || sections.length === 0) {
    throw new InteractiveMessageError('At least one section is required');
  }
  if (sections.length > MAX_LIST_SECTIONS) {
    throw new InteractiveMessageError(
      `Maximum ${MAX_LIST_SECTIONS} sections allowed, got ${sections.length}`
    );
  }

  let totalRows = 0;
  sections.forEach((section, sectionIndex) => {
    if (!section.rows || section.rows.length === 0) {
      throw new InteractiveMessageError(`Section at index ${sectionIndex} has no rows`);
    }
    if (section.rows.length > MAX_ROWS_PER_SECTION) {
      throw new InteractiveMessageError(
        `Section at index ${sectionIndex} exceeds maximum of ${MAX_ROWS_PER_SECTION} rows`
      );
    }
    totalRows += section.rows.length;
  });

  if (totalRows > 10) {
    throw new InteractiveMessageError(`Maximum 10 total rows allowed, got ${totalRows}`);
  }

  const interactive: OutgoingInteractive = {
    type: 'list',
    body: { text: body },
    action: { button: buttonText, sections },
  };

  if (options.header) {
    if (options.header.length > MAX_HEADER_LENGTH) {
      throw new InteractiveMessageError(
        `Header text exceeds maximum length of ${MAX_HEADER_LENGTH} characters`
      );
    }
    interactive.header = { type: 'text', text: options.header };
  }

  if (options.footer) {
    if (options.footer.length > MAX_FOOTER_LENGTH) {
      throw new InteractiveMessageError(
        `Footer text exceeds maximum length of ${MAX_FOOTER_LENGTH} characters`
      );
    }
    interactive.footer = { text: options.footer };
  }

  return interactive;
}

export function createSection(title: string | undefined, rows: ListRow[]): ListSection {
  return { title, rows };
}

export function createRow(id: string, title: string, description?: string): ListRow {
  return { id, title, description };
}
