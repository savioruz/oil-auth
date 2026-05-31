import { join } from 'node:path';
import type { Logger } from '@infras/logger/logger';

const TEMPLATES_DIR = join(import.meta.dir, '../../templates/email');

export async function loadTemplate(
  name: string,
  vars: Record<string, string>,
  logger?: Logger
): Promise<string | undefined> {
  try {
    const filePath = join(TEMPLATES_DIR, `${name}.html`);
    const file = Bun.file(filePath);
    let html = await file.text();
    for (const [key, value] of Object.entries(vars)) {
      html = html.replaceAll(`{{.${key}}}`, value);
    }
    return html;
  } catch (err) {
    logger?.warn({ err }, `Email template not found or unreadable: ${name}`);
    return undefined;
  }
}
