export interface CardRecord {
  id: string;
  q: string;
  a: string;
  next_review: number;
  interval: number;
  ef: number;
  repetitions: number;
  tags: string[];
}

export interface Note {
  id: string;
  title: string;
  folder: string;
  content: string;
  preview: string;
  tags: string[];
  created_at: number;
  updated_at: number;
  word_count: number;
  hash: string;
  headings: Array<{ level: number; text: string }>;
  outgoing_links: string[];
  incoming_count: number;
}

export interface Provider {
  id: string;
  type: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  isDefault: boolean;
  apiKeys: ApiKey[];
  models: Model[];
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
}

export interface Model {
  id: string;
  name: string;
  modelId: string;
  port: string;
  capabilities: string[];
  apiKeyId: string;
  enabled: boolean;
}
