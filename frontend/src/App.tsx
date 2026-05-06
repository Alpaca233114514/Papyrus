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
import { useTranslation } from 'react-i18next';
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

const CHAT_WIDTH_STORAGE_KEY = 'papyrus_chat_width';
const CHAT_DEFAULT_WIDTH = 320;

const loadChatWidth = (): number => {
  try {
    const saved = localStorage.getItem(CHAT_WIDTH_STORAGE_KEY);
    if (saved) {
      const width = parseInt(saved, 10);
      if (width >= 280 && width <= 600) {
        return width;
      }
    }
  } catch {
    // ignore
  }
  return CHAT_DEFAULT_WIDTH;
};

const saveChatWidth = (width: number): void => {
  try {
    localStorage.setItem(CHAT_WIDTH_STORAGE_KEY, String(width));
  } catch {
    // ignore
  }
};

const App = () => {
  const { t } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [todayDone, setTodayDone] = useState(false);
  const [activePage, setActivePage] = useState('start');
  const [chatOpen, setChatOpen] = useState(true);
  const [chatWidth, setChatWidth] = useState(loadChatWidth);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(0);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [initialScrollTag, setInitialScrollTag] = useState<string | undefined>(undefined);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const prevPageIndexRef = useRef<number>(0);
  const [animationDirection, setAnimationDirection] = useState<'up' | 'down' | null>(null);
  const [prevPage, setPrevPage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextPage, setNextPage] = useState<string | null>(null);

  // 处理页面切换动画 - 串行执行，先退出再进入（新页面预加载但不显示）
  const handlePageChange = useCallback((newPage: string) => {
    if (isTransitioning) return;
    
    const newIndex = PAGE_ORDER.indexOf(newPage);
    if (newIndex === -1) {
      console.warn(t('app.pageNotFound', { page: newPage }));
      setActivePage(newPage);
      return;
    }
    const prevIndex = prevPageIndexRef.current;
    const prevPageValue = activePage;
    
    let direction: 'up' | 'down' | null = null;
    if (newIndex > prevIndex) {
      direction = 'up';
    } else if (newIndex < prevIndex) {
      direction = 'down';
    }
    
    if (!direction) {
      setActivePage(newPage);
      return;
    }
    
    prevPageIndexRef.current = newIndex;
    
    setAnimationDirection(direction);
    setPrevPage(prevPageValue);
    setNextPage(newPage);
    setIsTransitioning(true);
  }, [activePage, isTransitioning]);

  // 处理搜索结果点击
  const handleSearchResult = useCallback((result: SearchResult) => {
    if (result.type === 'note') {
      handlePageChange('notes');
      setSelectedNoteId(result.id);
      Message.success(t('app.openNote', { title: result.title }));
    } else if (result.type === 'card') {
      handlePageChange('scroll');
      setInitialScrollTag(result.tags?.[0]);
      Message.success(t('app.navigateToReview'));
    }
  }, [handlePageChange, t]);

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

  const chatDragActiveRef = useRef(false);
  const onChatDragStart = useCallback((e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
    dragStartWidth.current = chatWidth;
    chatDragActiveRef.current = true;
    setIsDragging(true);
    const cleanup = () => {
      chatDragActiveRef.current = false;
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
    const onMove = (ev: MouseEvent) => {
      const delta = dragStartX.current - ev.clientX;
      const newWidth = Math.min(600, Math.max(280, dragStartWidth.current + delta));
      setChatWidth(newWidth);
      saveChatWidth(newWidth);
    };
    const onUp = () => cleanup();
    const onLeave = () => cleanup();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.documentElement.addEventListener('mouseleave', onLeave);
  }, [chatWidth]);

  // 页面标题映射
  const pageTitles: Record<string, string> = {
    start: t('app.pageTitles.start'),
    scroll: t('app.pageTitles.scroll'),
    notes: t('app.pageTitles.notes'),
    charts: t('app.pageTitles.charts'),
    files: t('app.pageTitles.files'),
    extensions: t('app.pageTitles.extensions'),
    settings: t('app.pageTitles.settings'),
  };

  // 更新文档标题
  useEffect(() => {
    document.title = 'Papyrus Desktop';
  }, [activePage]);

  // 渲染当前页面
  const renderPage = () => {
    const pages: Record<string, React.ReactNode> = {
      start: <StartPage onDoneChange={setTodayDone} onNavigate={handlePageChange} />,
      scroll: <ScrollPage initialTag={initialScrollTag} onInitialTagUsed={() => setInitialScrollTag(undefined)} />,
      notes: <NotesPage />,
      charts: <ChartsPage />,
      files: <FilesPage />,
      extensions: <ExtensionsPage />,
      settings: <SettingsPage />,
    };

    const exitAnimationClass =
      animationDirection === 'up' ? 'motion-safe:tw-animate-page-exit-up' :
      animationDirection === 'down' ? 'motion-safe:tw-animate-page-exit-down' : '';

    const enterAnimationClass =
      animationDirection === 'up' ? 'motion-safe:tw-animate-page-up' :
      animationDirection === 'down' ? 'motion-safe:tw-animate-page-down' : '';

    const handleExitAnimationEnd = (e: React.AnimationEvent) => {
      if (e.animationName.includes('pageExitUp') || e.animationName.includes('pageExitDown')) {
        setPrevPage(null);
        if (nextPage) {
          setActivePage(nextPage);
          setNextPage(null);
        }
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }
    };

    const handleEnterAnimationEnd = () => {
      setAnimationDirection(null);
    };

    const isStartExiting = isTransitioning && prevPage === 'start';

    return (
      <>
        <div
          key={`page-${activePage}`}
          className={`tw-absolute tw-inset-0 tw-flex tw-flex-col ${isTransitioning && prevPage ? exitAnimationClass : (animationDirection ? enterAnimationClass : '')}`}
          onAnimationEnd={isTransitioning && prevPage ? handleExitAnimationEnd : (animationDirection ? handleEnterAnimationEnd : undefined)}
        >
          {activePage === 'start' && todayDone && (
            <div
              className={`tw-absolute tw-inset-x-0 tw-top-0 tw-h-[160px] tw-pointer-events-none tw-z-0 tw-bg-gradient-to-b tw-from-[rgba(232,255,234,0.45)] tw-to-transparent${isStartExiting ? ` ${exitAnimationClass}` : ''}`}
              aria-hidden="true"
            />
          )}
          {pages[activePage]}
        </div>
        {isTransitioning && nextPage && (
          <div
            key={`next-${nextPage}`}
            className="tw-absolute tw-inset-0 tw-flex tw-flex-col"
            style={{
              opacity: 0,
              animation: animationDirection ? (animationDirection === 'up' ? 'pageSlideUp 0.25s ease-out forwards' : 'pageSlideDown 0.25s ease-out forwards') : 'none',
              animationDelay: '0.05s',
            }}
          >
            {pages[nextPage]}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="tw-relative tw-flex tw-flex-col tw-mx-auto tw-w-full tw-h-screen tw-overflow-hidden tw-bg-arco-bg-1">
      {/* Skip Link - 无障碍导航（AA 级） */}
      <a 
        href="#main-content" 
        className="skip-link"
        aria-label={t('app.skipToMainContent')}
      >
        {t('app.skipToMainContent')}
      </a>
      
      {/* 返回顶部按钮 */}
      {activePage === 'start' && (
        <BackTop
          className="tw-absolute tw-bottom-12 tw-transition-[right] tw-duration-300 tw-ease-[ease]"
          visibleHeight={200}
          style={{ right: chatOpen ? chatWidth + 48 : 48 }}
          target={() => document.getElementById('start-page-scroll') ?? window as unknown as HTMLElement}
          aria-label={t('app.backToTop')}
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
          aria-label={`${pageTitles[activePage] || t('app.mainContent')}页面`}
        >
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
        <div
          className="tw-flex tw-flex-shrink-0 tw-overflow-hidden"
          style={{ width: chatOpen ? chatWidth + 4 : 0, opacity: chatOpen ? 1 : 0.01, transition: isDragging ? 'none' : 'width 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease' }}
          role="complementary"
          aria-label="AI 助手聊天面板"
        >
          <div
            className="tw-flex-shrink-0 tw-w-1 tw-cursor-ew-resize hover:tw-bg-arco-border-2 tw-transition-colors tw-duration-200"
            onMouseDown={onChatDragStart}
            role="separator"
            aria-orientation="vertical"
            aria-label="调整聊天面板宽度"
            tabIndex={0}
          />
          <ChatPanel
            open={chatOpen}
            width={chatWidth}
            onClose={() => setChatOpen(false)}
          />
        </div>
      </div>
      
      {/* 状态栏 */}
      <StatusBar />
    </div>
  );
};

export default App;
