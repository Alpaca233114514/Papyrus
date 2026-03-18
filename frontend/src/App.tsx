
import { useState, useRef, useCallback } from 'react';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import ChatPanel from './ChatPanel';
import StatusBar from './StatusBar';

const App = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(320);
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(0);

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
    <div style={{ width: '1440px', height: '900px', margin: '0 auto', background: 'var(--color-bg-1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <TitleBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} chatOpen={chatOpen} onChatToggle={() => setChatOpen(!chatOpen)} />
        <div style={{ flex: 1, overflow: 'auto' }}>
        </div>
        {chatOpen && (
          <div style={{ display: 'flex', flexShrink: 0 }}>
            <div
              style={{ width: 4, cursor: 'ew-resize', background: 'transparent', flexShrink: 0 }}
              onMouseDown={onChatDragStart}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-border-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            />
            <ChatPanel open={chatOpen} width={chatWidth} />
          </div>
        )}
      </div>
      <StatusBar />
    </div>
  );
};

export default App;
