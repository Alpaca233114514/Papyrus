import { Typography, Button, Tabs, Tag, Switch, Card } from '@arco-design/web-react';
import { useState } from 'react';
import { IconPlus, IconSettings, IconDelete, IconCheckCircleFill, IconDownload, IconStarFill } from '@arco-design/web-react/icon';
import { usePageScenery } from '../hooks/useScenery';
import { useSceneryColor, getAdaptivePrimaryColor } from '../hooks/useSceneryColor';


const PRIMARY_COLOR = '#206CCF';
const SUCCESS_COLOR = '#00B42A';

// 模拟扩展数据
const MOCK_INSTALLED = [
  { id: '1', name: 'Anki 同步', description: '将 Papyrus 的卡片同步到 Anki', version: '1.2.0', author: 'Papyrus Team', rating: 4.8, downloads: 12580, isEnabled: true, updateAvailable: true, tags: ['同步'] },
  { id: '2', name: 'OCR 识别', description: '通过 OCR 自动识别图片文字', version: '2.0.1', author: 'AI Lab', rating: 4.5, downloads: 8932, isEnabled: true, tags: ['AI'] },
  { id: '3', name: '语音朗读', description: '使用 TTS 朗读卡片内容', version: '1.0.5', author: 'Voice Team', rating: 4.2, downloads: 5671, isEnabled: false, tags: ['语音'] },
  { id: '4', name: 'Markdown 增强', description: '增强的 Markdown 编辑器', version: '3.1.0', author: 'Editor Team', rating: 4.9, downloads: 15234, isEnabled: true, tags: ['编辑器'] },
];

const MOCK_MARKET = [
  { id: '5', name: '记忆曲线可视化', description: 'SM-2 记忆曲线分析', version: '1.0.0', author: 'DataVis', rating: 4.7, downloads: 3421, tags: ['可视化'] },
  { id: '6', name: 'PDF 批注导入', description: '将 PDF 批注导入为卡片', version: '0.9.5', author: 'PDF Tools', rating: 4.3, downloads: 2156, tags: ['导入'] },
  { id: '7', name: 'AI 自动标签', description: '基于 AI 自动生成标签', version: '1.1.0', author: 'AI Lab', rating: 4.6, downloads: 4567, tags: ['AI'] },
  { id: '8', name: '番茄钟', description: '番茄工作法计时器', version: '2.0.0', author: 'Productivity', rating: 4.4, downloads: 7890, tags: ['效率'] },
];

// 通用卡片样式
const useCardStyle = (hovered: boolean) => ({
  borderRadius: '16px',
  border: `1px solid ${hovered ? PRIMARY_COLOR : 'var(--color-text-3)'}`,
  background: hovered ? `${PRIMARY_COLOR}08` : 'var(--color-bg-1)',
  transition: 'border-color 0.2s, background 0.2s',
  cursor: 'pointer',
});

