import { Typography, Button, Tag, Radio, Empty, Tooltip } from '@arco-design/web-react';
import { useState, useEffect } from 'react';
import { IconFolderAdd, IconUpload, IconFolder, IconImage, IconFileVideo, IconMusic, IconFile, IconDownload, IconDelete } from '@arco-design/web-react/icon';
import { usePageScenery } from '../hooks/useScenery';
import { useSceneryColor } from '../hooks/useSceneryColor';

import ZipIcon from './ZipIcon';

const PRIMARY_COLOR = '#206CCF';
const SECONDARY_COLOR = '#9FD4FD';

// 类型定义
interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'image' | 'video' | 'audio' | 'document' | 'archive' | 'unknown';
  size?: string;
  updatedAt: string;
  itemCount?: number;
}

// 通用卡片样式
const useCardStyle = (hovered: boolean) => ({
  borderRadius: '16px',
  border: `2px solid ${hovered ? SECONDARY_COLOR : 'var(--color-text-3)'}`,
  background: 'transparent',
  transition: 'border-color 0.2s, background 0.2s',
  cursor: 'pointer',
});

// 文件图标
const FileIcon = ({ type, size = 48 }: { type: FileItem['type']; size?: number }) => {
  const iconSize = size * 0.5;

  switch (type) {
    case 'folder':
      return <IconFolder style={{ fontSize: iconSize, color: '#206CCF' }} />;
    case 'image':
      return <IconImage style={{ fontSize: iconSize, color: '#722ED1' }} />;
    case 'video':
      return <IconFileVideo style={{ fontSize: iconSize, color: '#F53F3F' }} />;
    case 'audio':
      return <IconMusic style={{ fontSize: iconSize, color: '#14C9C9' }} />;
    case 'archive':
      return <ZipIcon size={iconSize} color="#FF7D00" />;
    default:
      return <IconFile style={{ fontSize: iconSize, color: 'var(--color-text-3)' }} />;
  }
};

// 网格文件卡片
const GridFileCard = ({ file }: { file: FileItem }) => {
  const [hovered, setHovered] = useState(false);
  const cardStyle = useCardStyle(hovered);

  return (
    <Tooltip content={file.name} position='top'>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...cardStyle,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '12px',
        }}
      >
        <FileIcon type={file.type} size={48} />
        <div style={{ width: '100%' }}>
          <Typography.Text style={{ fontSize: '14px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
            {file.name}
          </Typography.Text>
          <Typography.Text type='secondary' style={{ fontSize: '12px' }}>
            {file.type === 'folder' ? `${file.itemCount} 项` : file.size} · {file.updatedAt}
          </Typography.Text>
        </div>
      </div>
    </Tooltip>
  );
};

// 列表文件行
const ListFileRow = ({ file }: { file: FileItem }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: '8px',
        border: `2px solid ${hovered ? SECONDARY_COLOR : 'transparent'}`,
        background: 'transparent',
        padding: '12px 16px',
        cursor: 'pointer',
        transition: 'border-color 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <FileIcon type={file.type} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Typography.Text style={{ fontSize: '14px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: hovered ? '#57A9FB' : 'var(--color-text-1)' }} title={file.name}>
          {file.name}
        </Typography.Text>
      </div>
      <Typography.Text type='secondary' style={{ fontSize: '13px', width: '100px' }}>
        {file.type === 'folder' ? `${file.itemCount} 项` : file.size}
      </Typography.Text>
      <Typography.Text type='secondary' style={{ fontSize: '13px', width: '80px' }}>
        {file.updatedAt}
      </Typography.Text>
      <div style={{ display: 'flex', gap: '8px', opacity: hovered ? 1 : 0, transition: 'opacity 0.2s' }}>
        <IconDownload style={{ fontSize: '16px', color: 'var(--color-text-3)', cursor: 'pointer' }} />
        <IconDelete style={{ fontSize: '16px', color: 'var(--color-text-3)', cursor: 'pointer' }} />
      </div>
    </div>
  );
};

// 统计栏组件
interface StatsBarProps {
  stats: { totalFiles: number; totalFolders: number; totalSize: string };
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  loading: boolean;
}

