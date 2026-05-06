import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Typography, Input, Tag, Button, Breadcrumb, Message, Modal, Dropdown } from '@arco-design/web-react';
import SmartTextArea, { type SmartTextAreaRef } from '../../components/SmartTextArea';
const BreadcrumbItem = Breadcrumb.Item;
import {
  IconLeft,
  IconDelete,
  IconFolder,
  IconHistory,
  IconTags,
  IconPlus,
  IconH1,
  IconH2,
  IconH3,
  IconLink,
  IconMindMapping,
} from '@arco-design/web-react/icon';
import { RelationsPanel, RelationGraph } from '../components/Relations';
import type { Note, CreateNoteParams, UpdateNoteParams } from '../types';
import { PRIMARY_COLOR } from '../constants';
import { renderMarkdown } from '../../utils/markdown';

interface NoteDetailViewProps {
  note: Note | null;
  isCreateMode: boolean;
  allFolders: string[];
  onBack: () => void;
  onSave: (params: UpdateNoteParams | CreateNoteParams, isCreate: boolean, shouldReturnToList?: boolean) => Promise<void>;
  onDelete?: (id: string) => void;
}

export const NoteDetailView = ({
  note,
  isCreateMode,
  allFolders,
  onBack,
  onSave,
  onDelete,
}: NoteDetailViewProps) => {
  // 表单状态
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folder, setFolder] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // 关联功能状态
  const [showRelationsPanel, setShowRelationsPanel] = useState(false);
  const [showGraphDrawer, setShowGraphDrawer] = useState(false);
  
  // SmartTextArea ref
  const textAreaRef = useRef<SmartTextAreaRef>(null);

  // 脏状态跟踪与防抖自动保存
  const isDirty = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 插入标题
  const insertHeading = (level: number) => {
    const heading = '#'.repeat(level) + ' ';
    textAreaRef.current?.insertAtCursor(heading);
  };
  
  // 下拉菜单项
  const headingMenuItems = [
    { key: 'h1', label: '一级标题', icon: <IconH1 />, onClick: () => insertHeading(1) },
    { key: 'h2', label: '二级标题', icon: <IconH2 />, onClick: () => insertHeading(2) },
    { key: 'h3', label: '三级标题', icon: <IconH3 />, onClick: () => insertHeading(3) },
  ];

  // 锁定状态 - 监听全局编辑锁定
  const [isGloballyLocked, setIsGloballyLocked] = useState(false);
  
  useEffect(() => {
    const handleLockChange = (e: CustomEvent<{ locked: boolean }>) => {
      setIsGloballyLocked(e.detail.locked);
      // 如果全局锁定且当前可编辑（非创建模式且之前未锁定），自动保存
      if (e.detail.locked && !isGloballyLocked && !isCreateMode) {
        void handleSave(false);
      }
    };

    window.addEventListener('papyrus_edit_lock_changed', handleLockChange as EventListener);
    return () => window.removeEventListener('papyrus_edit_lock_changed', handleLockChange as EventListener);
  }, [isGloballyLocked, isCreateMode]);

  // 初始化表单 - 编辑模式
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || note.preview);
      setFolder(note.folder);
      setTags(note.tags);
    }
  }, [note]);

  // 创建模式初始化 - 只在进入创建模式时执行
  useEffect(() => {
    if (isCreateMode && !note) {
      setContent('');
      setFolder(allFolders[0] || '默认文件夹');
      setTags([]);
    }
  }, [isCreateMode, allFolders, note]);

  // 输入变化时标记脏状态
  useEffect(() => {
    isDirty.current = true;
  }, [title, content, folder, tags]);

  const handleSave = async (showMessage = true, shouldReturnToList = true) => {
    if (!title.trim()) {
      Message.warning('请输入标题');
      return false;
    }

    try {
      if (isCreateMode) {
        await onSave({
          title: title.trim(),
          folder: folder.trim() || '默认文件夹',
          content: content.trim(),
          tags,
        }, true, shouldReturnToList);
      } else if (note) {
        await onSave({
          id: note.id,
          title: title.trim(),
          folder: folder.trim(),
          content: content.trim(),
          tags,
        }, false, shouldReturnToList);
      }
      if (showMessage) {
        Message.success('保存成功');
      }
      isDirty.current = false;
      return true;
    } catch (err) {
      Message.error(err instanceof Error ? err.message : '保存失败');
      return false;
    }
  };

  // 编辑状态由全局锁定和创建模式推导：创建模式始终可编辑，否则由全局锁定控制
  const isEditable = isCreateMode || !isGloballyLocked;

  // 防抖自动保存（2秒无输入后触发）
  useEffect(() => {
    if (!isEditable || !title.trim()) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (isDirty.current) {
        void handleSave(false, false);
        isDirty.current = false;
      }
    }, 2000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [title, content, folder, tags, isEditable]);

  // 组件卸载时如有未保存内容则自动保存
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (isDirty.current && title.trim()) {
        void handleSave(false, false);
      }
    };
  }, []);

  // 返回时自动保存
  const handleBackWithSave = async () => {
    if (isEditable && title.trim()) {
      const success = await handleSave(false, true);
      if (!success) return;
    }
    onBack();
  };

  const handleDelete = () => {
    if (note && onDelete) {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除笔记 "${note.title}" 吗？`,
        onOk: async () => {
          try {
            await onDelete(note.id);
            Message.success('删除成功');
          } catch {
            Message.error('删除失败');
          }
        },
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // 内容区域 ref
  const contentRef = useRef<HTMLDivElement>(null);
  
  // 生成大纲，并记录每个标题的行索引
  const generateOutline = (text: string) => {
    const lines = text.split('\n');
    const outline: { level: number; title: string; lineIndex: number }[] = [];
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,3})\s+(.+)/);
      if (match) {
        outline.push({
          level: match[1].length,
          title: match[2],
          lineIndex: index,
        });
      }
    });
    return outline;
  };
  
  // 点击大纲跳转到对应位置
  const scrollToHeading = (lineIndex: number) => {
    if (!contentRef.current) return;
    
    // 在预览模式下，通过计算行高来估算位置
    const lineHeight = 27; // 15px font-size * 1.8 line-height
    const paddingTop = 32; // 内容区 padding-top
    const metaHeight = 80; // 元信息区域高度估算
    const targetScrollTop = paddingTop + metaHeight + (lineIndex * lineHeight);
    
    contentRef.current.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });
  };

  const outline = generateOutline(content);

  // 触发字数统计事件
  useEffect(() => {
    const chars = content.length;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const headings = outline.length;
    
    window.dispatchEvent(new CustomEvent('papyrus_note_stats', {
      detail: { chars, words, headings }
    }));
  }, [content, outline]);

  // 组件卸载时清空统计
  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('papyrus_note_stats', {
        detail: { chars: 0, words: 0, headings: 0 }
      }));
    };
  }, []);

  // 渲染 Markdown 内容为 HTML
  const renderedContent = useMemo(() => {
    return renderMarkdown(content);
  }, [content]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 顶部栏：面包屑居中 */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--color-border-2)',
          background: 'var(--color-bg-1)',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {/* 返回按钮 - 左侧 */}
        <Button
          type='text'
          icon={<IconLeft />}
          onClick={handleBackWithSave}
        >
          返回
        </Button>

        {/* 面包屑 - 居中 */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <Breadcrumb>
            <BreadcrumbItem
              style={{ cursor: 'pointer' }}
              onClick={handleBackWithSave}
            >
              笔记库
            </BreadcrumbItem>
            <BreadcrumbItem>{folder || note?.folder || '默认'}</BreadcrumbItem>
            <BreadcrumbItem>{title || note?.title || '新笔记'}</BreadcrumbItem>
          </Breadcrumb>
        </div>

        {/* 右侧操作按钮 */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {(isEditable) && (
            <>
              <Dropdown droplist={
                <div style={{ 
                  background: 'var(--color-bg-1)', 
                  border: '1px solid var(--color-border-2)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}>
                  {headingMenuItems.map(item => (
                    <div
                      key={item.key}
                      onClick={item.onClick}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: 'var(--color-text-1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-fill-2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {item.icon}
                      {item.label}
                    </div>
                  ))}
                </div>
              } position='bottom'>
                <Button type='secondary' icon={<IconPlus />} />
              </Dropdown>
              {!isCreateMode && onDelete && (
                <Button
                  type='text'
                  status='danger'
                  icon={<IconDelete />}
                  onClick={handleDelete}
                />
              )}
            </>
          )}

          {!isCreateMode && (
            <>
              <Button
                type={showRelationsPanel ? 'primary' : 'secondary'}
                icon={<IconLink />}
                onClick={() => setShowRelationsPanel(!showRelationsPanel)}
              >
                关联
              </Button>
              <Button
                type='secondary'
                icon={<IconMindMapping />}
                onClick={() => setShowGraphDrawer(true)}
              >
                图谱
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左侧：大纲导航 */}
        <div
          style={{
            width: '200px',
            borderRight: '1px solid var(--color-border-2)',
            background: 'var(--color-bg-1)',
            padding: '16px',
            overflowY: 'auto',
          }}
        >
          <Typography.Text
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-text-2)',
              display: 'block',
              marginBottom: '16px',
            }}
          >
            大纲
          </Typography.Text>
          {outline.length > 0 ? (
            outline.map((item, index) => (
              <div
                key={index}
                onClick={() => scrollToHeading(item.lineIndex)}
                style={{
                  padding: '4px 8px',
                  paddingLeft: `${(item.level - 1) * 16 + 8}px`,
                  fontSize: '13px',
                  color: 'var(--color-text-2)',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-fill-2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {item.title}
              </div>
            ))
          ) : (
            <Typography.Text type='secondary' style={{ fontSize: '12px' }}>
              使用 # ## ### 创建标题
            </Typography.Text>
          )}
        </div>

        {/* 右侧：编辑/预览区 */}
        <div
          ref={contentRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '32px 48px',
            background: 'var(--color-bg-1)',
          }}
        >
          {/* 元信息区 */}
          <div
            style={{
              padding: '16px',
              background: 'var(--color-fill-2)',
              borderRadius: '8px',
              border: '1px solid var(--color-border-2)',
              marginBottom: '24px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              alignItems: 'center',
            }}
          >
            {isEditable ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconFolder style={{ fontSize: '14px', color: 'var(--color-text-2)' }} />
                  <Input
                    value={folder}
                    onChange={setFolder}
                    style={{ width: '120px' }}
                    size='small'
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <IconTags style={{ fontSize: '14px', color: 'var(--color-text-2)' }} />
                  {tags.map(tag => (
                    <Tag
                      key={tag}
                      size='small'
                      color='arcoblue'
                      closable
                      onClose={() => handleRemoveTag(tag)}
                    >
                      {tag}
                    </Tag>
                  ))}
                  <Input
                    value={newTag}
                    onChange={setNewTag}
                    onPressEnter={handleAddTag}
                    placeholder='+ 标签'
                    style={{ width: '80px' }}
                    size='small'
                  />
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <IconFolder style={{ fontSize: '14px' }} />
                  {note?.folder}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <IconHistory style={{ fontSize: '14px' }} />
                  {note?.updatedAt}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {note?.tags.map(tag => (
                    <Tag key={tag} size='small' color='arcoblue'>
                      {tag}
                    </Tag>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 标题 */}
          {isEditable ? (
            <Input
              value={title}
              onChange={setTitle}
              placeholder='输入标题...'
              style={{
                fontSize: '32px',
                fontWeight: 500,
                border: 'none',
                background: 'transparent',
                padding: 0,
                marginBottom: '24px',
              }}
            />
          ) : (
            <Typography.Title
              heading={2}
              style={{ marginBottom: '24px', fontSize: '28px', fontWeight: 400 }}
            >
              {note?.title}
            </Typography.Title>
          )}

          {/* 内容 - 编辑模式：显示 SmartTextArea，预览模式：显示渲染后的 Markdown */}
          {isEditable ? (
            <SmartTextArea
              ref={textAreaRef}
              value={content}
              onChange={setContent}
              placeholder='# 开始写作...'
              enableCompletion={true}
              style={{
                width: '100%',
                minHeight: '500px',
                border: 'none',
                background: 'transparent',
                fontSize: '15px',
                lineHeight: '1.8',
                resize: 'none',
                fontFamily: 'inherit',
              }}
            />
          ) : (
            <div
              className="markdown-preview chat-markdown"
              style={{
                fontSize: '15px',
                lineHeight: '1.8',
                color: 'var(--color-text-1)',
              }}
              dangerouslySetInnerHTML={{ __html: renderedContent }}
            />
          )}
        </div>

        {/* 关联面板 */}
        {showRelationsPanel && note && (
          <div
            style={{
              width: '320px',
              borderLeft: '1px solid var(--color-border-2)',
              background: 'var(--color-bg-1)',
            }}
          >
            <RelationsPanel
              noteId={note.id}
              onNavigateToNote={async (targetId) => {
                // 保存当前笔记后跳转
                if (isEditable && title.trim()) {
                  const success = await handleSave(false);
                  if (!success) return;
                }
                onBack();
                // 这里可以添加跳转到目标笔记的逻辑
              }}
            />
          </div>
        )}
      </div>

      {/* 关联图谱弹窗 */}
      <Modal
        title="关联图谱"
        visible={showGraphDrawer}
        onCancel={() => setShowGraphDrawer(false)}
        footer={null}
        style={{ width: 800 }}
      >
        {note && (
          <div style={{ height: '500px' }}>
            <RelationGraph
              noteId={note.id}
              depth={1}
              onNodeClick={(nodeId) => {
                setShowGraphDrawer(false);
                // 可以添加跳转到对应笔记的逻辑
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
