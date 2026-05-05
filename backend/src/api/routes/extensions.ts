import type { FastifyInstance } from 'fastify';

export interface ExtensionInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  rating: number;
  downloads: number;
  isEnabled: boolean;
  updateAvailable?: boolean;
  tags: string[];
}

const EXTENSIONS_CATALOG: ExtensionInfo[] = [
  {
    id: 'core.markdown',
    name: 'Markdown 增强',
    description: '提供 Markdown 编辑、预览与导出能力',
    version: '1.0.0',
    author: 'Papyrus Team',
    rating: 4.9,
    downloads: 12000,
    isEnabled: true,
    tags: ['编辑器', '内置'],
  },
  {
    id: 'core.obsidian-import',
    name: 'Obsidian 导入',
    description: '将 Obsidian Vault 中的笔记一键导入 Papyrus Desktop',
    version: '1.0.0',
    author: 'Papyrus Team',
    rating: 4.8,
    downloads: 8800,
    isEnabled: true,
    tags: ['导入', '内置'],
  },
  {
    id: 'community.theme-pack',
    name: '主题包',
    description: '一组社区贡献的视觉主题，支持深色与高对比度',
    version: '0.4.2',
    author: 'Community',
    rating: 4.5,
    downloads: 3200,
    isEnabled: false,
    updateAvailable: true,
    tags: ['主题', '社区'],
  },
  {
    id: 'lab.ai-cards',
    name: 'AI 自动制卡',
    description: '基于笔记内容自动生成学习卡片',
    version: '0.2.1',
    author: 'Papyrus Lab',
    rating: 4.2,
    downloads: 2100,
    isEnabled: false,
    tags: ['AI', '实验'],
  },
];

export function getExtensionsList(): ExtensionInfo[] {
  return EXTENSIONS_CATALOG.map(e => ({ ...e, tags: [...e.tags] }));
}

export default async function extensionsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/extensions', async () => {
    return {
      success: true,
      count: EXTENSIONS_CATALOG.length,
      extensions: getExtensionsList(),
    };
  });
}
