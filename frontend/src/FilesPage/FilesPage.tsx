import { Typography, Button, Tag, Radio, Empty, Tooltip, Message, Modal, Input, Breadcrumb } from '@arco-design/web-react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { IconFolderAdd, IconUpload, IconFolder, IconImage, IconFileVideo, IconMusic, IconFile, IconDownload, IconDelete, IconLeft } from '@arco-design/web-react/icon';
import { usePageScenery } from '../hooks/useScenery';
import { useSceneryColor } from '../hooks/useSceneryColor';
import { api, getFileUrl } from '../api';
import type { FileItemData } from '../api';

import ZipIcon from './ZipIcon';
import FilePreviewModal from './FilePreviewModal';
import './FilesPage.css';

const PRIMARY_COLOR = '#206CCF';

// 文件图标
const FileTypeIcon = ({ type, size = 48 }: { type: string; size?: number }) => {
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('zh-CN');
}

// 网格文件卡片
const GridFileCard = ({ file, onClick }: { file: FileItemData; onClick?: (f: FileItemData) => void }) => {
  return (
    <Tooltip content={file.name} position='top'>
      <div
        className="files-grid-card"
        onClick={() => onClick?.(file)}
      >
        <FileTypeIcon type={file.type} size={48} />
        <div className="files-grid-card-name-wrapper">
          <Typography.Text className="files-grid-card-name" title={file.name}>
            {file.name}
          </Typography.Text>
          <Typography.Text type='secondary' className="files-grid-card-meta">
            {file.is_folder ? `${file.itemCount ?? 0} 项` : formatSize(file.size)} · {formatDate(file.updated_at)}
          </Typography.Text>
        </div>
      </div>
    </Tooltip>
  );
};

// 列表文件行
const ListFileRow = ({ file, onClick, onDownload, onDelete }: { file: FileItemData; onClick?: (f: FileItemData) => void; onDownload?: (f: FileItemData) => void; onDelete?: (id: string) => void }) => {
  return (
    <div
      className="files-list-row"
      onClick={() => onClick?.(file)}
    >
      <FileTypeIcon type={file.type} size={32} />
      <div className="files-list-name-wrapper">
        <Typography.Text className="files-list-name" title={file.name}>
          {file.name}
        </Typography.Text>
      </div>
      <Typography.Text type='secondary' className="files-list-size">
        {file.is_folder ? `${file.itemCount ?? 0} 项` : formatSize(file.size)}
      </Typography.Text>
      <Typography.Text type='secondary' className="files-list-date">
        {formatDate(file.updated_at)}
      </Typography.Text>
      <div className="files-list-actions">
        <IconDownload className="files-list-action-icon" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDownload?.(file); }} />
        <IconDelete className="files-list-action-icon" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete?.(file.id); }} />
      </div>
    </div>
  );
};

// 筛选标签映射
const FILTER_TAGS = ['全部', '文件夹', '文档', '图片', '视频', '音频'] as const;
type FilterTag = typeof FILTER_TAGS[number];

