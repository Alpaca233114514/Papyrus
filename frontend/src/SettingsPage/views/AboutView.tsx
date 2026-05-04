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
import './AboutView.css';

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

declare const __APP_VERSION__: string;

const APP_VERSION = __APP_VERSION__;

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

  const ALLOWED_EXTERNAL_DOMAINS = ['github.com', 'githubusercontent.com', 'papyrus.liyuanstudio.com'];

  const isAllowedExternalUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return ALLOWED_EXTERNAL_DOMAINS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
    } catch {
      return false;
    }
  };

  const handleDownload = () => {
    const url = versionInfo?.download_url || versionInfo?.release_url;
    if (url && isAllowedExternalUrl(url)) {
      window.open(url, '_blank');
    } else if (url) {
      Message.warning('未知的下载来源，已阻止打开');
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
    <div className="settings-detail about-view">
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

      <div className="settings-section about-hero">
        <img
          src="./icon.png"
          alt="Papyrus"
          className="about-logo"
        />
        <Title heading={3} className="about-app-name">Papyrus</Title>
        <Text type="secondary" className="about-version">
          版本 {versionInfo?.current_version || APP_VERSION}
        </Text>
        <Paragraph type="secondary" className="about-description">
          SRS 复习引擎 - 基于间隔重复算法的智能记忆卡片应用
        </Paragraph>

        <div className="about-actions">
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
            onClick={() => {
              if (isAllowedExternalUrl('https://github.com/PapyrusOR/Papyrus_Desktop')) {
                window.open('https://github.com/PapyrusOR/Papyrus_Desktop', '_blank');
              }
            }}
          >
            <IconGithub className="about-github-icon" />
            GitHub
          </Button>
        </div>

        {/* 更新状态提示 */}
        {checkResult === 'latest' && (
          <div className="about-status-badge success">
            <IconCheckCircle className="about-status-icon success" />
            <Text className="about-status-text success">
              当前已是最新版本
            </Text>
          </div>
        )}

        {checkResult === 'error' && (
          <div className="about-status-badge error">
            <IconExclamationCircle className="about-status-icon error" />
            <Text className="about-status-text error">
              {errorMessage || '检查更新失败'}
            </Text>
          </div>
        )}
      </div>

      {/* 更新详情 */}
      {checkResult === 'update' && versionInfo?.has_update && (
        <div
          className="settings-section about-update-card"
        >
          <Title heading={4} className="settings-section-title about-update-title">
            <IconInfoCircle className="about-update-title-icon" />
            发现新版本
          </Title>
          <div className="about-update-version-row">
            <Text bold className="about-update-version">{versionInfo.latest_version}</Text>
            {versionInfo.published_at && (
              <Text type="secondary" className="about-update-date">
                发布于 {formatDate(versionInfo.published_at)}
              </Text>
            )}
          </div>
          {versionInfo.release_notes && (
            <div className="about-release-notes">
              <Paragraph className="about-release-notes-text">
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
        <Paragraph type="secondary" className="about-paragraph">
          感谢使用 Papyrus！本应用使用了以下开源项目：
        </Paragraph>
        <div className="about-tech-tags">
          {['React', 'Arco Design', 'Electron', 'Node.js'].map(tech => (
            <Tag key={tech} color="arcoblue">{tech}</Tag>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <Title heading={4} className="settings-section-title">许可证</Title>
        <Paragraph type="secondary" className="about-paragraph">
          Papyrus 采用 MIT 许可证开源。您可以自由使用、修改和分发本软件。
        </Paragraph>
      </div>

      <div className="settings-tip about-tip">
        <IconHeart className="about-tip-icon" />
        <Text type="secondary" className="about-tip-text">
          如果喜欢这个项目，请在 GitHub 上给我们一个 Star ⭐
        </Text>
      </div>
    </div>
  );
};

export default AboutView;
