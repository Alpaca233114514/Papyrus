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
      document.body.style.backgroundColor = '#2A2A2B';
      document.body.style.color = 'var(--color-text-1)';
      document.body.style.colorScheme = 'dark';
    } else {
      document.body.removeAttribute('arco-theme');
      document.body.style.backgroundColor = '#FFFFFF';
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
    <nav className={`sidebar${collapsed ? '' : ' sidebar-expanded'}`} aria-label="主导航">
      <button
        className={`sidebar-item sidebar-toggle${!collapsed ? ' sidebar-item-active' : ''}`}
        onClick={onToggle}
        aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
        aria-expanded={!collapsed}
        type="button"
      >
        <IconNav aria-hidden="true" />
        <span className="sidebar-label">侧边栏</span>
      </button>
      {items.map((item) => (
        <Tooltip key={item.key} content={item.label} position="right" mini disabled={!collapsed}>
          <button
            className={`sidebar-item${activePage === item.key ? ' sidebar-item-active' : ''}`}
            onClick={() => onPageChange(item.key)}
            aria-current={activePage === item.key ? 'page' : undefined}
            aria-label={item.label}
            type="button"
          >
            <span aria-hidden="true">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        </Tooltip>
      ))}
      <div className="tw-flex-1" />
      <Tooltip content="聊天" position="right" mini disabled={!collapsed}>
        <button 
          className={`sidebar-item${chatOpen ? ' sidebar-item-active' : ''}`} 
          onClick={onChatToggle}
          aria-label={chatOpen ? '关闭聊天' : '打开聊天'}
          aria-pressed={chatOpen}
          type="button"
        >
          <IconRobot aria-hidden="true" />
          <span className="sidebar-label">聊天</span>
        </button>
      </Tooltip>
      <Tooltip content={dark ? '切换到日间模式' : '切换到夜间模式'} position="right" mini disabled={!collapsed}>
        <button 
          className="sidebar-item" 
          onClick={toggleDark}
          aria-label={dark ? '切换到日间模式' : '切换到夜间模式'}
          aria-pressed={dark}
          type="button"
        >
          {dark ? <IconMoon aria-hidden="true" /> : <IconSun aria-hidden="true" />}
          <span className="sidebar-label">{dark ? '夜间模式' : '日间模式'}</span>
        </button>
      </Tooltip>
      <Tooltip content={locked ? '解锁文本编辑' : '锁定文本编辑'} position="right" mini disabled={!collapsed}>
        <button 
          className="sidebar-item" 
          onClick={() => setLocked(!locked)}
          aria-label={locked ? '解锁文本编辑' : '锁定文本编辑'}
          aria-pressed={locked}
          type="button"
        >
          {locked ? <IconLock aria-hidden="true" /> : <IconUnlock aria-hidden="true" />}
          <span className="sidebar-label">{locked ? '锁定编辑' : '解锁编辑'}</span>
        </button>
      </Tooltip>
      <Tooltip content="设置" position="right" mini disabled={!collapsed}>
        <button 
          className={`sidebar-item${activePage === 'settings' ? ' sidebar-item-active' : ''}`}
          onClick={() => onPageChange('settings')}
          aria-current={activePage === 'settings' ? 'page' : undefined}
          aria-label="设置"
          type="button"
        >
          <IconSettings aria-hidden="true" />
          <span className="sidebar-label">设置</span>
        </button>
      </Tooltip>
    </nav>
  );
};

export default Sidebar;