// 扩展卡片
const ExtensionCard = ({ ext, isInstalled, onToggle }: { ext: typeof MOCK_INSTALLED[0]; isInstalled?: boolean; onToggle?: (enabled: boolean) => void }) => {
  const [hovered, setHovered] = useState(false);
  const cardStyle = useCardStyle(hovered);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardStyle,
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
    </div>
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

// 统计栏组件 - 支持窗景背景
interface StatsBarProps {
  extensions: typeof MOCK_INSTALLED;
  enabledCount: number;
  updateCount: number;
}

const StatsBar = ({ extensions, enabledCount, updateCount }: StatsBarProps) => {
  const { config: sceneryConfig, loaded } = usePageScenery('extensions');
  const { primaryTextColor, secondaryTextColor, averageBrightness } = useSceneryColor(
    sceneryConfig.enabled ? sceneryConfig.image : undefined,
    sceneryConfig.enabled
  );

  // 等待设置加载完成
  if (!loaded) {
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
        <div style={{ display: 'flex', gap: '48px' }}>
          <div style={{ textAlign: 'center' }}>
            <Typography.Text style={{ fontSize: '24px', fontWeight: 600, color: PRIMARY_COLOR }}>{extensions.length}</Typography.Text>
            <Typography.Text type='secondary' style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>已安装</Typography.Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Typography.Text style={{ fontSize: '24px', fontWeight: 600, color: SUCCESS_COLOR }}>{enabledCount}</Typography.Text>
            <Typography.Text type='secondary' style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>已启用</Typography.Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Typography.Text style={{ fontSize: '24px', fontWeight: 600, color: updateCount > 0 ? '#FF7D00' : 'inherit' }}>{updateCount}</Typography.Text>
            <Typography.Text type='secondary' style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>有更新</Typography.Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Typography.Text style={{ fontSize: '24px', fontWeight: 600 }}>65.8k</Typography.Text>
            <Typography.Text type='secondary' style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>总下载</Typography.Text>
          </div>
        </div>
        <Button shape='round' type='primary' size='large' style={{ height: '40px', padding: '0 20px', fontSize: '14px', backgroundColor: PRIMARY_COLOR }}>检查更新</Button>
      </div>
    );
  }

  // 窗景配置
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
      {/* 窗景背景图 */}
      {sceneryConfig.enabled && (
        <>
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
          {/* 固定透明度遮罩层 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `rgba(255, 255, 255, ${overlayOpacity})`,
            }}
          />
        </>
      )}

      {/* 统计内容 */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '48px' }}>
        <div style={{ textAlign: 'center' }}>
          <Typography.Text style={{ fontSize: '24px', fontWeight: 600, color: getAdaptivePrimaryColor(averageBrightness, PRIMARY_COLOR) }}>{extensions.length}</Typography.Text>
          <Typography.Text type='secondary' style={{ fontSize: '12px', display: 'block', marginTop: '4px', color: secondaryTextColor }}>已安装</Typography.Text>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Typography.Text style={{ fontSize: '24px', fontWeight: 600, color: getAdaptivePrimaryColor(averageBrightness, SUCCESS_COLOR) }}>{enabledCount}</Typography.Text>
          <Typography.Text type='secondary' style={{ fontSize: '12px', display: 'block', marginTop: '4px', color: secondaryTextColor }}>已启用</Typography.Text>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Typography.Text style={{ fontSize: '24px', fontWeight: 600, color: updateCount > 0 ? '#FF7D00' : primaryTextColor }}>{updateCount}</Typography.Text>
          <Typography.Text type='secondary' style={{ fontSize: '12px', display: 'block', marginTop: '4px', color: secondaryTextColor }}>有更新</Typography.Text>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Typography.Text style={{ fontSize: '24px', fontWeight: 600, color: primaryTextColor }}>65.8k</Typography.Text>
          <Typography.Text type='secondary' style={{ fontSize: '12px', display: 'block', marginTop: '4px', color: secondaryTextColor }}>总下载</Typography.Text>
        </div>
      </div>

      {/* 按钮 */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Button shape='round' type='primary' size='large' style={{ height: '40px', padding: '0 20px', fontSize: '14px', backgroundColor: PRIMARY_COLOR }}>检查更新</Button>
      </div>
    </div>
  );
};

const ExtensionsPage = () => {
  const [activeTab, setActiveTab] = useState('installed');
  const [extensions, setExtensions] = useState(MOCK_INSTALLED);

  const handleToggle = (id: string, enabled: boolean) => {
    setExtensions(prev => prev.map(ext => ext.id === id ? { ...ext, isEnabled: enabled } : ext));
  };

  const enabledCount = extensions.filter(e => e.isEnabled).length;
  const updateCount = extensions.filter(e => e.updateAvailable).length;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '48px 64px 64px', background: 'var(--color-bg-1)' }}>
      {/* 标题 */}
      <Typography.Title heading={1} style={{ fontWeight: 600, lineHeight: 1, margin: 0, marginBottom: '32px', fontSize: '40px' }}>
        扩展管理
      </Typography.Title>

      {/* 数据栏 */}
      <StatsBar extensions={extensions} enabledCount={enabledCount} updateCount={updateCount} />

      {/* 内容 */}
      <Tabs activeTab={activeTab} onChange={setActiveTab} type='text' style={{ marginBottom: '24px' }}>
        <Tabs.TabPane key='installed' title={<>已安装 <Tag size='small' style={{ marginLeft: '8px' }}>{extensions.length}</Tag></>} />
        <Tabs.TabPane key='market' title={<>扩展商店 <Tag size='small' style={{ marginLeft: '8px' }}>{MOCK_MARKET.length}</Tag></>} />
        <Tabs.TabPane key='settings' title='设置' />
      </Tabs>

      {activeTab === 'installed' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {extensions.map(ext => (
            <ExtensionCard key={ext.id} ext={ext} isInstalled onToggle={(enabled) => handleToggle(ext.id, enabled)} />
          ))}
        </div>
      )}

      {activeTab === 'market' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {MOCK_MARKET.map(ext => <ExtensionCard key={ext.id} ext={ext} />)}
        </div>
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
