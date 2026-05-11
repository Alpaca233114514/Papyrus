import { Typography, Button, Tabs, Tag, Switch, Card, Empty, Spin, Message } from '@arco-design/web-react';
import { useState, useEffect, useCallback } from 'react';
import { IconPlus, IconSettings, IconDelete, IconCheckCircleFill, IconDownload, IconStarFill, IconRefresh } from '@arco-design/web-react/icon';
import { useCommonCardStyle, CommonCard, PageLayout } from '../components';
import { PRIMARY_COLOR, SUCCESS_COLOR } from '../theme-constants';
import { api } from '../api';
import './ExtensionsPage.css';

interface Extension {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  rating: number;
  downloads: number;
  isEnabled: boolean;
  isBuiltin?: boolean;
  updateAvailable?: boolean;
  latestVersion?: string;
  tags: string[];
}

interface ExtensionStats {
  total: number;
  enabled: number;
  builtin: number;
}

const ExtensionCard = ({ ext, onToggle, onUninstall, onSettings }: { ext: Extension; onToggle?: (enabled: boolean) => void; onUninstall?: () => void; onSettings?: () => void }) => {
  const { hovered, setHovered, cardStyle } = useCommonCardStyle({
    borderWidth: 1,
  });

  return (
    <CommonCard
      hovered={hovered}
      setHovered={setHovered}
      cardStyle={cardStyle}
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          background: ext.isEnabled ? PRIMARY_COLOR : 'var(--color-fill-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: ext.isEnabled ? '#fff' : 'var(--color-text-2)',
          fontSize: '20px',
          fontWeight: 600,
        }}>
          {ext.name.charAt(0)}
        </div>
        <Switch size='small' checked={ext.isEnabled} onChange={onToggle} disabled={ext.isBuiltin} />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Typography.Text bold style={{ fontSize: '15px' }}>{ext.name}</Typography.Text>
          {ext.isBuiltin && <Tag size='small' color='arcoblue' style={{ fontSize: '10px' }}>内置</Tag>}
          {ext.isEnabled && <IconCheckCircleFill style={{ fontSize: '14px', color: SUCCESS_COLOR }} />}
          {ext.updateAvailable && <Tag size='small' color='green' style={{ fontSize: '10px' }}>更新</Tag>}
        </div>
        <Typography.Text type='secondary' style={{ fontSize: '13px', lineHeight: 1.5 }}>
          {ext.description}
        </Typography.Text>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {ext.tags.map(tag => <Tag key={tag} size='small' style={{ fontSize: '11px' }}>{tag}</Tag>)}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px', fontSize: '12px', color: 'var(--color-text-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <IconStarFill style={{ fontSize: '12px', color: '#FF7D00' }} />
            {ext.rating}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <IconDownload style={{ fontSize: '12px' }} />
            {ext.downloads > 1000 ? `${(ext.downloads / 1000).toFixed(1)}k` : ext.downloads}
          </span>
        </div>
        <span>v{ext.version}</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <Button type='secondary' size='small' icon={<IconSettings />} style={{ flex: 1 }} onClick={onSettings}>设置</Button>
        {!ext.isBuiltin && <Button type='secondary' size='small' status='danger' icon={<IconDelete />} onClick={onUninstall} />}
      </div>
    </CommonCard>
  );
};

const SettingItem = ({ title, description, defaultChecked }: { title: string; description: string; defaultChecked?: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--color-border-2)' }}>
    <div>
      <Typography.Text bold style={{ display: 'block', marginBottom: '8px' }}>{title}</Typography.Text>
      <Typography.Text type='secondary' style={{ fontSize: '13px' }}>{description}</Typography.Text>
    </div>
    <Switch defaultChecked={defaultChecked} />
  </div>
);

type TabPhase = 'idle' | 'exit' | 'enter';

