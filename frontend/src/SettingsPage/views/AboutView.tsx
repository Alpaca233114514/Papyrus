import { useState, useEffect } from 'react';
import {
  Button,
  Typography,
  Tag,
  Spin,
  Message,
} from '@arco-design/web-react';
import {
  IconArrowLeft,
  IconInfoCircle,
  IconGithub,
  IconHeart,
  IconCheckCircle,
  IconExclamationCircle,
} from '@arco-design/web-react/icon';

const { Title, Text, Paragraph } = Typography;

interface AboutViewProps {
  onBack: () => void;
}

interface VersionInfo {
  current_version: string;
  latest_version: string;
  has_update: boolean;
  release_url: string;
  download_url: string | null;
  release_notes: string | null;
  published_at: string | null;
}

interface UpdateCheckResponse {
  success: boolean;
  data: VersionInfo | null;
  message: string;
}

const AboutView = ({ onBack }: AboutViewProps) => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<'idle' | 'update' | 'latest' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // 组件挂载时获取当前版本
  useEffect(() => {
    fetchCurrentVersion();
  }, []);

  const fetchCurrentVersion = async () => {
    try {
      const response = await fetch('/api/update/version');
      if (response.ok) {
        const data = await response.json();
        // 初始设置版本信息，后续检查更新会更新 has_update 字段
        setVersionInfo({
          current_version: data.version,
          latest_version: data.version,
          has_update: false,
          release_url: data.repository,
          download_url: null,
          release_notes: null,
          published_at: null,
        });
      }
    } catch (error) {
      console.error('获取版本信息失败:', error);
    }
  };

  const handleCheckUpdate = async () => {
    setIsChecking(true);
    setCheckResult('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/update/check');
      const result: UpdateCheckResponse = await response.json();

      if (result.success && result.data) {
        setVersionInfo(result.data);
        if (result.data.has_update) {
          setCheckResult('update');
          Message.info(`发现新版本: ${result.data.latest_version}`);
        } else {
          setCheckResult('latest');
          Message.success('当前已是最新版本');
        }
      } else {
        setCheckResult('error');
        setErrorMessage(result.message || '检查更新失败');
        Message.error(result.message || '检查更新失败');
      }
    } catch (error) {
      setCheckResult('error');
      const msg = error instanceof Error ? error.message : '网络错误，请稍后重试';
      setErrorMessage(msg);
      Message.error(msg);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownload = () => {
    if (versionInfo?.download_url) {
      window.open(versionInfo.download_url, '_blank');
    } else if (versionInfo?.release_url) {
      window.open(versionInfo.release_url, '_blank');
    }
  };

  // 格式化发布日期
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // 截断发布说明（只显示前200字符）
  const truncateReleaseNotes = (notes: string | null) => {
    if (!notes) return '';
    if (notes.length <= 200) return notes;
    return notes.substring(0, 200) + '...';
  };

  return (
    <div className="settings-detail" style={{ height: '100%', overflowY: 'auto' }}>
      <div className="settings-detail-header-row">
        <Button 
          type="text" 
          icon={<IconArrowLeft />}
          onClick={onBack}
          className="settings-back-btn"
        >
          返回
        </Button>
      </div>
      <Title heading={2} className="settings-detail-title">关于</Title>
      
      <div className="settings-section" style={{ textAlign: 'center', padding: '40px 0' }}>
        <img 
          src="./icon.ico" 
          alt="Papyrus" 
          style={{ width: 80, height: 80, marginBottom: 16 }}
        />
        <Title heading={3} style={{ margin: '0 0 8px 0' }}>Papyrus</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          版本 {versionInfo?.current_version || 'v2.0.0-beta.1'}
        </Text>
        <Paragraph type="secondary" style={{ marginTop: 16, maxWidth: 400, margin: '16px auto 0' }}>
          SRS 复习引擎 - 基于间隔重复算法的智能记忆卡片应用
        </Paragraph>
        
        <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {checkResult === 'update' ? (
            <Button 
              type="primary" 
              shape="round"
              status="success"
              icon={<IconExclamationCircle />}
              onClick={handleDownload}
            >
              下载更新
            </Button>
          ) : (
            <Button 
              type="primary" 
              shape="round"
              onClick={handleCheckUpdate}
              disabled={isChecking}
              icon={isChecking ? <Spin size={14} /> : <IconCheckCircle />}
            >
              {isChecking ? '检查中...' : '检查更新'}
            </Button>
          )}
          <Button 
            shape="round"
            onClick={() => window.open('https://github.com/Alpaca233114514/Papyrus', '_blank')}
          >
            <IconGithub style={{ marginRight: 8 }} />
            GitHub
          </Button>
        </div>

        {/* 更新状态提示 */}
        {checkResult === 'latest' && (
          <div style={{ 
            marginTop: 16, 
            padding: '8px 16px', 
            backgroundColor: 'var(--color-success-light)', 
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <IconCheckCircle style={{ color: 'var(--color-success)' }} />
            <Text style={{ color: 'var(--color-success)', margin: 0 }}>
              当前已是最新版本
            </Text>
          </div>
        )}

        {checkResult === 'error' && (
          <div style={{ 
            marginTop: 16, 
            padding: '8px 16px', 
            backgroundColor: 'var(--color-danger-light)', 
            borderRadius: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <IconExclamationCircle style={{ color: 'var(--color-danger)' }} />
            <Text style={{ color: 'var(--color-danger)', margin: 0 }}>
              {errorMessage || '检查更新失败'}
            </Text>
          </div>
        )}
      </div>

      {/* 更新详情 */}
      {checkResult === 'update' && versionInfo?.has_update && (
        <div 
          className="settings-section" 
          style={{ 
            backgroundColor: 'var(--color-fill-2)', 
            borderRadius: 8,
            border: '1px solid var(--color-border)',
          }}
        >
          <Title heading={4} className="settings-section-title" style={{ color: 'var(--color-success)' }}>
            <IconExclamationCircle style={{ marginRight: 8 }} />
            发现新版本
          </Title>
          <div style={{ marginBottom: 16 }}>
            <Text bold style={{ fontSize: 16 }}>{versionInfo.latest_version}</Text>
            {versionInfo.published_at && (
              <Text type="secondary" style={{ marginLeft: 12 }}>
                发布于 {formatDate(versionInfo.published_at)}
              </Text>
            )}
          </div>
          {versionInfo.release_notes && (
            <div style={{ 
              backgroundColor: 'var(--color-bg-1)', 
              padding: 12, 
              borderRadius: 4,
              marginBottom: 16,
            }}>
              <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>
                {truncateReleaseNotes(versionInfo.release_notes)}
              </Paragraph>
            </div>
          )}
          <Button type="primary" onClick={handleDownload}>
            前往下载页面
          </Button>
        </div>
      )}

      <div className="settings-section">
        <Title heading={4} className="settings-section-title">致谢</Title>
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          感谢使用 Papyrus！本应用使用了以下开源项目：
        </Paragraph>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {['React', 'Arco Design', 'FastAPI', 'Python'].map(tech => (
            <Tag key={tech} color="arcoblue">{tech}</Tag>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <Title heading={4} className="settings-section-title">许可证</Title>
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          Papyrus 采用 MIT 许可证开源。您可以自由使用、修改和分发本软件。
        </Paragraph>
      </div>

      <div className="settings-tip" style={{ marginTop: 24 }}>
        <IconHeart style={{ color: 'var(--color-danger)' }} />
        <Text type="secondary" style={{ fontSize: 13 }}>
          如果喜欢这个项目，请在 GitHub 上给我们一个 Star ⭐
        </Text>
      </div>
    </div>
  );
};

export default AboutView;
