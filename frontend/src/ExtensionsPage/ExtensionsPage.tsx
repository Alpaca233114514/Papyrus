import { Typography, Button, Tabs, Tag, Switch, Card, Empty, Spin } from '@arco-design/web-react';
import { useState } from 'react';
import { IconPlus, IconSettings, IconDelete, IconCheckCircleFill, IconDownload, IconStarFill, IconRefresh } from '@arco-design/web-react/icon';
import { useCommonCardStyle, CommonCard, PageLayout } from '../components';
import { PRIMARY_COLOR, SUCCESS_COLOR } from '../theme-constants';
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
  updateAvailable?: boolean;
  tags: string[];
}

const ExtensionCard = ({ ext, isInstalled, onToggle }: { ext: Extension; isInstalled?: boolean; onToggle?: (enabled: boolean) => void }) => {
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
          background: isInstalled ? PRIMARY_COLOR : 'var(--color-fill-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isInstalled ? '#fff' : 'var(--color-text-2)',
          fontSize: '20px',
          fontWeight: 600,
        }}>
          {ext.name.charAt(0)}
        </div>
        {isInstalled && <Switch size='small' checked={ext.isEnabled} onChange={onToggle} />}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Typography.Text bold style={{ fontSize: '15px' }}>{ext.name}</Typography.Text>
          {isInstalled && <IconCheckCircleFill style={{ fontSize: '14px', color: SUCCESS_COLOR }} />}
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

      {isInstalled ? (
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <Button type='secondary' size='small' icon={<IconSettings />} style={{ flex: 1 }}>设置</Button>
          <Button type='secondary' size='small' status='danger' icon={<IconDelete />} />
        </div>
      ) : (
        <Button type='primary' size='small' icon={<IconPlus />} style={{ marginTop: '8px', backgroundColor: PRIMARY_COLOR }}>
          安装
        </Button>
      )}
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
  const [tabPhase, setTabPhase] = useState<TabPhase>('idle');
  const [exitDirection, setExitDirection] = useState<'left' | 'right'>('left');

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

  const handleToggle = (id: string, enabled: boolean) => {
    setExtensions(prev => prev.map(ext => ext.id === id ? { ...ext, isEnabled: enabled } : ext));
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
    return (
      <div className={`extensions-tab-content ${getAnimationClass()}`}>
        {activeTab === 'installed' && (
          extensions.length === 0 ? (
            <Empty description="暂无已安装扩展" style={{ marginTop: '48px' }} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {extensions.map(ext => (
                <ExtensionCard key={ext.id} ext={ext} isInstalled onToggle={(enabled) => handleToggle(ext.id, enabled)} />
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