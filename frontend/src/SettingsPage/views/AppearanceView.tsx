import { useState } from 'react';
import {
  Input,
  Switch,
  Button,
  Slider,
  Typography,
  Form,
  Modal,
  Divider,
  Radio,
} from '@arco-design/web-react';
import {
  IconArrowLeft,
  IconFileImage,
  IconPalette,
  IconPlus,
} from '@arco-design/web-react/icon';
import { SettingItem } from '../components';
import { 
  useSceneryManager, 
  usePageScenery,
  useStartPageScenery,
  type PageType,
} from '../../hooks/useScenery';
import { useScrollNavigation } from '../../hooks/useScrollNavigation';

const FormItem = Form.Item;
const { Title, Text, Paragraph } = Typography;
const RadioGroup = Radio.Group;

const FONT_SIZE_OPTIONS = [
  { label: '小', value: 'small' },
  { label: '中', value: 'medium' },
  { label: '大', value: 'large' },
];

const NAV_ITEMS = [
  { key: 'theme-section', label: '外观', icon: IconPalette },
  { key: 'scenery-section', label: '窗景', icon: IconFileImage },
];

interface AppearanceViewProps {
  onBack: () => void;
}

interface SceneryHook {
  config: { enabled: boolean; image: string; name: string; opacity: number };
  updateConfig: (updates: Partial<{ enabled: boolean; image: string; name: string; opacity: number }>) => void;
  loaded?: boolean;
}

interface SinglePageScenerySettingsProps {
  sceneryHook: SceneryHook;
  title: string;
  pageKey: PageType;
  allSceneries: Array<{ id: string; image: string; name: string; poem?: string; source?: string }>;
  onAddCustomScenery: (pageKey: PageType) => void;
}

