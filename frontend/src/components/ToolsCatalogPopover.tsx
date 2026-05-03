import React, { useEffect, useState } from 'react';
import { Tag, Typography, Space, Spin } from '@arco-design/web-react';
import { api } from '../api';

interface ToolInfo {
  name: string;
  category: string;
  side_effect: 'read' | 'write';
  description: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  cards: '卡片',
  notes: '笔记',
  relations: '关联',
  files: '文件库',
  data: '数据',
  extensions: '扩展',
  settings: '设置',
};

export const ToolsCatalogPopover: React.FC = () => {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getToolsCatalog().then(res => {
      if (!cancelled && res.success) {
        setTools(res.tools);
      }
      if (!cancelled) setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const grouped = new Map<string, ToolInfo[]>();
  for (const t of tools) {
    const list = grouped.get(t.category) || [];
    list.push(t);
    grouped.set(t.category, list);
  }

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <Spin size={16} />
      </div>
    );
  }

  return (
    <div style={{ padding: 12, maxWidth: 380, maxHeight: 400, overflow: 'auto' }}>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
        Agent 模式下可用的工具
      </Typography.Text>
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {Array.from(grouped.entries()).map(([category, items]) => (
          <div key={category}>
            <Typography.Text
              bold
              style={{ fontSize: 12, color: 'var(--color-text-2)', display: 'block', margin: '8px 0 4px' }}
            >
              {CATEGORY_LABELS[category] || category}
            </Typography.Text>
            {items.map(tool => (
              <div key={tool.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '2px 0' }}>
                <Tag size="small" color={tool.side_effect === 'write' ? 'orangered' : 'green'}>
                  {tool.side_effect === 'write' ? '写' : '读'}
                </Tag>
                <Tag size="small" color="arcoblue">{tool.name}</Tag>
                <Typography.Text style={{ fontSize: 12, flex: 1, minWidth: 0 }} type="secondary">
                  {tool.description}
                </Typography.Text>
              </div>
            ))}
          </div>
        ))}
      </Space>
    </div>
  );
};
