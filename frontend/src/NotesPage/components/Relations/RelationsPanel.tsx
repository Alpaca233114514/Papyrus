import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Input,
  Select,
  Modal,
  Message,
  Tabs,
  Empty,
  Tooltip,
  Tag,
  Spin,
} from '@arco-design/web-react';
import {
  IconLink,
  IconDelete,
  IconEdit,
  IconPlus,
  IconArrowRight,
  IconArrowLeft,
} from '@arco-design/web-react/icon';
import type { RelatedNote, SearchableNote, RelationType } from './types';
import { BASE } from '../../../api';

const TabPane = Tabs.TabPane;
const Option = Select.Option;

// 关联类型配置
const RELATION_CONFIG: Record<RelationType, { label: string; color: string }> = {
  reference: { label: '引用', color: 'arcoblue' },
  related: { label: '相关', color: 'green' },
  child: { label: '子主题', color: 'orange' },
  parent: { label: '父主题', color: 'purple' },
  sequence: { label: '顺序', color: 'cyan' },
  parallel: { label: '并行', color: 'magenta' },
};

interface RelationsPanelProps {
  noteId: string;
  onNavigateToNote?: (noteId: string) => void;
}

interface RelationsData {
  outgoing: RelatedNote[];
  incoming: RelatedNote[];
}

