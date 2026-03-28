import { Button, Space, Menu, Dropdown, Avatar, Modal, Message, Divider, Input } from '@arco-design/web-react';
import { IconMinus, IconExpand, IconClose } from '@arco-design/web-react/icon';
import './TitleBar.css';
import { api, type SearchResult } from './api';
import { useState } from 'react';
import SearchBox from './SearchBox';
import { useShortcuts } from './hooks/useShortcuts';

// 快捷键提示组件 - 使用 Tailwind
const Shortcut = ({ keys }: { keys: string }) => (
  <span className="tw-ml-auto tw-pl-4 tw-text-arco-text-3 tw-text-xs tw-font-mono">
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
  const { getShortcutDisplay } = useShortcuts();

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
    Message.success(`保存成功 (${getShortcutDisplay('save')})`);
  };

  const handleSaveAll = () => {
    Message.success(`全部保存成功 (${getShortcutDisplay('saveAll')})`);
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
      <Menu.SubMenu key="new" title="新建" style={{ width: 260 }}>
        <Menu.Item key="new-note" onClick={handleNewNote} style={{ width: 260 }}>
          <span className="tw-flex tw-items-center tw-w-full">
            新建笔记
            <Shortcut keys={getShortcutDisplay('newNote')} />
          </span>
        </Menu.Item>
        <Menu.Item key="new-card" onClick={handleNewCard} style={{ width: 260 }}>
          <span className="tw-flex tw-items-center tw-w-full">
            新建卡片
            <Shortcut keys={getShortcutDisplay('newCard')} />
          </span>
        </Menu.Item>
        <Menu.Item key="new-window" onClick={handleNewWindow} style={{ width: 260 }}>
          <span className="tw-flex tw-items-center tw-w-full">
            新建窗口
            <Shortcut keys={getShortcutDisplay('newWindow')} />
          </span>
        </Menu.Item>
      </Menu.SubMenu>
      
      <Divider style={{ margin: '4px 0' }} />
      
      {/* 打开组 */}
      <Menu.SubMenu key="open" title="打开" style={{ width: 260 }}>
        <Menu.Item key="open-notes" onClick={handleOpenNotes} style={{ width: 260 }}>
          <span className="tw-flex tw-items-center tw-w-full">
            打开笔记页
            <Shortcut keys={getShortcutDisplay('openNotes')} />
          </span>
        </Menu.Item>
        <Menu.Item key="open-files" onClick={handleOpenFiles} style={{ width: 260 }}>
          <span className="tw-flex tw-items-center tw-w-full">
            打开文件库
            <Shortcut keys={getShortcutDisplay('openFiles')} />
          </span>
        </Menu.Item>
        <Menu.Item key="open-review" onClick={handleOpenReview} style={{ width: 260 }}>
          <span className="tw-flex tw-items-center tw-w-full">
            开始复习
            <Shortcut keys={getShortcutDisplay('openReview')} />
          </span>
        </Menu.Item>
        <Menu.SubMenu key="recent" title="打开最近的文件" style={{ width: 260 }}>
          <Menu.Item key="recent-empty" disabled style={{ width: 260 }}>暂无最近文件</Menu.Item>
        </Menu.SubMenu>
      </Menu.SubMenu>
      
      <Divider style={{ margin: '4px 0' }} />
      
      {/* 导入/导出组 */}
      <Menu.Item key="import" onClick={handleImportTxt}>
        <span className="tw-flex tw-items-center tw-w-full">
          从文本导入卡片...
          <Shortcut keys={getShortcutDisplay('importTxt')} />
        </span>
      </Menu.Item>
      
      <Divider style={{ margin: '4px 0' }} />
      
      {/* 保存组 */}
      <Menu.Item key="save" onClick={handleSave}>
        <span className="tw-flex tw-items-center tw-w-full">
          保存
          <Shortcut keys={getShortcutDisplay('save')} />
        </span>
      </Menu.Item>
      <Menu.Item key="save-all" onClick={handleSaveAll}>
        <span className="tw-flex tw-items-center tw-w-full">
          全部保存
          <Shortcut keys={getShortcutDisplay('saveAll')} />
        </span>
      </Menu.Item>
      
      <Divider style={{ margin: '4px 0' }} />
      
      {/* 首选项 */}
      <Menu.Item key="preferences" onClick={handlePreferences}>
        <span className="tw-flex tw-items-center tw-w-full">
          首选项
          <Shortcut keys={getShortcutDisplay('preferences')} />
        </span>
      </Menu.Item>
      
      <Divider style={{ margin: '4px 0' }} />
      
      {/* 关闭组 */}
      <Menu.Item key="close-editor" onClick={handleCloseEditor}>
        <span className="tw-flex tw-items-center tw-w-full">
          关闭编辑器
          <Shortcut keys={getShortcutDisplay('closeEditor')} />
        </span>
      </Menu.Item>
      <Menu.Item key="exit" onClick={handleExit}>
        <span className="tw-flex tw-items-center tw-w-full">
          退出
          <Shortcut keys={getShortcutDisplay('exit')} />
        </span>
      </Menu.Item>
    </Menu>
  );

  // 编辑菜单下拉内容
  const editMenu = (
    <Menu style={{ width: 240, maxHeight: 'none', overflow: 'visible' }}>
      <Menu.Item key="undo">
        <span className="tw-flex tw-items-center tw-w-full">
          撤销
          <Shortcut keys={getShortcutDisplay('undo')} />
        </span>
      </Menu.Item>
      <Menu.Item key="redo">
        <span className="tw-flex tw-items-center tw-w-full">
          重做
          <Shortcut keys={getShortcutDisplay('redo')} />
        </span>
      </Menu.Item>
      <Divider style={{ margin: '4px 0' }} />
      <Menu.Item key="cut">
        <span className="tw-flex tw-items-center tw-w-full">
          剪切
          <Shortcut keys={getShortcutDisplay('cut')} />
        </span>
      </Menu.Item>
      <Menu.Item key="copy">
        <span className="tw-flex tw-items-center tw-w-full">
          复制
          <Shortcut keys={getShortcutDisplay('copy')} />
        </span>
      </Menu.Item>
      <Menu.Item key="paste">
        <span className="tw-flex tw-items-center tw-w-full">
          粘贴
          <Shortcut keys={getShortcutDisplay('paste')} />
        </span>
      </Menu.Item>
      <Divider style={{ margin: '4px 0' }} />
      <Menu.Item key="select-all">
        <span className="tw-flex tw-items-center tw-w-full">
          全选
          <Shortcut keys={getShortcutDisplay('selectAll')} />
        </span>
      </Menu.Item>
      <Menu.Item key="find">
        <span className="tw-flex tw-items-center tw-w-full">
          查找
          <Shortcut keys={getShortcutDisplay('find')} />
        </span>
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <div className="titlebar">
        <div className="titlebar-logo">
          <img src="/icon.ico" alt="Papyrus" className="titlebar-logo-icon" />
        </div>

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
            <Avatar 
              size={28} 
              className="tw-cursor-pointer"
              style={{ backgroundColor: 'rgb(32, 108, 207)', fontSize: 12 }} 
              aria-label="用户头像"
            >
              P
            </Avatar>
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
        <div className="tw-mb-4">
          <p className="tw-mb-2 tw-text-arco-text-2">
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
