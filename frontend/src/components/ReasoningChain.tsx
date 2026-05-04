import React, { useState } from 'react';
import { Collapse, Tag } from '@arco-design/web-react';
import { IconMindMapping, IconRight, IconDown } from '@arco-design/web-react/icon';
import { MarkdownView } from './MarkdownView';
import './ReasoningChain.css';

const CollapseItem = Collapse.Item;

export interface ReasoningChainProps {
  content: string;
  defaultExpanded?: boolean;
}

function getPreviewText(text: string): string {
  if (text.length <= 50) return text;
  return text.slice(0, 50) + '...';
}

export const ReasoningChain: React.FC<ReasoningChainProps> = ({
  content,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="reasoning-chain">
      <Collapse
        bordered={false}
        activeKey={isExpanded ? ['1'] : []}
        onChange={(_key, keys) => setIsExpanded(keys.includes('1'))}
        className="reasoning-collapse"
      >
        <CollapseItem
          name="1"
          header={(
            <div className="reasoning-header">
              <div className="reasoning-title-wrapper">
                <div className="reasoning-title-left">
                  <IconMindMapping className="reasoning-icon" />
                  <span className="reasoning-title">思考过程</span>
                  <Tag size="small" className="reasoning-tag">
                    {isExpanded ? '已展开' : '已折叠'}
                  </Tag>
                </div>
                <span className="reasoning-expand-indicator" aria-hidden="true">
                  {isExpanded ? <IconDown /> : <IconRight />}
                </span>
              </div>
              {!isExpanded && (
                <span className="reasoning-preview">
                  {getPreviewText(content)}
                </span>
              )}
            </div>
          )}
          className="reasoning-collapse-item"
        >
          <div className="reasoning-content">
            <MarkdownView source={content} compact />
          </div>
        </CollapseItem>
      </Collapse>
    </div>
  );
};

export default ReasoningChain;
