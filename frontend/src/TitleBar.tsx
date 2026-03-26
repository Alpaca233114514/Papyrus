import { Button, Space, Menu, Dropdown, Avatar, Modal, Message, Divider, Input } from '@arco-design/web-react';
import { IconMinus, IconExpand, IconClose } from '@arco-design/web-react/icon';
import './TitleBar.css';
import { api, type SearchResult } from './api';
import { useState } from 'react';
import SearchBox from './SearchBox';

// 快捷键提示组件
const Shortcut = ({ keys }: { keys: string }) => (
  <span style={{ 
    marginLeft: 'auto', 
    paddingLeft: '16px',
    color: 'var(--color-text-3)', 
    fontSize: '12px',
    fontFamily: 'Consolas, monospace'
  }}>
    {keys}
  </span>
);

interface TitleBarProps {
  onPageChange?: (page: string) => void;
  onNewNote?: () => void;
  onSearchResult?: (result: SearchResult) => void;
}

const TitleBar = ({ onPageChange, onNewNote, onSearchResult }: TitleBarProps) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importContent, setImportContent] = useState('');

  // 处理搜索结果点击
  const handleSearchResult = (result: SearchResult) => {
    if (onSearchResult) {
      onSearchResult(result);
    } else {
      // 默认行为：跳转到对应页面
      if (result.type === 'note') {
        onPageChange?.('notes');
      } else if (result.type === 'card') {
        onPageChange?.('scroll');
      }
    }
  };

  // 新建菜单项
  const handleNewNote = () => {
    if (onNewNote) {
      onNewNote();
    } else if (onPageChange) {
      onPageChange('notes');
    }
    Message.success('创建新笔记');
  };

  const handleNewCard = () => {
    if (onPageChange) {
      onPageChange('scroll');
    }
    Message.success('创建新卡片');
  };

  const handleNewWindow = () => {
    Message.info('新窗口功能开发中');
  };

  // 打开菜单项
  const handleOpenNotes = () => {
    if (onPageChange) {
      onPageChange('notes');
    }
  };

  const handleOpenFiles = () => {
    if (onPageChange) {
      onPageChange('files');
    }
  };

  const handleOpenReview = () => {
    if (onPageChange) {
      onPageChange('scroll');
    }
  };

  // 导入功能
  const handleImportTxt = () => {
    setImportModalVisible(true);
  };

  const handleConfirmImport = async () => {
    if (!importContent.trim()) {
      Message.error('请输入要导入的内容');
      return;
    }
    try {
      const result = await api.importTxt(importContent);
      if (result.success) {
        Message.success(`成功导入 ${result.count} 张卡片`);
        setImportModalVisible(false);
        setImportContent('');
      }
    } catch (error) {
      Message.error('导入失败: ' + (error as Error).message);
    }
  };

  // 保存功能
  const handleSave = () => {
    Message.success('保存成功 (Ctrl+S)');
  };

  const handleSaveAll = () => {
    Message.success('全部保存成功 (Ctrl+K S)');
  };

  // 关闭功能
  const handleCloseEditor = () => {
    Message.info('关闭当前编辑器');
  };

  const handleExit = () => {
    Modal.confirm({
      title: '确认退出',
      content: '确定要退出 Papyrus 吗？未保存的更改将会丢失。',
      onOk: () => {
        Message.success('退出应用');
        // 在实际应用中调用退出逻辑
        window.close();
      },
    });
  };

  // 首选项
  const handlePreferences = () => {
    Message.info('首选项功能开发中');
  };

  // 文件菜单下拉内容
  const fileMenu = (
    <Menu style={{ width: 280, maxHeight: 'none', overflow: 'visible' }}>
      {/* 新建组 */}
      <Menu.SubMenu key="new" title="新建">
        <Menu.Item key="new-note" onClick={handleNewNote}>
          <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            新建笔记
            <Shortcut keys="Ctrl+N" />
          </span>
        </Menu.Item>
        <Menu.Item key="new-card" onClick={handleNewCard}>
          <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            新建卡片
            <Shortcut keys="Ctrl+Shift+C" />
          </span>
        </Menu.Item>
        <Menu.Item key="new-window" onClick={handleNewWindow}>
          <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            新建窗口
            <Shortcut keys="Ctrl+Shift+N" />
          </span>
        </Menu.Item>
      </Menu.SubMenu>
      
      <Divider style={{ margin: '4px 0' }} />
      
      {/* 打开组 */}
      <Menu.SubMenu key="open" title="打开">
        <Menu.Item key="open-notes" onClick={handleOpenNotes}>
          <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            打开笔记页
            <Shortcut keys="Ctrl+O" />
          </span>
        </Menu.Item>
        <Menu.Item key="open-files" onClick={handleOpenFiles}>
          <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            打开文件库
            <Shortcut keys="Ctrl+K O" />
          </span>
        </Menu.Item>
        <Menu.Item key="open-review" onClick={handleOpenReview}>
          <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            开始复习
            <Shortcut keys="Ctrl+R" />
          </span>
        </Menu.Item>
        <Menu.SubMenu key="recent" title="打开最近的文件">
          <Menu.Item key="recent-empty" disabled>暂无最近文件</Menu.Item>
        </Menu.SubMenu>
      </Menu.SubMenu>
      
      <Divider style={{ margin: '4px 0' }} />
      
      {/* 导入/导出组 */}
      <Menu.Item key="import" onClick={handleImportTxt}>
        <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          从文本导入卡片...
          <Shortcut keys="Ctrl+Shift+I" />
        </span>
      </Menu.Item>
      
      <Divider style={{ margin: '4px 0' }} />
      
      {/* 保存组 */}
      <Menu.Item key="save" onClick={handleSave}>
        <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          保存
          <Shortcut keys="Ctrl+S" />
        </span>
      </Menu.Item>
      <Menu.Item key="save-all" onClick={handleSaveAll}>
        <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          全部保存
          <Shortcut keys="Ctrl+K S" />
        </span>
      </Menu.Item>
      
      <Divider style={{ margin: '4px 0' }} />
      
      {/* 首选项 */}
      <Menu.Item key="preferences" onClick={handlePreferences}>
        <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          首选项
          <Shortcut keys="Ctrl+," />
        </span>
      </Menu.Item>
      
      <Divider style={{ margin: '4px 0' }} />
      
      {/* 关闭组 */}
      <Menu.Item key="close-editor" onClick={handleCloseEditor}>
        <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          关闭编辑器
          <Shortcut keys="Ctrl+F4" />
        </span>
      </Menu.Item>
      <Menu.Item key="exit" onClick={handleExit}>
        <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          退出
          <Shortcut keys="Alt+F4" />
        </span>
      </Menu.Item>
    </Menu>
  );

  // 编辑菜单下拉内容
  const editMenu = (
    <Menu style={{ width: 240, maxHeight: 'none', overflow: 'visible' }}>
      <Menu.Item key="undo">
        <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          撤销
          <Shortcut keys="Ctrl+Z" />
        </span>
      </Menu.Item>
      <Menu.Item key="redo">
        <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          重做
          <Shortcut keys="Ctrl+Y" />
        </span>
      </Menu.Item>
      <Divider style={{ margin: '4px 0' }} />
      <Menu.Item key="cut">
        <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          剪切
          <Shortcut keys="Ctrl+X" />
        </span>
      </Menu.Item>
      <Menu.Item key="copy">
        <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          复制
          <Shortcut keys="Ctrl+C" />
        </span>
      </Menu.Item>
      <Menu.Item key="paste">
        <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          粘贴
          <Shortcut keys="Ctrl+V" />
        </span>
      </Menu.Item>
      <Divider style={{ margin: '4px 0' }} />
      <Menu.Item key="select-all">
        <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          全选
          <Shortcut keys="Ctrl+A" />
        </span>
      </Menu.Item>
      <Menu.Item key="find">
        <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          查找
          <Shortcut keys="Ctrl+F" />
        </span>
      </Menu.Item>
    </Menu>
  );

  // 关于菜单
  const aboutMenu = (
    <Menu>
      <Menu.Item key="about" onClick={() => Message.info('Papyrus v1.0.0 - SRS复习引擎')}>
        关于 Papyrus
      </Menu.Item>
      <Menu.Item key="check-update" onClick={() => Message.info('已是最新版本')}>
        检查更新
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <div className="titlebar">
        <Dropdown trigger="click" droplist={aboutMenu}>
          <div className="titlebar-logo">
            <img src="/icon.ico" alt="Papyrus" className="titlebar-logo-icon" />
          </div>
        </Dropdown>

        <Space className="titlebar-menus" size={0}>
          <Dropdown trigger="click" droplist={fileMenu}>
            <Button type="text" size="small" className="titlebar-menu-item">文件</Button>
          </Dropdown>
          <Dropdown trigger="click" droplist={editMenu}>
            <Button type="text" size="small" className="titlebar-menu-item">编辑</Button>
          </Dropdown>
        </Space>

        {/* center search */}
        <div className="titlebar-center">
          <SearchBox 
            onResultClick={handleSearchResult}
            onNavigateToNote={(noteId) => {
              onPageChange?.('notes');
              // 可以扩展为直接导航到特定笔记
            }}
            onNavigateToCard={() => onPageChange?.('scroll')}
          />
        </div>

        {/* window controls */}
        <div className="titlebar-controls">
          <div className="titlebar-avatar">
            <Avatar size={28} style={{ backgroundColor: 'rgb(32, 108, 207)', fontSize: 12, cursor: 'pointer' }} aria-label="用户头像">P</Avatar>
          </div>
          <button className="titlebar-btn" aria-label="最小化">
            <IconMinus />
          </button>
          <button className="titlebar-btn" aria-label="最大化">
            <IconExpand />
          </button>
          <button className="titlebar-btn titlebar-btn-close" aria-label="关闭">
            <IconClose />
          </button>
        </div>
      </div>

      {/* 导入对话框 */}
      <Modal
        title="从文本导入卡片"
        visible={importModalVisible}
        onOk={handleConfirmImport}
        onCancel={() => setImportModalVisible(false)}
        okText="导入"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ marginBottom: 8, color: 'var(--color-text-2)' }}>
            输入格式：<code>问题 === 答案</code>，每组一行
          </p>
          <Input.TextArea
            placeholder="例如：\n环境问题 A === 答案 A\n环境问题 B === 答案 B"
            aria-label="导入内容，格式：问题 === 答案"
            value={importContent}
            onChange={(value: string) => setImportContent(value)}
            rows={8}
          />
        </div>
      </Modal>
    </>
  );
};

export default TitleBar;