const ExtensionsPage = () => {
  const [activeTab, setActiveTab] = useState('installed');
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [stats, setStats] = useState<ExtensionStats>({ total: 0, enabled: 0, builtin: 0 });
  const [tabPhase, setTabPhase] = useState<TabPhase>('idle');
  const [exitDirection, setExitDirection] = useState<'left' | 'right'>('left');
  const [loading, setLoading] = useState(true);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  const loadExtensions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getExtensionsList();
      if (response.success) {
        setExtensions(response.extensions as Extension[]);
        const extResponse = response as { success: boolean; extensions: Extension[]; count: number; stats?: ExtensionStats };
        if (extResponse.stats) {
          setStats(extResponse.stats);
        } else {
          const total = extResponse.extensions.length;
          const enabled = extResponse.extensions.filter((e: Extension) => e.isEnabled).length;
          const builtin = extResponse.extensions.filter((e: Extension) => e.isBuiltin).length;
          setStats({ total, enabled, builtin });
        }
      }
    } catch (error) {
      Message.error('加载扩展列表失败');
      console.error('Failed to load extensions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'installed') {
      loadExtensions();
    }
  }, [activeTab, loadExtensions]);

  const handleTabChange = (newTab: string) => {
    if (tabPhase !== 'idle') return;

    const tabsOrder = ['installed', 'market', 'settings'];
    const currentIndex = tabsOrder.indexOf(activeTab);
    const newIndex = tabsOrder.indexOf(newTab);

    const direction: 'left' | 'right' = newIndex > currentIndex ? 'left' : 'right';
    setExitDirection(direction);
    setTabPhase('exit');

    setTimeout(() => {
      setActiveTab(newTab);
      setTabPhase('enter');
    }, 200);

    setTimeout(() => {
      setTabPhase('idle');
    }, 400);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/extensions/${id}/enabled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await response.json();
      if (data.success) {
        setExtensions(prev => prev.map(ext =>
          ext.id === id ? { ...ext, isEnabled: enabled } : ext
        ));
        setStats(prev => ({
          ...prev,
          enabled: prev.enabled + (enabled ? 1 : -1),
        }));
        Message.success(data.message);
      } else {
        Message.error(data.error || '操作失败');
      }
    } catch (error) {
      Message.error('操作失败');
      console.error('Failed to toggle extension:', error);
    }
  };

  const handleUninstall = async (id: string) => {
    const ext = extensions.find(e => e.id === id);
    if (!ext) return;

    try {
      const response = await fetch(`/api/extensions/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setExtensions(prev => prev.filter(e => e.id !== id));
        setStats(prev => ({
          ...prev,
          total: prev.total - 1,
          enabled: prev.enabled - (ext.isEnabled ? 1 : 0),
        }));
        Message.success('扩展已卸载');
      } else {
        Message.error(data.error || '卸载失败');
      }
    } catch (error) {
      Message.error('卸载失败');
      console.error('Failed to uninstall extension:', error);
    }
  };

  const handleSettings = (ext: Extension) => {
    Message.info(`扩展设置: ${ext.name}`);
  };

  const handleCheckUpdates = async () => {
    try {
      setCheckingUpdates(true);
      const response = await fetch('/api/extensions/check-updates', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        if (data.updateCount > 0) {
          Message.success(`发现 ${data.updateCount} 个可更新的扩展`);
        } else {
          Message.info('所有扩展已是最新版本');
        }
        loadExtensions();
      }
    } catch (error) {
      Message.error('检查更新失败');
      console.error('Failed to check updates:', error);
    } finally {
      setCheckingUpdates(false);
    }
  };

  const enabledCount = extensions.filter(e => e.isEnabled).length;
  const updateCount = extensions.filter(e => e.updateAvailable).length;

  const getAnimationClass = () => {
    if (tabPhase === 'exit') {
      return exitDirection === 'left' ? 'extensions-tab-exit-left' : 'extensions-tab-exit-right';
    }
    if (tabPhase === 'enter') {
      return exitDirection === 'left' ? 'extensions-tab-enter-left' : 'extensions-tab-enter-right';
    }
    return '';
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '80px' }}>
          <Spin size={32} />
        </div>
      );
    }

    return (
      <div className={`extensions-tab-content ${getAnimationClass()}`}>
        {activeTab === 'installed' && (
          extensions.length === 0 ? (
            <Empty description="暂无已安装扩展" style={{ marginTop: '48px' }} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {extensions.map(ext => (
                <ExtensionCard
                  key={ext.id}
                  ext={ext}
                  onToggle={(enabled) => handleToggle(ext.id, enabled)}
                  onUninstall={() => handleUninstall(ext.id)}
                  onSettings={() => handleSettings(ext)}
                />
              ))}
            </div>
          )
        )}

        {activeTab === 'market' && (
          <Empty description="扩展商店即将上线" style={{ marginTop: '48px' }} />
        )}

        {activeTab === 'settings' && (
          <Card style={{ borderRadius: '16px', border: '1px solid var(--color-text-3)' }}>
            <Typography.Title heading={3} style={{ margin: '0 0 24px', fontWeight: 500, fontSize: '18px' }}>扩展设置</Typography.Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SettingItem title='自动更新' description='自动检查并安装扩展更新' defaultChecked />
              <SettingItem title='开发者模式' description='允许安装未在商店上架的扩展' />
            </div>
          </Card>
        )}
      </div>
    );
  };

  const pageStats = [
    { label: '已安装', value: extensions.length },
    { label: '已启用', value: enabledCount },
  ];

  const extraStatsContent = (
    <Button
      shape='round'
      type='primary'
      icon={<IconRefresh />}
      loading={checkingUpdates}
      onClick={handleCheckUpdates}
      style={{
        backgroundColor: PRIMARY_COLOR,
        borderRadius: '20px',
      }}
    >
      {updateCount > 0 ? `检查更新 (${updateCount})` : '检查更新'}
    </Button>
  );

  return (
    <PageLayout
      title='扩展管理'
      pageKey='extensions'
      stats={pageStats}
      extraStatsContent={extraStatsContent}
    >
      <Tabs
        activeTab={activeTab}
        onChange={handleTabChange}
        type='text'
        style={{ marginBottom: '24px' }}
      >
        <Tabs.TabPane key='installed' title={<>已安装 <Tag size='small' style={{ marginLeft: '8px' }}>{extensions.length}</Tag></>} />
        <Tabs.TabPane key='market' title={<>扩展商店 <Tag size='small' style={{ marginLeft: '8px' }}>0</Tag></>} />
        <Tabs.TabPane key='settings' title='设置' />
      </Tabs>

      <div className="extensions-tab-container">
        {renderContent()}
      </div>
    </PageLayout>
  );
};

export default ExtensionsPage;