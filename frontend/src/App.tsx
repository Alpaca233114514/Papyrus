
import { useState } from 'react';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import ChatPanel from './ChatPanel';
import StatusBar from './StatusBar';

const App = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div style={{ width: '1440px', height: '900px', margin: '0 auto', background: 'var(--color-bg-1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <TitleBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} chatOpen={chatOpen} onChatToggle={() => setChatOpen(!chatOpen)} />
        <div style={{ flex: 1, overflow: 'auto' }}>
        </div>
        <ChatPanel open={chatOpen} />
      </div>
      <StatusBar />
    </div>
  );
};

export default App;
