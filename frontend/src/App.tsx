/**
 * Papyrus 主应用组件
 * 
 * 无障碍特性：
 * - Skip Link 跳转到主内容
 * - ARIA 地标角色
 * - 键盘导航支持
 * - 语义化 HTML 结构
 */
import { useState, useRef, useCallback, useEffect } from 'react';
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
import SectionNavigation from './components/SectionNavigation';
import type { SearchResult } from './api';

const PAGE_ORDER = ['start', 'scroll', 'notes', 'charts', 'files', 'extensions', 'settings'];

const App = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [todayDone, setTodayDone] = useState(false);
  const [activePage, setActivePage] = useState('start');
  const [chatOpen, setChatOpen] = useState(false);
  const CHAT_DEFAULT_WIDTH = 320;
  const [chatWidth, setChatWidth] = useState(CHAT_DEFAULT_WIDTH);
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(0);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const prevPageIndexRef = useRef<number>(0);
  const [animationDirection, setAnimationDirection] = useState<'up' | 'down' | null>(null);

  // 处理页面切换动画
  const handlePageChange = useCallback((newPage: string) => {
    const newIndex = PAGE_ORDER.indexOf(newPage);
    if (newIndex === -1) {
      console.warn(`页面 '${newPage}' 不存在于页面顺序列表中`);
      setActivePage(newPage);
      return;
    }
    const prevIndex = prevPageIndexRef.current;
    
    if (newIndex > prevIndex) {
      setAnimationDirection('up');
    } else if (newIndex < prevIndex) {
      setAnimationDirection('down');
    } else {
      setAnimationDirection(null);
    }
    
    prevPageIndexRef.current = newIndex;
    setActivePage(newPage);
  }, []);

  // 处理搜索结果点击
  const handleSearchResult = useCallback((result: SearchResult) => {
    if (result.type === 'note') {
      handlePageChange('notes');
      setSelectedNoteId(result.id);
      Message.success(`打开笔记: ${result.title}`);
    } else if (result.type === 'card') {
      handlePageChange('scroll');
      Message.success('跳转到复习页面');
    }
  }, [handlePageChange]);

  // 监听来自 ChatPanel 的设置页面跳转事件
  useEffect(() => {
    const handleOpenSettings = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      handlePageChange('settings');
      console.log('Opening settings section:', detail?.section);
    };
    window.addEventListener('papyrus_open_settings', handleOpenSettings);
    return () => window.removeEventListener('papyrus_open_settings', handleOpenSettings);
  }, [handlePageChange]);

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

  // 页面标题映射
  const pageTitles: Record<string, string> = {
    start: '开始',
    scroll: '复习',
    notes: '笔记',
    charts: '统计',
    files: '文件',
    extensions: '扩展',
    settings: '设置',
  };

  // 更新文档标题
  useEffect(() => {
    document.title = `Papyrus - ${pageTitles[activePage] || '莎草纸'}`;
  }, [activePage]);

  // 渲染当前页面
  const renderPage = () => {
    const animationClass = animationDirection ? `page-transition-${animationDirection}` : '';
    
    const pages: Record<string, React.ReactNode> = {
      start: <StartPage onDoneChange={setTodayDone} onNavigate={handlePageChange} />,
      scroll: <ScrollPage />,
      notes: <NotesPage />,
      charts: <ChartsPage />,
      files: <FilesPage />,
      extensions: <ExtensionsPage />,
      settings: <SettingsPage />,
    };

    return (
      <div 
        key={activePage}
        className={`page-container ${animationClass}`}
      >
        {pages[activePage]}
      </div>
    );
  };

  return (
    <div 
      className="tw-relative tw-flex tw-flex-col tw-mx-auto tw-bg-arco-bg-1"
      style={{ 
        width: '100%', 
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      {/* Skip Link - 无障碍导航（AA 级） */}
      <a 
        href="#main-content" 
        className="skip-link"
        aria-label="跳转到主内容区域"
      >
        跳转到主内容
      </a>
      
      {/* 返回顶部按钮 */}
      {activePage === 'start' && (
        <BackTop
          visibleHeight={200}
          style={{
            position: 'absolute',
            right: chatOpen ? chatWidth + 48 : 48,
            bottom: 48,
            transition: 'right 0.3s ease',
          }}
          target={() => document.getElementById('start-page-scroll') ?? window as unknown as HTMLElement}
          aria-label="返回顶部"
        />
      )}

      {/* 标题栏 */}
      <TitleBar 
        onPageChange={handlePageChange} 
        onSearchResult={handleSearchResult} 
      />
      
      {/* 主体布局 */}
      <div className="tw-flex tw-flex-1 tw-overflow-hidden">
        {/* 侧边栏导航 */}
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
          chatOpen={chatOpen} 
          onChatToggle={() => setChatOpen(!chatOpen)} 
          activePage={activePage} 
          onPageChange={handlePageChange} 
        />
        
        {/* 主内容区域 */}
        <main 
          id="main-content" 
          ref={mainContentRef}
          tabIndex={-1}
          className="tw-relative tw-flex-1 tw-flex tw-overflow-hidden tw-outline-none"
          role="main"
          aria-label={`${pageTitles[activePage] || '主内容'}页面`}
        >
          {/* 完成状态光晕 */}
          {activePage === 'start' && todayDone && (
            <div 
              className="tw-absolute tw-inset-x-0 tw-top-0 tw-pointer-events-none"
              style={{ 
                height: '160px', 
                background: 'linear-gradient(to bottom, rgba(232, 255, 234, 0.45) 0%, transparent 100%)',
                zIndex: 0 
              }} 
              aria-hidden="true"
            />
          )}

          {/* 页面内容 */}
          {renderPage()}
        </main>
        
        {/* 节标题导航（AAA 级） */}
        <SectionNavigation 
          containerSelector="#main-content"
          minLevel={2}
          maxLevel={3}
        />
        
        {/* 聊天面板 */}
        {chatOpen && (
          <div 
            className="tw-flex tw-flex-shrink-0"
            role="complementary"
            aria-label="AI 助手聊天面板"
          >
            <div
              className="tw-flex-shrink-0 tw-transition-colors tw-duration-200"
              style={{ 
                width: 4, 
                cursor: activePage === 'start' ? 'default' : 'ew-resize'
              }}
              onMouseDown={activePage !== 'start' ? onChatDragStart : undefined}
              onMouseEnter={e => { 
                if (activePage !== 'start') e.currentTarget.style.background = 'var(--color-border-2)'; 
              }}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              role="separator"
              aria-orientation="vertical"
              aria-label="调整聊天面板宽度"
              tabIndex={0}
            />
            <ChatPanel 
              open={chatOpen} 
              width={activePage === 'start' ? CHAT_DEFAULT_WIDTH : chatWidth} 
              onClose={() => setChatOpen(false)} 
            />
          </div>
        )}
      </div>
      
      {/* 状态栏 */}
      <StatusBar />
    </div>
  );
};

export default App;
