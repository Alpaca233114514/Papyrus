import React from 'react';
import { Tag, Typography, Space } from '@arco-design/web-react';

const TOOLS = [
  { name: 'create_card', desc: '创建学习卡片', params: ['question', 'answer', 'tags?'] },
  { name: 'update_card', desc: '更新卡片内容', params: ['card_index', 'question?', 'answer?'] },
  { name: 'delete_card', desc: '删除指定卡片', params: ['card_index'] },
  { name: 'search_cards', desc: '搜索卡片库', params: ['keyword'] },
  { name: 'get_card_stats', desc: '获取统计信息', params: [] },
  { name: 'generate_practice_set', desc: '生成练习集', params: ['topic', 'count?'] },
];

export const ToolsCatalogPopover: React.FC = () => (
  <div style={{ padding: 12, maxWidth: 320, maxHeight: 300, overflow: 'auto' }}>
    <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
      Agent 模式下可用的工具
    </Typography.Text>
    <Space direction="vertical" size="mini" style={{ width: '100%' }}>
      {TOOLS.map((tool) => (
        <div key={tool.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <Tag size="small" color="arcoblue">
            {tool.name}
          </Tag>
          <div style={{ flex: 1 }}>
            <Typography.Text style={{ fontSize: 13 }}>{tool.desc}</Typography.Text>
            {tool.params.length > 0 && (
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                参数: {tool.params.join(', ')}
              </Typography.Text>
            )}
          </div>
        </div>
      ))}
    </Space>
  </div>
);
