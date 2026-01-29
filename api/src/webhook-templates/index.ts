import * as fs from 'fs';
import * as path from 'path';

export interface WebhookTemplate {
  id: string;
  name: string;
  description: string;
  eventType: string;
  payload: Record<string, any>;
}

// Load all webhook templates
const templateFiles = [
  'issue-alert-created.json',
  'issue-alert-resolved.json',
  'issue-alert-assigned.json',
  'metric-alert.json',
  'error-event.json',
  'comment-created.json',
];

export function getAllTemplates(): WebhookTemplate[] {
  return templateFiles.map(file => {
    const filePath = path.join(__dirname, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as WebhookTemplate;
  });
}

export function getTemplateById(id: string): WebhookTemplate | null {
  try {
    const filePath = path.join(__dirname, `${id}.json`);
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as WebhookTemplate;
  } catch (error) {
    return null;
  }
}

export function getTemplateMetadata(): Array<Omit<WebhookTemplate, 'payload'>> {
  return getAllTemplates().map(({ id, name, description, eventType }) => ({
    id,
    name,
    description,
    eventType,
  }));
}
