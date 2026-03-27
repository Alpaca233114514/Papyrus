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
  IconFileImage,
  IconPalette,
  IconPlus,
} from '@arco-design/web-react/icon';
import { SettingsSidebar } from '../components';
import { 
  useSceneryManager, 
  usePageScenery,
  useStartPageScenery,
  type PageType,
} from '../../hooks/useScenery';

const FormItem = Form.Item;
const { Title, Text, Paragraph } = Typography;
const RadioGroup = Radio.Group;

// 主题选项
const THEME_OPTIONS = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' },
];

// 字体大小选项
const FONT_SIZE_OPTIONS = [
  { label: '小', value: 'small' },
  { label: '中', value: 'medium' },
  { label: '大', value: 'large' },
];

// 外观设置侧边栏子菜单项
const APPEARANCE_MENU_ITEMS = [
  { key: 'theme', label: '外观', icon: IconPalette },
  { key: 'scenery', label: '窗景', icon: IconFileImage },
];

interface AppearanceViewProps {
  onBack: () => void;
}

// 设置项组件
const SettingItem = ({ 
  title, 
  desc, 
  children,
  divider = true 
}: { 
  title: string; 
  desc?: string; 
  children: React.ReactNode;
  divider?: boolean;
}) => (
  <div className="settings-item">
    <div className="settings-item-content">
      <div className="settings-item-info">
        <Text bold className="settings-item-title">{title}</Text>
        {desc && <Paragraph type="secondary" className="settings-item-desc">{desc}</Paragraph>}
      </div>
      <div className="settings-item-control">
        {children}
      </div>
    </div>
    {divider && <Divider className="settings-item-divider" />}
  </div>
);

// 单页面窗景设置组件
interface SceneryHook {
  config: { enabled: boolean; image: string; name: string; opacity: number };
  updateConfig: (updates: Partial<{ enabled: boolean; image: string; name: string; opacity: number }>) => void;
  loaded?: boolean;
}

interface SinglePageScenerySettingsProps {
  sceneryHook: SceneryHook; 
  title: string;
  pageKey: PageType;
  allSceneries: Array<{ id: string; image: string; name: string }>;
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
      {/* 标题行：开关控制 */}
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
      
