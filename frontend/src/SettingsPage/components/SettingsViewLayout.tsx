import { Button, Typography } from '@arco-design/web-react';
import { IconArrowLeft } from '@arco-design/web-react/icon';
import { useScrollNavigation } from '../../hooks/useScrollNavigation';

const { Text, Paragraph } = Typography;

export interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
}

export interface Section {
  id: string;
  title?: string;
  icon?: React.ComponentType<{ style?: React.CSSProperties }>;
  iconColor?: string;
}

interface SettingsViewLayoutProps {
  title: string;
  description?: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  iconColor?: string;
  navItems: NavItem[];
  sections: Section[];
  onBack: () => void;
  children: (sectionId: string) => React.ReactNode;
  sidebarWidth?: number;
}

export const SettingsViewLayout = ({
  title,
  description,
  icon: Icon,
  iconColor = 'var(--color-primary)',
  navItems,
  sections,
  onBack,
  children,
  sidebarWidth = 200,
}: SettingsViewLayoutProps) => {
  const { contentRef, activeSection, scrollToSection } = useScrollNavigation(navItems);

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
        width: sidebarWidth,
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
          <Text style={{ fontSize: '14px', fontWeight: 500 }}>{title}</Text>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {navItems.map((item) => {
            const ItemIcon = item.icon;
            const isActive = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => scrollToSection(item.key)}
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
                <ItemIcon style={{ fontSize: 16 }} />
                <Text style={{
                  fontSize: 13,
                  color: isActive ? 'var(--color-primary)' : 'inherit',
                  fontWeight: isActive ? 500 : 400,
                }}>{item.label}</Text>
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
            <Icon style={{ fontSize: 32, color: iconColor }} />
            <Typography.Title heading={2} style={{ margin: 0, fontWeight: 400, fontSize: '28px' }}>
              {title}
            </Typography.Title>
          </div>
          {description && (
            <Paragraph type="secondary">
              {description}
            </Paragraph>
          )}
        </div>

        {sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            style={{ marginBottom: 48, scrollMarginTop: 24 }}
          >
            {section.title && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                {section.icon && (
                  <section.icon style={{ fontSize: 20, color: section.iconColor || 'var(--color-text-1)' }} />
                )}
                <Typography.Title heading={4} style={{ margin: 0, fontSize: 20 }}>
                  {section.title}
                </Typography.Title>
              </div>
            )}
            <div className="settings-section" style={{
              background: 'var(--color-bg-2)',
              borderRadius: 8,
              padding: '16px 20px',
              marginBottom: index === sections.length - 1 ? 0 : 24,
            }}>
              {children(section.id)}
            </div>
          </section>
        ))}

        <div style={{ height: 'calc(100vh - 200px)', flexShrink: 0 }} />
      </div>
    </div>
  );
};

export default SettingsViewLayout;