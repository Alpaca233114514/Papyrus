import { useEffect, useState } from 'react';
import { Tooltip } from '@arco-design/web-react';
import { IconNav, IconPlayArrow, IconCommon, IconFolder, IconMindMapping, IconSettings, IconLock, IconUnlock, IconMoon, IconSun, IconRobot } from '@arco-design/web-react/icon';
import IconCharts from './icons/IconCharts';
import IconScroll from './icons/IconScroll';
import './Sidebar.css';

const items = [
  { key: 'start', icon: <IconPlayArrow />, label: '开始' },
  { key: 'scroll', icon: <IconScroll />, label: '卷轴' },
  { key: 'notes', icon: <IconMindMapping />, label: '结构笔记' },
  { key: 'charts', icon: <IconCharts />, label: '数据' },
  { key: 'files', icon: <IconFolder />, label: '文件库' },
  { key: 'extensions', icon: <IconCommon />, label: '扩展管理' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  chatOpen: boolean;
  onChatToggle: () => void;
  activePage: string;
  onPageChange: (key: string) => void;
}

const Sidebar = ({ collapsed, onToggle, chatOpen, onChatToggle, activePage, onPageChange }: SidebarProps) => {
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
      <div
        className={`sidebar-item sidebar-toggle${!collapsed ? ' sidebar-item-active' : ''}`}
        onClick={onToggle}
      >
        <IconNav />
        <span className="sidebar-label">侧边栏</span>
      </div>
      {items.map((item) => (
        <Tooltip key={item.key} content={item.label} position="right" mini disabled={!collapsed}>
          <div
            className={`sidebar-item${activePage === item.key ? ' sidebar-item-active' : ''}`}
            onClick={() => onPageChange(item.key)}
          >
            {item.icon}
            <span className="sidebar-label">{item.label}</span>
          </div>
        </Tooltip>
      ))}
      <div style={{ flex: 1 }} />
      <Tooltip content="聊天" position="right" mini disabled={!collapsed}>
        <div className={`sidebar-item${chatOpen ? ' sidebar-item-active' : ''}`} onClick={onChatToggle}>
          <IconRobot />
          <span className="sidebar-label">聊天</span>
        </div>
      </Tooltip>
      <Tooltip content={dark ? '夜间模式' : '日间模式'} position="right" mini disabled={!collapsed}>
        <div className="sidebar-item" onClick={toggleDark}>
          {dark ? <IconMoon /> : <IconSun />}
          <span className="sidebar-label">{dark ? '夜间模式' : '日间模式'}</span>
        </div>
      </Tooltip>
      <Tooltip content={locked ? '锁定文本编辑' : '解锁文本编辑'} position="right" mini disabled={!collapsed}>
        <div className="sidebar-item" onClick={() => setLocked(!locked)}>
          {locked ? <IconLock /> : <IconUnlock />}
          <span className="sidebar-label">{locked ? '锁定编辑' : '解锁编辑'}</span>
        </div>
      </Tooltip>
      <Tooltip content="设置" position="right" mini disabled={!collapsed}>
        <div 
          className={`sidebar-item${activePage === 'settings' ? ' sidebar-item-active' : ''}`}
          onClick={() => onPageChange('settings')}
        >
          <IconSettings />
          <span className="sidebar-label">设置</span>
        </div>
      </Tooltip>
    </div>
  );
};

export default Sidebar;