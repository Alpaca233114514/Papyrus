/**
 * 无障碍设置视图
 * 
 * 实现 WCAG 2.1 AA/AAA 级无障碍功能配置
 * - AA 级：基础无障碍功能（默认启用）
 * - AAA 级：增强无障碍功能（可选启用）
 */
import {
  Switch,
  Button,
  Typography,
  Tag,
  Tooltip,
} from '@arco-design/web-react';
import {
  IconArrowLeft,
  IconBulb,
  IconEye,
  IconMoon,
  IconSun,
  IconQuestionCircle,
} from '@arco-design/web-react/icon';
import IconAccessibility from '../../icons/IconAccessibility';
import { useAccessibility } from '../../contexts/AccessibilityContext';

const { Title, Text, Paragraph } = Typography;

interface AccessibilityViewProps {
  onBack: () => void;
}

// ============================================
// 设置项组件
// ============================================

interface SettingItemProps {
  title: string;
  desc?: string;
  children: React.ReactNode;
  divider?: boolean;
  badge?: 'AA' | 'AAA';
  tooltip?: string;
}

const SettingItem = ({ 
  title, 
  desc, 
  children,
  divider = true,
  badge,
  tooltip,
}: SettingItemProps) => (
  <div className="settings-item">
    <div className="settings-item-content">
      <div className="settings-item-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text bold className="settings-item-title">{title}</Text>
          {badge && (
            <Tag 
              size="small" 
              color={badge === 'AAA' ? 'orange' : 'green'}
              style={{ fontSize: 11 }}
            >
              {badge}
            </Tag>
          )}
          {tooltip && (
            <Tooltip content={tooltip}>
              <IconQuestionCircle style={{ fontSize: 14, color: 'var(--color-text-3)' }} />
            </Tooltip>
          )}
        </div>
        {desc && <Paragraph type="secondary" className="settings-item-desc">{desc}</Paragraph>}
      </div>
      <div className="settings-item-control">
        {children}
      </div>
    </div>
    {divider && <div className="settings-item-divider" />}
  </div>
);

// ============================================
// 主视图组件
// ============================================