const SinglePageScenerySettings = ({ 
  sceneryHook, 
  title,
  pageKey,
  allSceneries,
  onAddCustomScenery,
}: SinglePageScenerySettingsProps) => {
  const { config, updateConfig } = sceneryHook;

  return (
    <div style={{ marginBottom: 24, padding: 16, border: '1px solid var(--color-border-2)', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: config.enabled ? 16 : 0 }}>
        <div>
          <Text style={{ fontWeight: 600, fontSize: 15 }}>{title}</Text>
          <Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 0 0' }}>
            {config.enabled ? '已启用窗景背景' : '点击开关启用窗景'}
          </Paragraph>
        </div>
        <Switch 
          size="small"
          checked={config.enabled} 
          onChange={(checked) => updateConfig({ enabled: checked })}
        />
      </div>
      
      {config.enabled && (
        <>
          <div style={{ marginBottom: 16, padding: '12px 0', borderTop: '1px solid var(--color-border-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 13, minWidth: 60 }}>透明度</Text>
              <Slider
                min={25}
                max={75}
                step={5}
                value={Math.round((config.opacity ?? 0.35) * 100)}
                onChange={(val) => updateConfig({ opacity: (val as number) / 100 })}
                style={{ flex: 1, maxWidth: 150 }}
              />
              <Text style={{ fontSize: 13, minWidth: 40 }}>
                {Math.round((config.opacity ?? 0.35) * 100)}%
              </Text>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 13 }}>选择窗景图片</Text>
              <Button
                type="primary"
                size="mini"
                icon={<IconPlus />}
                onClick={() => onAddCustomScenery(pageKey)}
                style={{ borderRadius: '999px' }}
              >
                添加图片
              </Button>
            </div>
            
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {allSceneries.map((item) => (
                <div
                  key={item.id}
                  onClick={() => updateConfig({ image: item.image, name: item.name })}
                  style={{
                    width: 80,
                    height: 45,
                    borderRadius: 6,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: config.image === item.image ? '2px solid var(--color-primary)' : '2px solid transparent',
                    position: 'relative',
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`选择窗景 ${item.name}`}
                  onKeyDown={(e) => e.key === 'Enter' && updateConfig({ image: item.image, name: item.name })}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.style.background = 'var(--color-fill-2)';
                    }}
                  />
                  {config.image === item.image && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const AppearanceView = ({ onBack }: AppearanceViewProps) => {
  const { contentRef, activeSection, scrollToSection } = useScrollNavigation(NAV_ITEMS);
  const [fontSize, setFontSize] = useState(() => {
    try { return localStorage.getItem('papyrus_font_size') ?? 'medium'; }
    catch { return 'medium'; }
  });

  const handleFontSizeChange = (value: string) => {
    setFontSize(value);
    localStorage.setItem('papyrus_font_size', value);
    document.body.dataset.fontSize = value;
    window.dispatchEvent(new CustomEvent('papyrus_font_size_changed'));
  };
  
  const { allSceneries, addCustomScenery } = useSceneryManager();
  const startPageScenery = useStartPageScenery();
  const notesScenery = usePageScenery('notes');
  const scrollScenery = usePageScenery('scroll');
  const filesScenery = usePageScenery('files');
  const extensionsScenery = usePageScenery('extensions');
  const chartsScenery = usePageScenery('charts');
  
  const [addSceneryModalVisible, setAddSceneryModalVisible] = useState(false);
  const [sceneryForm] = Form.useForm();
  const [activeSceneryPage, setActiveSceneryPage] = useState<PageType>('scroll');

  const handleAddCustomScenery = () => {
    sceneryForm.validate().then((values: { name: string; imageUrl: string; poem?: string; source?: string }) => {
      addCustomScenery(values.name, values.imageUrl, values.poem, values.source);
      setAddSceneryModalVisible(false);
      sceneryForm.resetFields();
    });
  };

  const handleOpenAddScenery = (pageKey: PageType) => {
    setActiveSceneryPage(pageKey);
    setAddSceneryModalVisible(true);
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      overflow: 'hidden',
      position: 'relative',
      background: 'var(--color-bg-1)',
      height: '100%',
    }}>
      <div style={{
        width: 200,
        height: '100%',
        borderRight: '1px solid var(--color-border-2)',
        background: 'var(--color-bg-1)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        <div style={{
          padding: 16,
          borderBottom: '1px solid var(--color-border-2)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Button
            type="text"
            icon={<IconArrowLeft />}
            onClick={onBack}
            style={{ padding: 0, fontSize: 14 }}
          />
          <Text style={{ fontSize: '14px', fontWeight: 500 }}>外观与窗景</Text>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const isActive = activeSection === key;
            return (
              <button
                key={key}
                onClick={() => scrollToSection(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderRadius: 8,
                  marginBottom: 4,
                  background: isActive ? 'var(--color-primary-light)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-1)',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  userSelect: 'none',
                }}
              >
                <Icon style={{ fontSize: 16 }} />
                <Text style={{ 
                  fontSize: 13, 
                  color: isActive ? 'var(--color-primary)' : 'inherit',
                  fontWeight: isActive ? 500 : 400,
                }}>{label}</Text>
              </button>
            );
          })}
        </div>
      </div>

      <div 
        ref={contentRef}
        onWheel={(e) => e.stopPropagation()}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '32px 48px',
        }}
      >
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <IconPalette style={{ fontSize: 32, color: 'var(--color-primary)' }} />
            <Title heading={2} style={{ margin: 0, fontWeight: 400, fontSize: '28px' }}>
              外观与窗景
            </Title>
          </div>
          <Paragraph type="secondary">
            自定义应用外观和窗景背景
          </Paragraph>
        </div>

        <div id="theme-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>外观</Title>
          </div>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <SettingItem title="字体大小" desc="调整界面文字大小">
              <RadioGroup
                type="button"
                value={fontSize}
                onChange={handleFontSizeChange}
                options={FONT_SIZE_OPTIONS}
              />
            </SettingItem>

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: 16,
              background: 'var(--color-fill-2)',
              borderRadius: 8,
              marginTop: 8,
            }}>
              <IconPalette style={{ color: 'var(--color-text-3)', fontSize: 20, marginTop: 2 }} />
              <div>
                <Text style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, display: 'block' }}>
                  主题切换
                </Text>
                <Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
                  使用左下角的日间/夜间模式按钮切换主题。跟随系统设置功能即将推出。
                </Paragraph>
              </div>
            </div>
          </div>
        </div>

        <div id="scenery-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>窗景</Title>
          </div>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <SettingItem title="开始界面" desc="今日完成卡片中的窗景（经典模式）">
              <Switch 
                size="small"
                checked={startPageScenery.config.enabled} 
                onChange={(checked) => startPageScenery.updateConfig({ enabled: checked })}
              />
            </SettingItem>

            {startPageScenery.config.enabled && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 13 }}>选择窗景图片</Text>
                  <Button
                    type="primary"
                    size="mini"
                    icon={<IconPlus />}
                    onClick={() => handleOpenAddScenery('scroll')}
                    style={{ borderRadius: '999px' }}
                  >
                    添加图片
                  </Button>
                </div>
                
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {allSceneries.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => startPageScenery.updateConfig({ image: item.image, name: item.name, poem: item.poem, source: item.source })}
                      style={{
                        width: 80,
                        height: 45,
                        borderRadius: 6,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: startPageScenery.config.image === item.image ? '2px solid var(--color-primary)' : '2px solid transparent',
                        position: 'relative',
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`选择窗景 ${item.name}`}
                      onKeyDown={(e) => e.key === 'Enter' && startPageScenery.updateConfig({ image: item.image, name: item.name, poem: item.poem, source: item.source })}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {startPageScenery.config.image === item.image && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 13, minWidth: 60 }}>透明度</Text>
                  <Slider
                    min={25}
                    max={75}
                    step={5}
                    value={Math.round((startPageScenery.config.opacity ?? 0.35) * 100)}
                    onChange={(val) => startPageScenery.updateConfig({ opacity: (val as number) / 100 })}
                    style={{ flex: 1, maxWidth: 150 }}
                  />
                  <Text style={{ fontSize: 13, minWidth: 40 }}>
                    {Math.round((startPageScenery.config.opacity ?? 0.35) * 100)}%
                  </Text>
                </div>

                <div style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>配套诗句</Text>
                  <Input.TextArea
                    placeholder="输入配套诗句"
                    value={startPageScenery.config.poem || ''}
                    onChange={(val) => startPageScenery.updateConfig({ poem: val })}
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    style={{ fontSize: 13 }}
                  />
                </div>

                <div style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>诗句出处</Text>
                  <Input
                    placeholder="如：[宋] 苏轼《望江南·超然台作》"
                    value={startPageScenery.config.source || ''}
                    onChange={(val) => startPageScenery.updateConfig({ source: val })}
                    style={{ fontSize: 13 }}
                  />
                </div>
              </div>
            )}

            <SettingItem title="笔记库界面窗景" desc="配置笔记库界面的窗景背景" divider={false}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch 
                  size="small"
                  checked={notesScenery.config.enabled} 
                  onChange={(checked) => notesScenery.updateConfig({ enabled: checked })}
                />
                {notesScenery.config.enabled && (
                  <Button
                    type="primary"
                    size="mini"
                    icon={<IconPlus />}
                    onClick={() => handleOpenAddScenery('notes')}
                    style={{ borderRadius: '999px' }}
                  >
                    配置
                  </Button>
                )}
              </div>
            </SettingItem>
          </div>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <SettingItem title="卷轴界面窗景" desc="配置卷轴界面的窗景背景">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch 
                  size="small"
                  checked={scrollScenery.config.enabled} 
                  onChange={(checked) => scrollScenery.updateConfig({ enabled: checked })}
                />
                {scrollScenery.config.enabled && (
                  <Button
                    type="primary"
                    size="mini"
                    icon={<IconPlus />}
                    onClick={() => handleOpenAddScenery('scroll')}
                    style={{ borderRadius: '999px' }}
                  >
                    配置
                  </Button>
                )}
              </div>
            </SettingItem>

            <SettingItem title="文件库界面窗景" desc="配置文件库界面的窗景背景">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch 
                  size="small"
                  checked={filesScenery.config.enabled} 
                  onChange={(checked) => filesScenery.updateConfig({ enabled: checked })}
                />
                {filesScenery.config.enabled && (
                  <Button
                    type="primary"
                    size="mini"
                    icon={<IconPlus />}
                    onClick={() => handleOpenAddScenery('files')}
                    style={{ borderRadius: '999px' }}
                  >
                    配置
                  </Button>
                )}
              </div>
            </SettingItem>

            <SettingItem title="扩展管理界面窗景" desc="配置扩展管理界面的窗景背景">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch 
                  size="small"
                  checked={extensionsScenery.config.enabled} 
                  onChange={(checked) => extensionsScenery.updateConfig({ enabled: checked })}
                />
                {extensionsScenery.config.enabled && (
                  <Button
                    type="primary"
                    size="mini"
                    icon={<IconPlus />}
                    onClick={() => handleOpenAddScenery('extensions')}
                    style={{ borderRadius: '999px' }}
                  >
                    配置
                  </Button>
                )}
              </div>
            </SettingItem>

            <SettingItem title="数据图表界面窗景" desc="配置数据图表界面的窗景背景" divider={false}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch 
                  size="small"
                  checked={chartsScenery.config.enabled} 
                  onChange={(checked) => chartsScenery.updateConfig({ enabled: checked })}
                />
                {chartsScenery.config.enabled && (
                  <Button
                    type="primary"
                    size="mini"
                    icon={<IconPlus />}
                    onClick={() => handleOpenAddScenery('charts')}
                    style={{ borderRadius: '999px' }}
                  >
                    配置
                  </Button>
                )}
              </div>
            </SettingItem>
          </div>
        </div>

        <div style={{ height: 'calc(100vh - 200px)', flexShrink: 0 }} />
      </div>

      <Modal
        title="添加自定义窗景图片"
        visible={addSceneryModalVisible}
        onOk={handleAddCustomScenery}
        onCancel={() => { setAddSceneryModalVisible(false); sceneryForm.resetFields(); }}
        autoFocus={false}
        focusLock
      >
        <Form form={sceneryForm} layout="vertical">
          <FormItem
            label={<Title heading={6} style={{ margin: 0 }}>图片名称</Title>}
            field="name"
            rules={[{ required: true, message: '请输入图片名称' }]}
          >
            <Input placeholder="如：我的家乡" />
          </FormItem>
          <FormItem
            label={<Title heading={6} style={{ margin: 0 }}>图片链接</Title>}
            field="imageUrl"
            rules={[{ required: true, message: '请输入图片链接' }]}
          >
            <Input placeholder="https://example.com/image.jpg" />
          </FormItem>
          <FormItem
            label={<Title heading={6} style={{ margin: 0 }}>配套诗句（可选）</Title>}
            field="poem"
          >
            <Input.TextArea placeholder="输入配套诗句" autoSize={{ minRows: 2, maxRows: 4 }} />
          </FormItem>
          <FormItem
            label={<Title heading={6} style={{ margin: 0 }}>诗句出处（可选）</Title>}
            field="source"
          >
            <Input placeholder="如：[宋] 苏轼《望江南·超然台作》" />
          </FormItem>
          <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
            支持网络图片链接或本地图片路径
          </Paragraph>
        </Form>
      </Modal>
    </div>
  );
};

export default AppearanceView;
