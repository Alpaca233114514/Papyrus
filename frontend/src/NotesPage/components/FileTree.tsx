import { useState } from 'react';
import { Typography, Input } from '@arco-design/web-react';
import { 
  IconFolder, 
  IconFile,
  IconSearch,
  IconCaretRight,
  IconCaretDown,
  IconPlus
} from '@arco-design/web-react/icon';
import type { Note } from '../types';
import { PRIMARY_COLOR } from '../constants';

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'note';
  children?: TreeNode[];
  note?: Note;
}

interface FileTreeProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onCreateNote: (folder: string) => void;
  width: number;
}

// 将扁平的笔记列表转换为树形结构
const buildTree = (notes: Note[]): TreeNode[] => {
  const root: TreeNode[] = [];
  const folderMap = new Map<string, TreeNode>();

  notes.forEach(note => {
    // 确保文件夹节点存在
    if (!folderMap.has(note.folder)) {
      const folderNode: TreeNode = {
        id: `folder-${note.folder}`,
        name: note.folder,
        type: 'folder',
        children: [],
      };
      folderMap.set(note.folder, folderNode);
      root.push(folderNode);
    }

    // 添加笔记到对应文件夹
    const folderNode = folderMap.get(note.folder)!;
    folderNode.children!.push({
      id: note.id,
      name: note.title,
      type: 'note',
      note,
    });
  });

  // 按名称排序
  root.sort((a, b) => a.name.localeCompare(b.name));
  root.forEach(folder => {
    folder.children!.sort((a, b) => a.name.localeCompare(b.name));
  });

  return root;
};

// 文件夹节点
const FolderNode = ({ 
  node, 
  selectedNoteId, 
  onSelectNote,
  onCreateNote,
  defaultExpanded = true,
}: { 
  node: TreeNode; 
  selectedNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onCreateNote: (folder: string) => void;
  defaultExpanded?: boolean;
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div>
      {/* 文件夹标题 */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          cursor: 'pointer',
          borderRadius: '6px',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-fill-2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {expanded ? (
          <IconCaretDown style={{ fontSize: '12px', color: 'var(--color-text-3)' }} />
        ) : (
          <IconCaretRight style={{ fontSize: '12px', color: 'var(--color-text-3)' }} />
        )}
        <IconFolder style={{ fontSize: '14px', color: PRIMARY_COLOR }} />
        <Typography.Text 
          style={{ 
            fontSize: '13px', 
            fontWeight: 400,
            flex: 1,
          }}
        >
          {node.name}
        </Typography.Text>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onCreateNote(node.name);
          }}
          style={{
            padding: '2px 4px',
            borderRadius: '4px',
            opacity: 0,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.background = 'var(--color-fill-3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0';
          }}
        >
          <IconPlus style={{ fontSize: '12px', color: 'var(--color-text-3)' }} />
        </div>
      </div>

      {/* 子节点 */}
      {expanded && node.children && (
        <div style={{ paddingLeft: '20px' }}>
          {node.children.map(child => (
            <div
              key={child.id}
              onClick={() => child.note && onSelectNote(child.note)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                cursor: 'pointer',
                borderRadius: '6px',
                background: selectedNoteId === child.id ? `${PRIMARY_COLOR}15` : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (selectedNoteId !== child.id) {
                  e.currentTarget.style.background = 'var(--color-fill-2)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedNoteId !== child.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <IconFile 
                style={{ 
                  fontSize: '14px', 
                  color: selectedNoteId === child.id ? PRIMARY_COLOR : 'var(--color-text-3)',
                }} 
              />
              <Typography.Text 
                style={{ 
                  fontSize: '13px',
                  color: selectedNoteId === child.id ? PRIMARY_COLOR : 'var(--color-text-1)',
                }}
              >
                {child.name}
              </Typography.Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree = ({ 
  notes, 
  selectedNoteId, 
  onSelectNote,
  onCreateNote,
  width,
}: FileTreeProps) => {
  const [search, setSearch] = useState('');
  const tree = buildTree(notes);

  const filteredTree = search
    ? tree.map(folder => ({
        ...folder,
        children: folder.children?.filter(child =>
          child.name.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(folder => folder.children && folder.children.length > 0)
    : tree;

  return (
    <div
      style={{
        width: `${width}px`,
        height: '100%',
        borderRight: '1px solid var(--color-border-2)',
        background: 'var(--color-bg-1)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 标题栏 */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--color-border-2)',
        }}
      >
        <Typography.Text
          style={{
            fontSize: '14px',
            fontWeight: 500,
            display: 'block',
            marginBottom: '16px',
          }}
        >
          文件树
        </Typography.Text>
        <Input
          prefix={<IconSearch style={{ color: 'var(--color-text-3)' }} />}
          placeholder='搜索笔记...'
          value={search}
          onChange={setSearch}
          size='small'
        />
      </div>

      {/* 树形内容 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
        }}
      >
        {filteredTree.map(folder => (
          <FolderNode
            key={folder.id}
            node={folder}
            selectedNoteId={selectedNoteId}
            onSelectNote={onSelectNote}
            onCreateNote={onCreateNote}
            defaultExpanded={!search}
          />
        ))}
      </div>
    </div>
  );
};