const StatsBar = ({ stats, viewMode, setViewMode, loading }: StatsBarProps) => {
  const { config: sceneryConfig, loaded } = usePageScenery('files');
  const { primaryTextColor, secondaryTextColor } = useSceneryColor(
    sceneryConfig.enabled ? sceneryConfig.image : undefined,
    sceneryConfig.enabled
  );

  if (loading || !loaded) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
        marginBottom: '24px',
        borderRadius: '16px',
        border: '1px solid var(--color-text-3)',
        background: 'var(--color-fill-2)',
      }}>
        <Typography.Text type="secondary">加载中...</Typography.Text>
      </div>
    );
  }

  const content = (
    <div style={{ display: 'flex', gap: '64px' }}>
      <div>
        <Typography.Text style={{ fontSize: '28px', fontWeight: 600, color: sceneryConfig.enabled ? primaryTextColor : undefined }}>{stats.totalFiles}</Typography.Text>
        <Typography.Text type='secondary' style={{ fontSize: '13px', display: 'block', marginTop: '4px', color: sceneryConfig.enabled ? secondaryTextColor : undefined }}>文件</Typography.Text>
      </div>
      <div>
        <Typography.Text style={{ fontSize: '28px', fontWeight: 600, color: sceneryConfig.enabled ? primaryTextColor : undefined }}>{stats.totalFolders}</Typography.Text>
        <Typography.Text type='secondary' style={{ fontSize: '13px', display: 'block', marginTop: '4px', color: sceneryConfig.enabled ? secondaryTextColor : undefined }}>文件夹</Typography.Text>
      </div>
      <div>
        <Typography.Text style={{ fontSize: '28px', fontWeight: 600, color: sceneryConfig.enabled ? primaryTextColor : undefined }}>{stats.totalSize}</Typography.Text>
        <Typography.Text type='secondary' style={{ fontSize: '13px', display: 'block', marginTop: '4px', color: sceneryConfig.enabled ? secondaryTextColor : undefined }}>占用空间</Typography.Text>
      </div>
    </div>
  );

  if (!sceneryConfig.enabled) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        marginBottom: '24px',
        borderRadius: '16px',
        border: '1px solid var(--color-text-3)',
        background: 'var(--color-fill-2)',
      }}>
        {content}
        <Radio.Group type='button' value={viewMode} onChange={setViewMode} options={[{ label: '网格', value: 'grid' }, { label: '列表', value: 'list' }]} />
      </div>
    );
  }

  const image = sceneryConfig.image;
  const poem = '且将新火试新茶，诗酒趁年华。';
  const source = '[宋] 苏轼《望江南·超然台作》';
  const overlayOpacity = Math.max(0.25, Math.min(0.75, sceneryConfig.opacity));

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '24px',
      marginBottom: '24px',
      borderRadius: '16px',
      border: '1px solid var(--color-text-3)',
      overflow: 'hidden',
    }}>
      <img
        src={image}
        alt={`窗景图片：${poem} —— ${source}`}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `rgba(255, 255, 255, ${overlayOpacity})`,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {content}
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Radio.Group type='button' value={viewMode} onChange={setViewMode} options={[{ label: '网格', value: 'grid' }, { label: '列表', value: 'list' }]} />
      </div>
    </div>
  );
};

const FilesPage = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟加载文件列表
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  const stats = {
    totalFiles: files.filter(f => f.type !== 'folder').length,
    totalFolders: files.filter(f => f.type === 'folder').length,
    totalSize: '-',
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '48px 64px 64px', background: 'var(--color-bg-1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <Typography.Title heading={1} style={{ fontWeight: 600, lineHeight: 1, margin: 0, fontSize: '40px' }}>
            文件库
          </Typography.Title>
          <Typography.Text type='secondary' style={{ fontSize: '14px', marginTop: '8px', display: 'block' }}>
            {stats.totalFiles} 个文件 · {stats.totalFolders} 个文件夹
          </Typography.Text>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button 
            shape='round'
            size='large'
            type='secondary' 
            icon={<IconFolderAdd />}
            style={{ height: '40px', padding: '0 20px', fontSize: '14px' }}
          >
            新建文件夹
          </Button>
          <Button 
            shape='round'
            size='large'
            type='primary' 
            icon={<IconUpload />} 
            style={{ height: '40px', padding: '0 20px', fontSize: '14px', backgroundColor: PRIMARY_COLOR }}
          >
            上传文件
          </Button>
        </div>
      </div>

      <StatsBar stats={stats} viewMode={viewMode} setViewMode={setViewMode} loading={loading} />

      {files.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['全部', '文件夹', '文档', '图片', '视频', '音频'].map(tag => (
            <Tag key={tag} color={tag === '全部' ? 'arcoblue' : undefined} style={{ cursor: 'pointer' }}>{tag}</Tag>
          ))}
        </div>
      )}

      {files.length === 0 ? (
        <Empty description='暂无文件' style={{ padding: '64px 0' }} />
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
          {files.map(file => <GridFileCard key={file.id} file={file} />)}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--color-text-3)', borderRadius: '12px', overflow: 'hidden', background: 'var(--color-bg-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--color-border-2)', background: 'var(--color-fill-2)', fontSize: '13px', color: 'var(--color-text-3)', fontWeight: 500 }}>
            <div style={{ width: '32px', marginRight: '16px' }} />
            <div style={{ flex: 1 }}>名称</div>
            <div style={{ width: '100px' }}>大小</div>
            <div style={{ width: '80px' }}>修改时间</div>
            <div style={{ width: '60px' }} />
          </div>
          {files.map(file => <ListFileRow key={file.id} file={file} />)}
        </div>
      )}

      <div style={{ height: '32px' }} />
    </div>
  );
};

export default FilesPage;