      {/* 启用后的详细设置 */}
      {config.enabled && (
        <>
          {/* 透明度调节 */}
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

          {/* 图片选择 */}
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
  const [activeMenu, setActiveMenu] = useState('theme');
  
  // 外观设置状态
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState('medium');
  const [accentColor, setAccentColor] = useState('var(--color-primary)');
  
  // 窗景设置状态
  const { allSceneries, addCustomScenery } = useSceneryManager();
  const startPageScenery = useStartPageScenery();
  const notesScenery = usePageScenery('notes');
  const scrollScenery = usePageScenery('scroll');
  const filesScenery = usePageScenery('files');
  const extensionsScenery = usePageScenery('extensions');
  const chartsScenery = usePageScenery('charts');
  
  // 添加自定义窗景弹窗状态
  const [addSceneryModalVisible, setAddSceneryModalVisible] = useState(false);
  const [sceneryForm] = Form.useForm();
  const [activeSceneryPage, setActiveSceneryPage] = useState<PageType>('scroll');

  // 添加自定义窗景
  const handleAddCustomScenery = () => {
    sceneryForm.validate().then((values: { name: string; imageUrl: string }) => {
      addCustomScenery(values.name, values.imageUrl);
      setAddSceneryModalVisible(false);
      sceneryForm.resetFields();
    });
  };

  const handleOpenAddScenery = (pageKey: PageType) => {
    setActiveSceneryPage(pageKey);
    setAddSceneryModalVisible(true);
  };

  // 外观设置内容
  const ThemeSettings = () => (
    <>
      <SettingItem title="主题" desc="选择应用的整体配色方案">
        <RadioGroup
          type="button"
          value={theme}
          onChange={setTheme}
          options={THEME_OPTIONS}
        />
      </SettingItem>

      <SettingItem title="强调色" desc="选择应用的主色调">
        <div className="settings-color-picker">
          {[
            { value: 'var(--color-primary)', label: '蓝色' },
            { value: 'var(--color-success)', label: '绿色' },
            { value: 'var(--color-danger)', label: '红色' },
            { value: 'var(--color-warning)', label: '橙色' },
            { value: 'var(--color-purple-6, #722ED1)', label: '紫色' },
            { value: 'var(--color-cyan-6, #14C9C9)', label: '青色' },
          ].map(({ value: color, label }) => (
            <div
              key={color}
              className={`settings-color-option ${accentColor === color ? 'active' : ''}`}
              style={{ background: color }}
              onClick={() => setAccentColor(color)}
              role="button"
              tabIndex={0}
              aria-label={`选择强调色 ${label}`}
              onKeyDown={(e) => e.key === 'Enter' && setAccentColor(color)}
            />
          ))}
        </div>
      </SettingItem>

      <SettingItem title="字体大小" desc="调整界面文字大小" divider={false}>
        <RadioGroup
          type="button"
          value={fontSize}
          onChange={setFontSize}
          options={FONT_SIZE_OPTIONS}
        />
      </SettingItem>
    </>
  );

  // 窗景设置内容
  const ScenerySettings = () => (
    <>
      {/* 开始界面窗景 */}
      <div style={{ marginBottom: 24, padding: 16, border: '1px solid var(--color-border-2)', borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text style={{ fontWeight: 600, fontSize: 15 }}>开始界面</Text>
            <Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 0 0' }}>
              今日完成卡片中的窗景（经典模式）
            </Paragraph>
          </div>
          <Switch 
            size="small"
            checked={startPageScenery.config.enabled} 
            onChange={(checked) => startPageScenery.updateConfig({ enabled: checked })}
          />
        </div>
        
        {startPageScenery.config.enabled && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border-2)' }}>
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
                  onClick={() => startPageScenery.updateConfig({ image: item.image, name: item.name })}
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
                  onKeyDown={(e) => e.key === 'Enter' && startPageScenery.updateConfig({ image: item.image, name: item.name })}
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
          </div>
        )}
      </div>

      <Divider style={{ margin: '24px 0' }} />

      {/* 各界面窗景设置 */}
      <Title heading={6} style={{ margin: '0 0 16px 0', fontSize: 14, color: 'var(--color-text-2)' }}>
        各界面窗景配置
      </Title>
      
      <SinglePageScenerySettings sceneryHook={notesScenery} title="笔记库界面" pageKey="notes" allSceneries={allSceneries} onAddCustomScenery={handleOpenAddScenery} />
      <SinglePageScenerySettings sceneryHook={scrollScenery} title="卷轴界面" pageKey="scroll" allSceneries={allSceneries} onAddCustomScenery={handleOpenAddScenery} />
      <SinglePageScenerySettings sceneryHook={filesScenery} title="文件库界面" pageKey="files" allSceneries={allSceneries} onAddCustomScenery={handleOpenAddScenery} />
      <SinglePageScenerySettings sceneryHook={extensionsScenery} title="扩展管理界面" pageKey="extensions" allSceneries={allSceneries} onAddCustomScenery={handleOpenAddScenery} />
      <SinglePageScenerySettings sceneryHook={chartsScenery} title="数据图表界面" pageKey="charts" allSceneries={allSceneries} onAddCustomScenery={handleOpenAddScenery} />
    </>
  );

  const renderContent = () => {
    switch (activeMenu) {
      case 'theme':
        return <ThemeSettings />;
      case 'scenery':
        return <ScenerySettings />;
      default:
        return <ThemeSettings />;
    }
  };

  const getCurrentTitle = () => {
    const item = APPEARANCE_MENU_ITEMS.find(item => item.key === activeMenu);
    return item?.label || '外观';
  };

  return (
    <>
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--color-bg-1)',
      }}>
        <SettingsSidebar
          title="外观与窗景"
          menuItems={APPEARANCE_MENU_ITEMS}
          activeItem={activeMenu}
          onItemClick={setActiveMenu}
          onBack={onBack}
        />

        {/* 主内容区 */}
        <div 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: 48,
          }}
        >
          <Title heading={2} style={{ margin: '0 0 32px 0', fontWeight: 400, fontSize: '28px' }}>
            {getCurrentTitle()}
          </Title>
          
          <div className="settings-section">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* 添加自定义窗景图片弹窗 */}
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
          <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
            支持网络图片链接或本地图片路径
          </Paragraph>
        </Form>
      </Modal>
    </>
  );
};

export default AppearanceView;
