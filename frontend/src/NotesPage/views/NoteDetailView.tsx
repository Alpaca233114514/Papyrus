import { useState, useEffect, useRef } from 'react';
import { Typography, Input, Tag, Button, Breadcrumb, Message, Modal, Dropdown } from '@arco-design/web-react';
import SmartTextArea, { type SmartTextAreaRef } from '../../components/SmartTextArea';
const BreadcrumbItem = Breadcrumb.Item;
import { 
  IconLeft,
  IconDelete, 
  IconEdit,
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

interface NoteDetailViewProps {
  note: Note | null;
  isCreateMode: boolean;
  allFolders: string[];
  onBack: () => void;
  onSave: (params: UpdateNoteParams | CreateNoteParams, isCreate: boolean) => void;
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
  const [isEditing, setIsEditing] = useState(isCreateMode);
  
  // 关联功能状态
  const [showRelationsPanel, setShowRelationsPanel] = useState(false);
  const [showGraphDrawer, setShowGraphDrawer] = useState(false);
  
  // SmartTextArea ref
  const textAreaRef = useRef<SmartTextAreaRef>(null);
  
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

  // 初始化表单
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || note.preview);
      setFolder(note.folder);
      setTags(note.tags);
      setIsEditing(isCreateMode);
    } else if (isCreateMode) {
      setTitle('');
      setContent('');
      setFolder(allFolders[0] || '默认文件夹');
      setTags([]);
      setIsEditing(true);
    }
  }, [note, isCreateMode, allFolders]);

  const handleSave = (showMessage = true) => {
    if (!title.trim()) {
      Message.warning('请输入标题');
      return false;
    }

    if (isCreateMode) {
      onSave({
        title: title.trim(),
        folder: folder.trim() || '默认文件夹',
        content: content.trim(),
        tags,
      }, true);
    } else if (note) {
      onSave({
        id: note.id,
        title: title.trim(),
        folder: folder.trim(),
        content: content.trim(),
        tags,
      }, false);
    }
    if (showMessage) {
      Message.success('保存成功');
    }
    setIsEditing(false);
    return true;
  };
  
  // 返回时自动保存
  const handleBackWithSave = () => {
    if ((isEditing || isCreateMode) && title.trim()) {
      handleSave(false);
    }
    onBack();
  };

  const handleDelete = () => {
    if (note && onDelete) {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除笔记 "${note.title}" 吗？`,
        onOk: () => {
          onDelete(note.id);
          Message.success('删除成功');
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
              onClick={onBack}
            >
              笔记库
            </BreadcrumbItem>
            <BreadcrumbItem>{folder || note?.folder || '默认'}</BreadcrumbItem>
            <BreadcrumbItem>{title || note?.title || '新笔记'}</BreadcrumbItem>
          </Breadcrumb>
        </div>

        {/* 右侧操作按钮 */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {(isEditing || isCreateMode) && (
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
          {!isCreateMode && !isEditing && (
            <Button
              type='primary'
              icon={<IconEdit />}
              onClick={() => setIsEditing(true)}
            />
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
              background: '#FFFBE6',
              borderRadius: '8px',
              border: '1px solid #FFE58F',
              marginBottom: '24px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              alignItems: 'center',
            }}
          >
            {isEditing || isCreateMode ? (
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
          {isEditing || isCreateMode ? (
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

          {/* 内容 */}
          {isEditing || isCreateMode ? (
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
              style={{
                fontSize: '15px',
                lineHeight: '1.8',
                color: 'var(--color-text-1)',
              }}
            >
              {content.split('\n').map((line, index) => {
                if (line.startsWith('# ')) {
                  return (
                    <h1 key={index} style={{ fontSize: '24px', margin: '16px 0 8px' }}>
                      {line.slice(2)}
                    </h1>
                  );
                }
                if (line.startsWith('## ')) {
                  return (
                    <h2 key={index} style={{ fontSize: '20px', margin: '16px 0 8px' }}>
                      {line.slice(3)}
                    </h2>
                  );
                }
                if (line.startsWith('### ')) {
                  return (
                    <h3 key={index} style={{ fontSize: '16px', margin: '16px 0 8px' }}>
                      {line.slice(4)}
                    </h3>
                  );
                }
                if (line.startsWith('- ')) {
                  return (
                    <li key={index} style={{ marginLeft: '16px' }}>
                      {line.slice(2)}
                    </li>
                  );
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return (
                    <strong key={index} style={{ display: 'block', margin: '8px 0' }}>
                      {line.slice(2, -2)}
                    </strong>
                  );
                }
                return (
                  <p key={index} style={{ margin: '8px 0' }}>
                    {line || <br />}
                  </p>
                );
              })}
            </div>
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
              onNavigateToNote={(targetId) => {
                // 保存当前笔记后跳转
                if ((isEditing || isCreateMode) && title.trim()) {
                  handleSave(false);
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
        width={800}
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
