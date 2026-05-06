import { Typography, Button, Tabs, Tag, Switch, Card, Empty, Spin } from '@arco-design/web-react';
import { useState, useEffect } from 'react';
import { IconPlus, IconSettings, IconDelete, IconCheckCircleFill, IconDownload, IconStarFill, IconRefresh } from '@arco-design/web-react/icon';
import { usePageScenery } from '../hooks/useScenery';
import { useSceneryColor, getAdaptivePrimaryColor } from '../hooks/useSceneryColor';
import { useCommonCardStyle, CommonCard } from '../components';

const PRIMARY_COLOR = '#206CCF';
const SUCCESS_COLOR = '#00B42A';

// 扩展类型定义
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

// 扩展卡片
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

// 设置项
const SettingItem = ({ title, description, defaultChecked }: { title: string; description: string; defaultChecked?: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--color-border-2)' }}>
    <div>
      <Typography.Text bold style={{ display: 'block', marginBottom: '8px' }}>{title}</Typography.Text>
      <Typography.Text type='secondary' style={{ fontSize: '13px' }}>{description}</Typography.Text>
    </div>
    <Switch defaultChecked={defaultChecked} />
  </div>
);

// 统计栏组件
interface StatsBarProps {
  extensions: Extension[];
  enabledCount: number;
  updateCount: number;
  loading: boolean;
}

const StatsBar = ({ extensions, enabledCount, updateCount, loading }: StatsBarProps) => {
  const { config: sceneryConfig, loaded } = usePageScenery('extensions');
  const { primaryTextColor, secondaryTextColor, averageBrightness } = useSceneryColor(
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
        marginBottom: '32px',
        borderRadius: '12px',
        border: '1px solid var(--color-text-3)',
        background: 'var(--color-bg-1)',
      }}>
        <Spin size={24} />
      </div>
    );
  }

  const content = (
    <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <Typography.Text style={{ fontSize: '24px', fontWeight: 600, color: sceneryConfig.enabled ? getAdaptivePrimaryColor(averageBrightness, PRIMARY_COLOR) : PRIMARY_COLOR }}>{extensions.length}</Typography.Text>
        <Typography.Text type='secondary' style={{ fontSize: '12px', display: 'block', marginTop: '4px', color: sceneryConfig.enabled ? secondaryTextColor : undefined }}>已安装</Typography.Text>
      </div>
      <div style={{ textAlign: 'center' }}>
        <Typography.Text style={{ fontSize: '24px', fontWeight: 600, color: sceneryConfig.enabled ? getAdaptivePrimaryColor(averageBrightness, SUCCESS_COLOR) : SUCCESS_COLOR }}>{enabledCount}</Typography.Text>
        <Typography.Text type='secondary' style={{ fontSize: '12px', display: 'block', marginTop: '4px', color: sceneryConfig.enabled ? secondaryTextColor : undefined }}>已启用</Typography.Text>
      </div>
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
    </div>
  );

  if (!sceneryConfig.enabled) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        marginBottom: '32px',
        borderRadius: '12px',
        border: '1px solid var(--color-text-3)',
        background: 'var(--color-bg-1)',
      }}>
        {content}
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
      marginBottom: '32px',
      borderRadius: '12px',
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
    </div>
  );
};

const ExtensionsPage = () => {
  const [activeTab, setActiveTab] = useState('installed');
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟加载扩展列表
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  const handleToggle = (id: string, enabled: boolean) => {
    setExtensions(prev => prev.map(ext => ext.id === id ? { ...ext, isEnabled: enabled } : ext));
  };

  const enabledCount = extensions.filter(e => e.isEnabled).length;
  const updateCount = extensions.filter(e => e.updateAvailable).length;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '48px 64px 64px', background: 'var(--color-bg-1)' }}>
      <Typography.Title heading={1} style={{ fontWeight: 600, lineHeight: 1, margin: 0, marginBottom: '32px', fontSize: '40px' }}>
        扩展管理
      </Typography.Title>

      <StatsBar extensions={extensions} enabledCount={enabledCount} updateCount={updateCount} loading={loading} />

      <Tabs activeTab={activeTab} onChange={setActiveTab} type='text' style={{ marginBottom: '24px' }}>
        <Tabs.TabPane key='installed' title={<>已安装 <Tag size='small' style={{ marginLeft: '8px' }}>{extensions.length}</Tag></>} />
        <Tabs.TabPane key='market' title={<>扩展商店 <Tag size='small' style={{ marginLeft: '8px' }}>0</Tag></>} />
        <Tabs.TabPane key='settings' title='设置' />
      </Tabs>

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

      <div style={{ height: '32px' }} />
    </div>
  );
};

export default ExtensionsPage;
