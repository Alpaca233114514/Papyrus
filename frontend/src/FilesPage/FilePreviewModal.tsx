import { useState, useEffect, useMemo } from 'react';
import { Modal, Message, Button, Spin } from '@arco-design/web-react';
import { IconDownload } from '@arco-design/web-react/icon';
import { getFileUrl } from '../api';
import type { FileItemData } from '../api';

interface FilePreviewModalProps {
  file: FileItemData | null;
  onClose: () => void;
}

function getFileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function isPreviewableDocument(file: FileItemData): boolean {
  if (file.type !== 'document') return false;
  const ext = getFileExtension(file.name);
  return ['txt', 'md', 'json', 'pdf'].includes(ext);
}

function isPreviewable(file: FileItemData): boolean {
  if (file.is_folder) return false;
  if (['image', 'video', 'audio'].includes(file.type)) return true;
  if (isPreviewableDocument(file)) return true;
  return false;
}

export default function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const [textContent, setTextContent] = useState<string>('');
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [mediaErrorType, setMediaErrorType] = useState<string>('');
  const [pdfError, setPdfError] = useState(false);

  const previewUrl = useMemo(() => {
    if (!file) return '';
    return getFileUrl(file.id, 'preview');
  }, [file]);

  const downloadUrl = useMemo(() => {
    if (!file) return '';
    return getFileUrl(file.id, 'download');
  }, [file]);

  useEffect(() => {
    if (!file) {
      setTextContent('');
      setTextError(false);
      setImageLoading(false);
      setMediaError(false);
      setMediaErrorType('');
      setPdfError(false);
      return;
    }

    const ext = getFileExtension(file.name);
    if (['txt', 'md', 'json'].includes(ext)) {
      setTextLoading(true);
      setTextError(false);
      fetch(previewUrl)
        .then(res => {
          if (!res.ok) throw new Error('加载失败');
          return res.text();
        })
        .then(text => {
          setTextContent(text);
        })
        .catch(() => {
          setTextError(true);
          Message.error('文件内容加载失败');
        })
        .finally(() => {
          setTextLoading(false);
        });
    }
  }, [file, previewUrl]);

  if (!file) return null;

  const ext = getFileExtension(file.name);

  const renderPreview = () => {
    if (!isPreviewable(file)) {
      return (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: '16px', color: 'var(--color-text-2)', marginBottom: '16px' }}>
            该文件类型暂不支持预览
          </div>
          <Button type="primary" icon={<IconDownload />} href={downloadUrl} target="_blank">
            下载文件
          </Button>
        </div>
      );
    }

    const handleMediaError = (type: string) => {
      if (!mediaError) {
        setMediaError(true);
        setMediaErrorType(type);
        Message.error(`${type}加载失败`);
      }
    };

    const renderMediaError = () => (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{ fontSize: '16px', color: 'var(--color-text-2)', marginBottom: '16px' }}>
          {mediaErrorType}加载失败
        </div>
        <Button type="primary" icon={<IconDownload />} href={downloadUrl} target="_blank">
          下载文件
        </Button>
      </div>
    );

    switch (file.type) {
      case 'image':
        if (mediaError) return renderMediaError();
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', maxHeight: '70vh', overflow: 'auto' }}>
            {imageLoading && (
              <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin size={32} />
              </div>
            )}
            <img
              src={previewUrl}
              alt={file.name}
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', opacity: imageLoading ? 0 : 1, transition: 'opacity 0.2s' }}
              onLoad={() => setImageLoading(false)}
              onError={(e) => {
                setImageLoading(false);
                const target = e.currentTarget as HTMLImageElement;
                let errorMsg = '图片';
                if (target.naturalWidth === 0 && target.naturalHeight === 0) {
                  errorMsg = '图片加载失败（文件可能不存在或格式不支持）';
                } else {
                  errorMsg = '图片解码失败（文件可能已损坏）';
                }
                handleMediaError(errorMsg);
              }}
            />
          </div>
        );
      case 'video':
        if (mediaError) return renderMediaError();
        return (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <video
              src={previewUrl}
              controls
              style={{ maxWidth: '100%', maxHeight: '70vh' }}
              onError={() => handleMediaError('视频')}
            >
              您的浏览器不支持视频播放
            </video>
          </div>
        );
      case 'audio':
        if (mediaError) return renderMediaError();
        return (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <audio
              src={previewUrl}
              controls
              style={{ width: '100%', maxWidth: '500px' }}
              onError={() => handleMediaError('音频')}
            >
              您的浏览器不支持音频播放
            </audio>
          </div>
        );
      case 'document':
        if (ext === 'pdf') {
          if (pdfError) {
            return (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: '16px', color: 'var(--color-text-2)', marginBottom: '16px' }}>
                  PDF 加载失败（文件可能不存在或格式损坏）
                </div>
                <Button type="primary" icon={<IconDownload />} href={downloadUrl} target="_blank">
                  下载文件
                </Button>
              </div>
            );
          }
          return (
            <div style={{ height: '70vh' }}>
              <iframe
                src={previewUrl}
                title={file.name}
                style={{ width: '100%', height: '100%', border: 'none' }}
                sandbox="allow-scripts allow-same-origin"
                onLoad={() => {
                  // 延迟检查 iframe 是否正常加载
                  setTimeout(() => {
                    const iframe = document.querySelector(`iframe[src="${previewUrl}"]`);
                    if (iframe) {
                      try {
                        // 尝试访问 contentWindow，如果跨域会抛异常，但加载成功时通常可访问
                        const cw = (iframe as HTMLIFrameElement).contentWindow;
                        if (!cw && !pdfError) {
                          setPdfError(true);
                        }
                      } catch {
                        // 跨域限制，视为正常加载
                      }
                    }
                  }, 3000);
                }}
              />
            </div>
          );
        }
        if (['txt', 'md', 'json'].includes(ext)) {
          if (textLoading) {
            return (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-3)' }}>
                加载中...
              </div>
            );
          }
          if (textError) {
            return (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-2)' }}>
                文件内容加载失败
              </div>
            );
          }
          return (
            <pre
              style={{
                maxHeight: '70vh',
                overflow: 'auto',
                padding: '16px',
                background: 'var(--color-fill-2)',
                borderRadius: '8px',
                fontSize: '13px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {textContent}
            </pre>
          );
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <Modal
      title={
        <span
          style={{
            display: 'inline-block',
            maxWidth: '70vw',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            verticalAlign: 'bottom',
          }}
          title={file.name}
        >
          {file.name}
        </span>
      }
      visible={!!file}
      onCancel={onClose}
      footer={null}
      autoFocus={false}
      focusLock
      style={{ width: 'auto', maxWidth: '90vw' }}
    >
      {renderPreview()}
    </Modal>
  );
}
