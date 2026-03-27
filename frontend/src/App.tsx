import { useState, useRef, useCallback } from 'react';
import { BackTop, Message } from '@arco-design/web-react';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import ChatPanel from './ChatPanel';
import StatusBar from './StatusBar';
import StartPage from './StartPage/StartPage';
import ScrollPage from './ScrollPage/ScrollPage';
import NotesPage from './NotesPage/NotesPage';
import ChartsPage from './ChartsPage/ChartsPage';
import ExtensionsPage from './ExtensionsPage/ExtensionsPage';
import FilesPage from './FilesPage/FilesPage';
import SettingsPage from './SettingsPage/SettingsPage';
import type { SearchResult } from './api';

const App = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [todayDone, setTodayDone] = useState(false); // TODO: 接入真实完成状态
  const [activePage, setActivePage] = useState('start');
  const [chatOpen, setChatOpen] = useState(false);
  const CHAT_DEFAULT_WIDTH = 320;
  const [chatWidth, setChatWidth] = useState(CHAT_DEFAULT_WIDTH);
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(0);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // 处理搜索结果点击
  const handleSearchResult = useCallback((result: SearchResult) => {
    if (result.type === 'note') {
      setActivePage('notes');
      setSelectedNoteId(result.id);
      Message.success(`打开笔记: ${result.title}`);
    } else if (result.type === 'card') {
      setActivePage('scroll');
      Message.success('跳转到复习页面');
    }
  }, []);

  const onChatDragStart = useCallback((e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
    dragStartWidth.current = chatWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = dragStartX.current - ev.clientX;
      setChatWidth(Math.min(600, Math.max(280, dragStartWidth.current + delta)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [chatWidth]);

  return (
    <div style={{ width: '1440px', height: '900px', margin: '0 auto', background: 'var(--color-bg-1)', border: '1px solid var(--color-border-2)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Skip Link - 无障碍导航 */}
      <a href="#main-content" className="skip-link">
        跳转到主内容
      </a>
      
      {activePage === 'start' && (
        <BackTop
          visibleHeight={200}
          style={{ position: 'absolute', right: '64px', bottom: '64px' }}
          target={() => document.getElementById('start-page-scroll')!}
        />
      )}
      <TitleBar onPageChange={setActivePage} onSearchResult={handleSearchResult} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} chatOpen={chatOpen} onChatToggle={() => setChatOpen(!chatOpen)} activePage={activePage} onPageChange={setActivePage} />
        
        {/* 主内容区域 - 无障碍标记 */}
        <main 
          id="main-content" 
          ref={mainContentRef}
          tabIndex={-1}
          style={{ flex: 1, overflow: 'hidden', display: 'flex', position: 'relative', outline: 'none' }}
        >
          {/* 完成状态：顶部绿色光晕，仅今日完成时显示 */}
          {activePage === 'start' && todayDone && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '160px',
              background: 'linear-gradient(to bottom, rgba(232, 255, 234, 0.45) 0%, transparent 100%)',
              pointerEvents: 'none',
              zIndex: 0,
            }} />
          )}
          {activePage === 'start' && <StartPage onDoneChange={setTodayDone} />}
          {activePage === 'scroll' && <ScrollPage />}
          {activePage === 'notes' && <NotesPage />}
          {activePage === 'charts' && <ChartsPage />}
          {activePage === 'files' && <FilesPage />}
          {activePage === 'extensions' && <ExtensionsPage />}
          {activePage === 'settings' && <SettingsPage />}
        </main>
        
        {chatOpen && (
          <div style={{ display: 'flex', flexShrink: 0 }}>
            <div
              style={{ width: 4, cursor: activePage === 'start' ? 'default' : 'ew-resize', background: 'transparent', flexShrink: 0 }}
              onMouseDown={activePage !== 'start' ? onChatDragStart : undefined}
              onMouseEnter={e => { if (activePage !== 'start') e.currentTarget.style.background = 'var(--color-border-2)'; }}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            />
            <ChatPanel open={chatOpen} width={activePage === 'start' ? CHAT_DEFAULT_WIDTH : chatWidth} onClose={() => setChatOpen(false)} />
          </div>
        )}
      </div>
      <StatusBar />
    </div>
  );
};

export default App;
