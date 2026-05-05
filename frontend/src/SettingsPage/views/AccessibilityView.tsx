import {
  Switch,
  Button,
  Typography,
} from '@arco-design/web-react';
import {
  IconArrowLeft,
  IconBulb,
  IconEye,
  IconMoon,
  IconSun,
} from '@arco-design/web-react/icon';
import IconAccessibility from '../../icons/IconAccessibility';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { SettingItem } from '../components';
import { useScrollNavigation } from '../../hooks/useScrollNavigation';

const { Title, Text, Paragraph } = Typography;

interface AccessibilityViewProps {
  onBack: () => void;
}

const NAV_ITEMS = [
  { key: 'aa-section', label: 'AA 级基础', icon: IconEye },
  { key: 'aaa-section', label: 'AAA 级增强', icon: IconSun },
  { key: 'motion-section', label: '动画与效果', icon: IconMoon },
];

const AccessibilityView = ({ onBack }: AccessibilityViewProps) => {
  const { settings, updateSetting, resetSettings } = useAccessibility();
  const { contentRef, activeSection, scrollToSection } = useScrollNavigation(NAV_ITEMS);

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
        width: 220,
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
            aria-label="返回设置主页"
          />
          <Text style={{ fontSize: '14px', fontWeight: 500 }}>无障碍</Text>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
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
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-1)',
                  textDecoration: 'none',
                  borderRadius: 6,
                  background: isActive ? 'var(--color-primary-light)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.2s',
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
            <IconAccessibility style={{ fontSize: 32, color: 'var(--color-primary)' }} />
            <Title heading={2} style={{ margin: 0, fontWeight: 400, fontSize: '28px' }}>
              无障碍设置
            </Title>
          </div>
          <Paragraph type="secondary">
            Papyrus Desktop 致力于提供包容性的用户体验。全应用支持 WCAG 2.1 AA 级标准，
            部分功能支持 AAA 级增强。
          </Paragraph>
        </div>

        <section id="aa-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>AA 级基础</Title>
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

        <section id="aaa-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>AAA 级增强</Title>
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

        <section id="motion-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
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
                当系统设置为"减少动画"时，Papyrus Desktop 会自动降低动画效果。您可以在此进一步禁用所有动画。
              </Text>
            </div>
          </div>
        </section>

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

        <div style={{ height: 'calc(100vh - 200px)', flexShrink: 0 }} />
      </div>
    </div>
  );
};

export default AccessibilityView;