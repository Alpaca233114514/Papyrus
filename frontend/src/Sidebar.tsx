import { useState, useEffect } from 'react';
import { Tooltip } from '@arco-design/web-react';
import { IconNav, IconPlayArrow, IconCommon, IconFolder, IconMindMapping, IconSettings, IconLock, IconUnlock, IconMoon, IconSun, IconRobot } from '@arco-design/web-react/icon';
import './Sidebar.css';

const items = [
  { key: 'sidebar', icon: <IconNav />, label: '侧边栏' },
  { key: 'start', icon: <IconPlayArrow />, label: '开始' },
  { key: 'cards', icon: <IconFolder />, label: '闪卡' },
  { key: 'notes', icon: <IconMindMapping />, label: '结构笔记' },
  { key: 'extensions', icon: <IconCommon />, label: '扩展' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  chatOpen: boolean;
  onChatToggle: () => void;
}

const Sidebar = ({ collapsed, onToggle, chatOpen, onChatToggle }: SidebarProps) => {
  const [active, setActive] = useState('start');
  const [locked, setLocked] = useState(false);
  const [dark, setDark] = useState(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (dark) {
      document.body.setAttribute('arco-theme', 'dark');
      document.body.style.backgroundColor = 'var(--color-bg-1)';
      document.body.style.color = 'var(--color-text-1)';
      document.body.style.colorScheme = 'dark';
    } else {
      document.body.removeAttribute('arco-theme');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      document.body.style.colorScheme = '';
    }
  }, [dark]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleDark = () => setDark(!dark);

  return (
    <div className={`sidebar${collapsed ? '' : ' sidebar-expanded'}`}>
      {items.map((item) => (
        <Tooltip key={item.key} content={item.label} position="right" mini>
          <div
            className={`sidebar-item${item.key === 'sidebar' ? (!collapsed ? ' sidebar-item-active' : '') : (active === item.key ? ' sidebar-item-active' : '')}`}
            onClick={() => item.key === 'sidebar' ? onToggle() : setActive(item.key)}
          >
            {item.icon}
            {!collapsed && <span className="sidebar-label">{item.label}</span>}
          </div>
        </Tooltip>
      ))}
      <div style={{ flex: 1 }} />
      <Tooltip content="聊天" position="right" mini>
        <div className={`sidebar-item${chatOpen ? ' sidebar-item-active' : ''}`} onClick={onChatToggle}>
          <IconRobot />
          {!collapsed && <span className="sidebar-label">聊天</span>}
        </div>
      </Tooltip>
      <Tooltip content={dark ? '夜间模式' : '日间模式'} position="right" mini>
        <div className="sidebar-item" onClick={toggleDark}>
          {dark ? <IconMoon /> : <IconSun />}
          {!collapsed && <span className="sidebar-label">{dark ? '夜间模式' : '日间模式'}</span>}
        </div>
      </Tooltip>
      <Tooltip content={locked ? '锁定文本编辑' : '解锁文本编辑'} position="right" mini>
        <div className="sidebar-item" onClick={() => setLocked(!locked)}>
          {locked ? <IconLock /> : <IconUnlock />}
          {!collapsed && <span className="sidebar-label">{locked ? '锁定编辑' : '解锁编辑'}</span>}
        </div>
      </Tooltip>
      <Tooltip content="设置" position="right" mini>
        <div className="sidebar-item">
          <IconSettings />
          {!collapsed && <span className="sidebar-label">设置</span>}
        </div>
      </Tooltip>
    </div>
  );
};

export default Sidebar;