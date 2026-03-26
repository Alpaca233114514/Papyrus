import { useState, useEffect } from 'react';
import { Typography, Input, Tag, Button, Breadcrumb, Message, Modal } from '@arco-design/web-react';
const BreadcrumbItem = Breadcrumb.Item;
import { 
  IconLeft,
  IconDelete, 
  IconCheck,
  IconEdit,
  IconFolder,
  IconHistory,
  IconTags
} from '@arco-design/web-react/icon';
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

  const handleSave = () => {
    if (!title.trim()) {
      Message.warning('请输入标题');
      return;
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
    Message.success('保存成功');
    setIsEditing(false);
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

  // 生成大纲
  const generateOutline = (text: string) => {
    const lines = text.split('\n');
    const outline: { level: number; title: string }[] = [];
    lines.forEach(line => {
      const match = line.match(/^(#{1,3})\s+(.+)/);
      if (match) {
        outline.push({
          level: match[1].length,
          title: match[2],
        });
      }
    });
    return outline;
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
          onClick={onBack}
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
            <Input.TextArea
              value={content}
              onChange={setContent}
              placeholder='# 开始写作...'
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
      </div>
    </div>
  );
};