export const RelationsPanel: React.FC<RelationsPanelProps> = ({
  noteId,
  onNavigateToNote,
}) => {
  const [relations, setRelations] = useState<RelationsData>({ outgoing: [], incoming: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('outgoing');
  
  // 添加关联的弹窗状态
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchableNote[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SearchableNote | null>(null);
  const [newRelationType, setNewRelationType] = useState<RelationType>('reference');
  const [newRelationDesc, setNewRelationDesc] = useState('');
  
  // 编辑关联的弹窗状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRelation, setEditingRelation] = useState<RelatedNote | null>(null);
  const [editRelationType, setEditRelationType] = useState<RelationType>('reference');
  const [editRelationDesc, setEditRelationDesc] = useState('');

  // 加载关联数据
  const loadRelations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE}/notes/${noteId}/relations`);
      const data = await response.json();
      if (data.success) {
        setRelations({
          outgoing: data.outgoing,
          incoming: data.incoming,
        });
      }
    } catch {
      Message.error('加载关联失败');
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    loadRelations();
  }, [loadRelations]);

  // 搜索可关联的笔记
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setSearchError(false);
    try {
      const response = await fetch(
        `${BASE}/notes/search-for-relation?query=${encodeURIComponent(searchQuery)}&exclude_note_id=${noteId}&limit=10`
      );
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results);
      } else {
        setSearchError(true);
      }
    } catch {
      setSearchError(true);
    } finally {
      setSearching(false);
    }
  };

  // 防抖自动搜索
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchError(false);
      return;
    }
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, noteId]);

  // 创建关联
  const handleCreateRelation = async () => {
    if (!selectedNote) {
      Message.warning('请选择目标笔记');
      return;
    }

    try {
      const response = await fetch(`${BASE}/notes/${noteId}/relations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_id: selectedNote.id,
          relation_type: newRelationType,
          description: newRelationDesc,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        Message.success('关联创建成功');
        setAddModalVisible(false);
        setSelectedNote(null);
        setSearchQuery('');
        setSearchResults([]);
        setNewRelationDesc('');
        loadRelations();
      } else {
        Message.error('关联已存在或创建失败');
      }
    } catch {
      Message.error('关联创建失败');
    }
  };

  // 更新关联
  const handleUpdateRelation = async () => {
    if (!editingRelation) return;

    try {
      const response = await fetch(`${BASE}/relations/${editingRelation.relation_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relation_type: editRelationType,
          description: editRelationDesc,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        Message.success('关联更新成功');
        setEditModalVisible(false);
        setEditingRelation(null);
        loadRelations();
      } else {
        Message.error('关联更新失败');
      }
    } catch {
      Message.error('关联更新失败');
    }
  };

  // 删除关联
  const handleDeleteRelation = async (relationId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个关联吗？',
      onOk: async () => {
        try {
          const response = await fetch(`${BASE}/relations/${relationId}`, {
            method: 'DELETE',
          });
          
          const data = await response.json();
          if (data.success) {
            Message.success('关联已删除');
            loadRelations();
          } else {
            Message.error('删除失败');
          }
        } catch {
          Message.error('删除失败');
        }
      },
    });
  };

  // 打开编辑弹窗
  const openEditModal = (relation: RelatedNote) => {
    setEditingRelation(relation);
    setEditRelationType(relation.relation_type);
    setEditRelationDesc(relation.description);
    setEditModalVisible(true);
  };

  // 渲染关联列表项
  const renderRelationItem = (relation: RelatedNote) => {
    const config = RELATION_CONFIG[relation.relation_type] || RELATION_CONFIG.reference;
    
    return (
      <div
        key={relation.relation_id}
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border-2)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: `var(--color-${config.color}-light)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: `var(--color-${config.color})`,
            flexShrink: 0,
          }}
        >
          {relation.is_outgoing ? <IconArrowRight /> : <IconArrowLeft />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--color-text-1)',
                cursor: onNavigateToNote ? 'pointer' : 'default',
              }}
              onClick={() => onNavigateToNote?.(relation.note_id)}
            >
              {relation.title}
            </span>
            <Tag size="small" color={config.color}>
              {config.label}
            </Tag>
          </div>
          
          {relation.description && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-3)', marginTop: '4px' }}>
              {relation.description}
            </div>
          )}
          
          <div style={{ fontSize: '12px', color: 'var(--color-text-3)', marginTop: '4px' }}>
            {relation.folder}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <Tooltip content="编辑">
            <Button
              type="text"
              size="small"
              icon={<IconEdit />}
              onClick={() => openEditModal(relation)}
            />
          </Tooltip>
          <Tooltip content="删除">
            <Button
              type="text"
              size="small"
              status="danger"
              icon={<IconDelete />}
              onClick={() => handleDeleteRelation(relation.relation_id)}
            />
          </Tooltip>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 头部 */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border-2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 500 }}>关联笔记</div>
        <Button
          type="primary"
          size="small"
          icon={<IconPlus />}
          onClick={() => setAddModalVisible(true)}
        >
          添加关联
        </Button>
      </div>

      {/* 标签页 */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        style={{ flex: 1, overflow: 'hidden' }}
      >
        <TabPane key="outgoing" title={`出链 (${relations.outgoing.length})`}>
          <div style={{ overflow: 'auto', height: 'calc(100% - 40px)' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Spin />
              </div>
            ) : relations.outgoing.length > 0 ? (
              relations.outgoing.map(r => renderRelationItem(r))
            ) : (
              <Empty description="暂无出链关联" style={{ marginTop: '40px' }} />
            )}
          </div>
        </TabPane>
        
        <TabPane key="incoming" title={`入链 (${relations.incoming.length})`}>
          <div style={{ overflow: 'auto', height: 'calc(100% - 40px)' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Spin />
              </div>
            ) : relations.incoming.length > 0 ? (
              relations.incoming.map(r => renderRelationItem(r))
            ) : (
              <Empty description="暂无入链关联" style={{ marginTop: '40px' }} />
            )}
          </div>
        </TabPane>
      </Tabs>

      {/* 添加关联弹窗 */}
      <Modal
        title="添加关联"
        visible={addModalVisible}
        onOk={handleCreateRelation}
        onCancel={() => {
          setAddModalVisible(false);
          setSelectedNote(null);
          setSearchQuery('');
          setSearchResults([]);
          setSearchError(false);
        }}
        okText="创建"
        cancelText="取消"
      >
        <div style={{ marginBottom: '16px' }}>
          <div style={{ marginBottom: '8px', fontSize: '14px' }}>搜索笔记</div>
          <Input.Search
            placeholder="输入关键词搜索..."
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            onPressEnter={handleSearch}
            loading={searching}
            style={{ marginBottom: '12px' }}
          />
          
          {searchError && (
            <div style={{ color: 'var(--color-danger)', fontSize: '13px', marginBottom: '12px' }}>
              搜索失败，请稍后重试
            </div>
          )}

          {searchResults.length > 0 && (
            <div
              style={{
                maxHeight: '200px',
                overflow: 'auto',
                border: '1px solid var(--color-border-2)',
                borderRadius: '4px',
              }}
            >
              {searchResults.map(note => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    background: selectedNote?.id === note.id 
                      ? 'var(--color-primary-light)' 
                      : 'transparent',
                    borderBottom: '1px solid var(--color-border-2)',
                  }}
                >
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                    {note.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>
                    {note.folder} · {note.preview?.slice(0, 50)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedNote && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px', fontSize: '14px' }}>已选择</div>
              <Tag color="arcoblue" closable onClose={() => setSelectedNote(null)}>
                {selectedNote.title}
              </Tag>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px', fontSize: '14px' }}>关联类型</div>
              <Select value={newRelationType} onChange={setNewRelationType} style={{ width: '100%' }}>
                {Object.entries(RELATION_CONFIG).map(([key, config]) => (
                  <Option key={key} value={key}>{config.label}</Option>
                ))}
              </Select>
            </div>

            <div>
              <div style={{ marginBottom: '8px', fontSize: '14px' }}>描述（可选）</div>
              <Input.TextArea
                placeholder="添加关联描述..."
                value={newRelationDesc}
                onChange={setNewRelationDesc}
                rows={3}
              />
            </div>
          </>
        )}
      </Modal>

      {/* 编辑关联弹窗 */}
      <Modal
        title="编辑关联"
        visible={editModalVisible}
        onOk={handleUpdateRelation}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingRelation(null);
        }}
        okText="保存"
        cancelText="取消"
      >
        {editingRelation && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px', fontSize: '14px' }}>目标笔记</div>
              <div style={{ padding: '8px 12px', background: 'var(--color-fill-2)', borderRadius: '4px' }}>
                {editingRelation.title}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px', fontSize: '14px' }}>关联类型</div>
              <Select value={editRelationType} onChange={setEditRelationType} style={{ width: '100%' }}>
                {Object.entries(RELATION_CONFIG).map(([key, config]) => (
                  <Option key={key} value={key}>{config.label}</Option>
                ))}
              </Select>
            </div>

            <div>
              <div style={{ marginBottom: '8px', fontSize: '14px' }}>描述</div>
              <Input.TextArea
                placeholder="添加关联描述..."
                value={editRelationDesc}
                onChange={setEditRelationDesc}
                rows={3}
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default RelationsPanel;