const FILTER_MAP: Record<FilterTag, (f: FileItemData) => boolean> = {
  '全部': () => true,
  '文件夹': (f) => Boolean(f.is_folder),
  '文档': (f) => !f.is_folder && (f.type === 'document' || f.type === 'unknown'),
  '图片': (f) => !f.is_folder && f.type === 'image',
  '视频': (f) => !f.is_folder && f.type === 'video',
  '音频': (f) => !f.is_folder && f.type === 'audio',
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
  const { primaryTextColor, secondaryTextColor, averageBrightness } = useSceneryColor(
    sceneryConfig.enabled ? sceneryConfig.image : undefined,
    sceneryConfig.enabled
  );

  if (loading || !loaded) {
    return (
      <div className="files-stats-loading">
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
      <div className="files-stats-bar" style={{ background: 'var(--color-fill-2)' }}>
        {content}
        <Radio.Group type='button' value={viewMode} onChange={setViewMode} options={[{ label: '网格', value: 'grid' }, { label: '列表', value: 'list' }]} />
      </div>
    );
  }

  const image = sceneryConfig.image;
  const poem = '且将新火试新茶，诗酒趁年华。';
  const source = '[宋] 苏轼《望江南·超然台作》';
  const overlayOpacity = Math.max(0.25, Math.min(0.75, sceneryConfig.opacity));
  const overlayColor = averageBrightness > 128
    ? `rgba(255, 255, 255, ${overlayOpacity})`
    : `rgba(0, 0, 0, ${overlayOpacity})`;

  return (
    <div className="files-stats-bar">
      <img
        src={image}
        alt={`窗景图片：${poem} —— ${source}`}
        className="files-stats-bg"
      />
      <div
        className="files-stats-overlay"
        style={{ background: overlayColor }}
      />
      <div className="files-stats-content-wrapper">
        {content}
      </div>
      <div className="files-stats-controls">
        <Radio.Group type='button' value={viewMode} onChange={setViewMode} options={[{ label: '网格', value: 'grid' }, { label: '列表', value: 'list' }]} />
      </div>
    </div>
  );
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:...;base64," prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const FilesPage = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [allFiles, setAllFiles] = useState<FileItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [folderName, setFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 文件夹导航状态
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<Array<{ id: string | null; name: string }>>([{ id: null, name: '文件库' }]);

  // 筛选状态
  const [activeFilter, setActiveFilter] = useState<FilterTag>('全部');

  // 预览弹窗状态
  const [previewFile, setPreviewFile] = useState<FileItemData | null>(null);

  useEffect(() => {
    api.listFiles()
      .then(res => setAllFiles(res.files))
      .catch(() => Message.error('加载文件列表失败'))
      .finally(() => setLoading(false));
  }, []);

  // 当前文件夹下的文件（按 parent_id 过滤）
  const currentFiles = useMemo(() => {
    let filtered = allFiles.filter(f => f.parent_id === currentFolder);
    if (activeFilter !== '全部') {
      filtered = filtered.filter(FILTER_MAP[activeFilter]);
    }
    return filtered;
  }, [allFiles, currentFolder, activeFilter]);

  const handleNewFolder = () => {
    setFolderName('');
    setFolderModalVisible(true);
  };

  const handleCreateFolder = async () => {
    const trimmed = folderName.trim();
    if (!trimmed) {
      Message.warning('请输入文件夹名称');
      return;
    }
    try {
      await api.createFolder(trimmed, currentFolder ?? undefined);
      const listRes = await api.listFiles();
      setAllFiles(listRes.files);
      Message.success(`已创建文件夹 "${trimmed}"`);
      setFolderModalVisible(false);
    } catch {
      Message.error('创建文件夹失败');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_UPLOAD_TYPES = [
    'image/', 'video/', 'audio/', 'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-7z-compressed', 'application/x-tar', 'application/gzip',
    'text/plain', 'text/markdown', 'application/json',
  ];

  const isAllowedFileType = (file: File): boolean => {
    return ALLOWED_UPLOAD_TYPES.some(type => file.type.startsWith(type) || file.type === type);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const uploadTasks: Array<{ name: string; content: string; mimeType: string }> = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const f = selectedFiles[i];
        if (f.size > MAX_FILE_SIZE) {
          throw new Error(`文件 "${f.name}" 过大（${formatSize(f.size)}），请压缩后上传（最大 ${formatSize(MAX_FILE_SIZE)}）`);
        }
        if (!isAllowedFileType(f)) {
          throw new Error(`文件 "${f.name}" 类型不支持（${f.type || '未知'}），请上传常见的文档、图片、音视频或压缩包`);
        }
        const base64 = await fileToBase64(f);
        uploadTasks.push({ name: f.name, content: base64, mimeType: f.type });
      }

      const res = await api.uploadFiles(uploadTasks, currentFolder ?? undefined);
      const listRes = await api.listFiles();
      setAllFiles(listRes.files);

      // 检查上传的文件是否出现在正确的文件夹中
      const errors: string[] = [];
      if (res.files) {
        for (const uploaded of res.files) {
          const found = listRes.files.find(f => f.id === uploaded.id);
          if (found && found.parent_id !== currentFolder) {
            errors.push(`"${uploaded.name}" 未出现在当前文件夹中`);
          }
        }
      }

      if (errors.length > 0) {
        Message.warning(`上传完成，但 ${errors.length} 个文件位置异常`);
      } else {
        Message.success(`已上传 ${uploadTasks.length} 个文件`);
      }
    } catch (err) {
      Message.error(err instanceof Error ? err.message : '上传文件失败');
    }

    e.target.value = '';
  };

  const handleDeleteFile = (fileId: string) => {
    const file = allFiles.find(f => f.id === fileId);
    if (!file) return;
    Modal.confirm({
      title: '删除确认',
      content: `确定要删除 "${file.name}" 吗？`,
      onOk: async () => {
        try {
          await api.deleteFile(fileId);
          setAllFiles(prev => prev.filter(f => f.id !== fileId));
          Message.success('文件已删除');
        } catch {
          Message.error('删除失败');
        }
      },
    });
  };

  const handleDownloadFile = (file: FileItemData) => {
    if (file.is_folder) {
      // 点击文件夹：进入该文件夹
      setCurrentFolder(file.id);
      setFolderStack(prev => [...prev, { id: file.id, name: file.name }]);
      setActiveFilter('全部');
      return;
    }
    window.open(getFileUrl(file.id, 'download'), '_blank');
  };

  function isPreviewableFile(file: FileItemData): boolean {
    if (file.is_folder) return false;
    if (['image', 'video', 'audio'].includes(file.type)) return true;
    if (file.type === 'document') {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      return ['txt', 'md', 'json', 'pdf'].includes(ext);
    }
    return false;
  }

  const handleFileClick = useCallback((file: FileItemData) => {
    if (file.is_folder) {
      setCurrentFolder(file.id);
      setFolderStack(prev => [...prev, { id: file.id, name: file.name }]);
      setActiveFilter('全部');
    } else if (isPreviewableFile(file)) {
      setPreviewFile(file);
    } else {
      window.open(getFileUrl(file.id, 'download'), '_blank');
    }
  }, []);

  const handleBreadcrumbClick = (index: number) => {
    const target = folderStack[index];
    setCurrentFolder(target.id);
    setFolderStack(prev => prev.slice(0, index + 1));
    setActiveFilter('全部');
  };

  const currentFolderStats = useMemo(() => {
    const filesInFolder = allFiles.filter(f => f.parent_id === currentFolder);
    const totalSizeBytes = filesInFolder.filter(f => !f.is_folder).reduce((sum, f) => sum + f.size, 0);
    return {
      totalFiles: filesInFolder.filter(f => !f.is_folder).length,
      totalFolders: filesInFolder.filter(f => f.is_folder).length,
      totalSize: totalSizeBytes > 0 ? formatSize(totalSizeBytes) : '-',
    };
  }, [allFiles, currentFolder]);

  return (
    <div className="files-page">
      {/* 标题栏 */}
      <div className="files-page-header">
        <div>
          <Typography.Title heading={1} className="files-page-title">
            文件库
          </Typography.Title>
          <Typography.Text type='secondary' className="files-page-subtitle">
            {currentFolderStats.totalFiles} 个文件 · {currentFolderStats.totalFolders} 个文件夹
          </Typography.Text>
        </div>
        <div className="files-page-actions">
          <Button
            shape='round'
            size='large'
            type='secondary'
            icon={<IconFolderAdd />}
            style={{ height: '40px', padding: '0 20px', fontSize: '14px' }}
            onClick={handleNewFolder}
          >
            新建文件夹
          </Button>
          <Button
            shape='round'
            size='large'
            type='primary'
            icon={<IconUpload />}
            style={{ height: '40px', padding: '0 20px', fontSize: '14px', backgroundColor: PRIMARY_COLOR }}
            onClick={handleUploadClick}
          >
            上传文件
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
            aria-label="选择上传文件"
          />
        </div>
      </div>

      {/* 面包屑导航 */}
      {folderStack.length > 1 && (
        <div className="files-breadcrumb-wrapper">
          <Breadcrumb>
            {folderStack.map((item, index) => (
              <Breadcrumb.Item
                key={item.id ?? 'root'}
                style={{ cursor: index < folderStack.length - 1 ? 'pointer' : 'default' }}
                onClick={() => index < folderStack.length - 1 && handleBreadcrumbClick(index)}
              >
                {item.name}
              </Breadcrumb.Item>
            ))}
          </Breadcrumb>
        </div>
      )}

      <StatsBar stats={currentFolderStats} viewMode={viewMode} setViewMode={setViewMode} loading={loading} />

      {/* 筛选标签 */}
      {!loading && (
        <div className="files-filter-bar">
          {FILTER_TAGS.map(tag => (
            <Tag
              key={tag}
              color={tag === activeFilter ? 'arcoblue' : undefined}
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveFilter(tag)}
            >
              {tag}
            </Tag>
          ))}
        </div>
      )}

      {loading ? (
        <Empty description='加载中...' className="files-empty-padded" />
      ) : currentFiles.length === 0 ? (
        <Empty description={activeFilter !== '全部' ? '暂无符合条件的文件' : currentFolder ? '该文件夹为空' : '暂无文件'} className="files-empty-padded" />
      ) : viewMode === 'grid' ? (
        <div className="files-grid">
          {currentFiles.map(file => <GridFileCard key={file.id} file={file} onClick={handleFileClick} />)}
        </div>
      ) : (
        <div className="files-list-table">
          <div className="files-list-header">
            <div className="files-list-header-icon" />
            <div className="files-list-header-name">名称</div>
            <div className="files-list-header-size">大小</div>
            <div className="files-list-header-date">修改时间</div>
            <div className="files-list-header-actions" />
          </div>
          {currentFiles.map(file => <ListFileRow key={file.id} file={file} onClick={handleFileClick} onDownload={handleDownloadFile} onDelete={handleDeleteFile} />)}
        </div>
      )}

      <div className="files-empty-spacing" />

      <Modal
        title="新建文件夹"
        visible={folderModalVisible}
        onOk={handleCreateFolder}
        onCancel={() => setFolderModalVisible(false)}
        autoFocus={false}
        focusLock
      >
        <Input
          placeholder="请输入文件夹名称"
          value={folderName}
          onChange={setFolderName}
          onPressEnter={handleCreateFolder}
        />
      </Modal>

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
};

export default FilesPage;