const AccessibilityView = ({ onBack }: AccessibilityViewProps) => {
  const { settings, updateSetting, resetSettings } = useAccessibility();

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      overflow: 'hidden',
      position: 'relative',
      background: 'var(--color-bg-1)',
      height: '100%',
    }}>
      {/* 左侧导航栏 */}
      <div style={{
        width: 220,
        height: '100%',
        borderRight: '1px solid var(--color-border-2)',
        background: 'var(--color-bg-1)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* 标题栏 */}
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
            aria-label="返回设置主页"
          />
          <Text style={{ fontSize: '14px', fontWeight: 500 }}>无障碍</Text>
        </div>

        {/* 导航菜单 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          <Text type="secondary" style={{ fontSize: 12, padding: '8px 12px', display: 'block' }}>
            快速导航
          </Text>
          <button 
            onClick={() => {
              const element = document.getElementById('aa-section');
              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '10px 12px',
              color: 'var(--color-text-1)',
              textDecoration: 'none',
              borderRadius: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <IconEye style={{ fontSize: 16 }} />
            <Text style={{ fontSize: 13 }}>AA 级基础</Text>
          </button>
          <button 
            onClick={() => {
              const element = document.getElementById('aaa-section');
              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '10px 12px',
              color: 'var(--color-text-1)',
              textDecoration: 'none',
              borderRadius: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <IconSun style={{ fontSize: 16 }} />
            <Text style={{ fontSize: 13 }}>AAA 级增强</Text>
          </button>
          <button 
            onClick={() => {
              const element = document.getElementById('motion-section');
              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '10px 12px',
              color: 'var(--color-text-1)',
              textDecoration: 'none',
              borderRadius: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <IconMoon style={{ fontSize: 16 }} />
            <Text style={{ fontSize: 13 }}>动画与效果</Text>
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '32px 48px',
      }}>
        {/* 页面标题 */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <IconAccessibility style={{ fontSize: 32, color: 'var(--color-primary)' }} />
            <Title heading={2} style={{ margin: 0, fontWeight: 400, fontSize: '28px' }}>
              无障碍设置
            </Title>
          </div>
          <Paragraph type="secondary">
            Papyrus 致力于提供包容性的用户体验。全应用支持 WCAG 2.1 AA 级标准，
            部分功能支持 AAA 级增强。
          </Paragraph>
        </div>

        {/* AA 级基础设置 */}
        <section id="aa-section" style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>AA 级基础</Title>
            <Tag color="green" size="small">推荐</Tag>
          </div>
          <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
            这些设置符合 WCAG 2.1 AA 级标准，建议所有用户保持启用状态。
          </Paragraph>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <SettingItem 
              title="焦点指示器" 
              desc="始终显示清晰的键盘焦点高亮，方便键盘导航"
              badge="AA"
              tooltip="当使用 Tab 键导航时，高亮显示当前聚焦的元素"
            >
              <Switch 
                checked={settings.focusIndicator} 
                onChange={(v) => updateSetting('focusIndicator', v)} 
              />
            </SettingItem>

            <SettingItem 
              title="屏幕阅读器优化" 
              desc="优化界面元素，提供更好的屏幕阅读器体验"
              badge="AA"
              tooltip="增强 ARIA 标签，隐藏装饰性元素"
            >
              <Switch 
                checked={settings.screenReaderOptimized} 
                onChange={(v) => updateSetting('screenReaderOptimized', v)} 
              />
            </SettingItem>

            <SettingItem 
              title="大光标" 
              desc="放大鼠标指针，方便视力不佳的用户"
              badge="AA"
              tooltip="将鼠标指针放大至 32x32 像素"
              divider={false}
            >
              <Switch 
                checked={settings.largeCursor} 
                onChange={(v) => updateSetting('largeCursor', v)} 
              />
            </SettingItem>
          </div>
        </section>

        {/* AAA 级增强设置 */}
        <section id="aaa-section" style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>AAA 级增强</Title>
            <Tag color="orange" size="small">可选</Tag>
          </div>
          <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
            这些设置符合 WCAG 2.1 AAA 级标准，适合有特殊需求的用户。
          </Paragraph>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <SettingItem 
              title="高对比度" 
              desc="增强文字与背景的对比度至 7:1（小文本）和 4.5:1（大文本）"
              badge="AAA"
              tooltip="显著提升文字可读性，适合低视力用户"
            >
              <Switch 
                checked={settings.highContrast} 
                onChange={(v) => updateSetting('highContrast', v)} 
              />
            </SettingItem>

            <SettingItem 
              title="阅读增强" 
              desc="行距 1.5 倍，段落间距 2 倍，文本宽度限制 ≤80 字符，非两端对齐"
              badge="AAA"
              tooltip="优化阅读体验，适合阅读障碍用户"
            >
              <Switch 
                checked={settings.readingEnhancement} 
                onChange={(v) => updateSetting('readingEnhancement', v)} 
              />
            </SettingItem>

            <SettingItem 
              title="节标题导航" 
              desc="显示页面内容大纲，便于快速导航"
              badge="AAA"
              tooltip="在页面右侧显示可点击的节标题列表"
              divider={false}
            >
              <Switch 
                checked={settings.sectionNavigation} 
                onChange={(v) => updateSetting('sectionNavigation', v)} 
              />
            </SettingItem>
          </div>
        </section>

        {/* 动画设置 */}
        <section id="motion-section" style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>动画与效果</Title>
          </div>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <SettingItem 
              title="完全禁用动画" 
              desc="禁用所有界面动画，包括过渡效果和滚动动画"
              badge="AAA"
              tooltip="适合前庭功能障碍用户或癫痫患者"
              divider={false}
            >
              <Switch 
                checked={settings.noAnimation} 
                onChange={(v) => updateSetting('noAnimation', v)} 
              />
            </SettingItem>
          </div>

          <div className="settings-tip" style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: 16,
            background: 'var(--color-primary-light)',
            borderRadius: 8,
          }}>
            <IconBulb style={{ color: 'var(--color-primary)', fontSize: 20, marginTop: 2 }} />
            <div>
              <Text style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, display: 'block' }}>
                系统偏好检测
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                当系统设置为"减少动画"时，Papyrus 会自动降低动画效果。您可以在此进一步禁用所有动画。
              </Text>
            </div>
          </div>
        </section>

        {/* 操作按钮 */}
        <section style={{ marginBottom: 48 }}>
          <div style={{ 
            display: 'flex', 
            gap: 12, 
            padding: '20px 0',
            borderTop: '1px solid var(--color-border-2)',
          }}>
            <Button 
              type="secondary" 
              onClick={resetSettings}
              style={{ borderRadius: 16 }}
            >
              恢复默认设置
            </Button>
          </div>
        </section>

        {/* 提示信息 */}
        <div className="settings-tip" style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: 16,
          background: 'var(--color-fill-2)',
          borderRadius: 8,
          marginBottom: 32,
        }}>
          <IconAccessibility style={{ color: 'var(--color-text-3)', fontSize: 20, marginTop: 2 }} />
          <div>
            <Text style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, display: 'block' }}>
              字体大小调整
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              字体大小调整请前往「外观与窗景」设置。系统级文本缩放也已完全支持。
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityView;
