import { Button, Space, Menu, Dropdown, Avatar, Modal, Message, Divider, Input, Popover } from '@arco-design/web-react';
import { IconMinus, IconExpand, IconClose, IconUser, IconUpload, IconRefresh } from '@arco-design/web-react/icon';
import './TitleBar.css';
import { api, type SearchResult } from './api';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import SearchBox from './SearchBox';
import { useShortcuts } from './hooks/useShortcuts';

// 快捷键提示组件 - 使用 Tailwind
const Shortcut = ({ keys }: { keys: string }) => (
  <span className="tw-ml-auto tw-pl-4 tw-text-arco-text-3 tw-text-xs tw-font-mono">
    {keys}
  </span>
);

interface UserProfile {
  userId: string;
  avatarUrl: string | null;
}

interface TitleBarProps {
  onPageChange?: (page: string) => void;
  onNewNote?: () => void;
  onSearchResult?: (result: SearchResult) => void;
}

const DEFAULT_PROFILE: UserProfile = {
  userId: '',
  avatarUrl: null,
};

const STORAGE_KEY = 'papyrus_user_profile';

const TitleBar = ({ onPageChange, onNewNote, onSearchResult }: TitleBarProps) => {
  const { t } = useTranslation();
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importContent, setImportContent] = useState('');
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [tempUserId, setTempUserId] = useState('');
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getShortcutDisplay } = useShortcuts();

  // 从 localStorage 加载用户设置
  useEffect(() => {
    const loadProfile = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as UserProfile;
          setUserProfile(parsed);
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    };
    loadProfile();
    window.addEventListener('papyrus_user_profile_changed', loadProfile);
    window.addEventListener('storage', loadProfile);
    return () => {
      window.removeEventListener('papyrus_user_profile_changed', loadProfile);
      window.removeEventListener('storage', loadProfile);
    };
  }, []);

  // 保存用户设置到 localStorage
  const saveUserProfile = (profile: UserProfile) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      setUserProfile(profile);
      window.dispatchEvent(new CustomEvent('papyrus_user_profile_changed'));
    } catch (error) {
      console.error('Failed to save user profile:', error);
      Message.error('保存用户设置失败');
    }
  };

  // 打开用户设置弹窗
  const handleOpenProfileModal = () => {
    setTempUserId(userProfile.userId);
    setTempAvatarUrl(userProfile.avatarUrl);
    setProfileModalVisible(true);
  };

  // 关闭弹窗并保存
  const handleCloseProfileModal = () => {
    const newProfile: UserProfile = {
      userId: tempUserId.trim(),
      avatarUrl: tempAvatarUrl,
    };
    saveUserProfile(newProfile);
    setProfileModalVisible(false);
    Message.success('用户设置已保存');
  };

  // 处理头像上传
  const handleAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      Message.error('请选择图片文件');
      return;
    }

    // 验证文件大小（最大 2MB）
    if (file.size > 2 * 1024 * 1024) {
      Message.error('图片大小不能超过 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setTempAvatarUrl(base64);
    };
    reader.readAsDataURL(file);

    // 清空 input 值，允许重复选择同一文件
    e.target.value = '';
  };

  // 恢复默认设置
  const handleResetDefault = () => {
    setTempUserId('');
    setTempAvatarUrl(null);
  };

  // 处理用户名称输入
  const handleUserIdChange = (value: string) => {
    // 最多10个字符
    if (value.length <= 10) {
      setTempUserId(value);
    }
  };

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
    if (onPageChange) {
      onPageChange('notes');
    }
    // 分派全局事件，让 NotesPage 进入创建模式
    window.dispatchEvent(new CustomEvent('papyrus_new_note'));
    Message.success('创建新笔记');
  };

  const handleNewCard = () => {
    if (onPageChange) {
      onPageChange('scroll');
    }
    // 分派全局事件，让 ScrollPage 进入创建模式
    window.dispatchEvent(new CustomEvent('papyrus_new_card'));
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
        Message.success(t('titleBar.importSuccess', { count: result.count }));
        setImportModalVisible(false);
        setImportContent('');
        window.dispatchEvent(new CustomEvent('papyrus_cards_changed'));
      }
    } catch (error) {
      Message.error(t('titleBar.importFailed') + ': ' + (error as Error).message);
    }
  };

  // 保存功能
  const handleSave = () => {
    Message.success(`${t('titleBar.saveSuccess')} (${getShortcutDisplay('save')})`);
  };

  const handleSaveAll = () => {
    Message.success(`${t('titleBar.saveAllSuccess')} (${getShortcutDisplay('saveAll')})`);
  };

  // 关闭功能
  const handleCloseEditor = () => {
    Message.info('关闭当前编辑器');
  };

  const handleExit = () => {
    Modal.confirm({
      title: t('titleBar.confirmExit'),
      content: t('titleBar.exitConfirmMessage'),
      onOk: () => {
        window.electronAPI?.quitApp?.();
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
      <Menu.SubMenu key="new" title={t('titleBar.new')} style={{ width: 260 }}>
        <Menu.Item key="new-note" onClick={handleNewNote} style={{ width: 260 }}>
          <span className="tw-flex tw-items-center tw-w-full">
            {t('titleBar.newNote')}
            <Shortcut keys={getShortcutDisplay('newNote')} />
          </span>
        </Menu.Item>
        <Menu.Item key="new-card" onClick={handleNewCard} style={{ width: 260 }}>
          <span className="tw-flex tw-items-center tw-w-full">
            {t('titleBar.newCard')}
            <Shortcut keys={getShortcutDisplay('newCard')} />
          </span>
        </Menu.Item>
        <Menu.Item key="new-window" onClick={handleNewWindow} style={{ width: 260 }}>
          <span className="tw-flex tw-items-center tw-w-full">
            {t('titleBar.newWindow')}
            <Shortcut keys={getShortcutDisplay('newWindow')} />
          </span>
        </Menu.Item>
      </Menu.SubMenu>

      <Divider style={{ margin: '4px 0' }} />

      {/* 打开组 */}
      <Menu.SubMenu key="open" title={t('titleBar.open')} style={{ width: 260 }}>
        <Menu.Item key="open-notes" onClick={handleOpenNotes} style={{ width: 260 }}>
          <span className="tw-flex tw-items-center tw-w-full">
            {t('titleBar.openNotes')}
            <Shortcut keys={getShortcutDisplay('openNotes')} />
          </span>
        </Menu.Item>
        <Menu.Item key="open-files" onClick={handleOpenFiles} style={{ width: 260 }}>
          <span className="tw-flex tw-items-center tw-w-full">
            {t('titleBar.openFiles')}
            <Shortcut keys={getShortcutDisplay('openFiles')} />
          </span>
        </Menu.Item>
        <Menu.Item key="open-review" onClick={handleOpenReview} style={{ width: 260 }}>
          <span className="tw-flex tw-items-center tw-w-full">
            {t('titleBar.openReview')}
            <Shortcut keys={getShortcutDisplay('openReview')} />
          </span>
        </Menu.Item>
        <Menu.SubMenu key="recent" title={t('titleBar.recentFiles')} style={{ width: 260 }}>
          <Menu.Item key="recent-empty" disabled style={{ width: 260 }}>{t('titleBar.noRecentFiles')}</Menu.Item>
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
      <Menu.Item key="undo" onClick={() => { try { document.execCommand('undo'); } catch { /* ignore */ } }}>
        <span className="tw-flex tw-items-center tw-w-full">
          撤销
          <Shortcut keys={getShortcutDisplay('undo')} />
        </span>
      </Menu.Item>
      <Menu.Item key="redo" onClick={() => { try { document.execCommand('redo'); } catch { /* ignore */ } }}>
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

  // 渲染头像内容
  const renderAvatar = (size: number = 28, avatarUrl: string | null, userId: string) => {
    if (avatarUrl) {
      return (
        <Avatar 
          size={size} 
          className="tw-cursor-pointer"
          style={{ fontSize: size * 0.4 }}
        >
          <img src={avatarUrl} alt={userId} />
        </Avatar>
      );
    }
    return (
      <Avatar 
        size={size} 
        className="tw-cursor-pointer"
        style={{ backgroundColor: '#206CCF', fontSize: size * 0.4 }} 
      >
        {(userId?.charAt(0) || '?').toUpperCase()}
      </Avatar>
    );
  };

  return (
    <>
      <div className="titlebar">
        <div className="titlebar-logo">
          <img src="./icon.png" alt="Papyrus" className="titlebar-logo-icon" />
        </div>

        <Space className="titlebar-menus no-drag" size={0}>
          <Dropdown trigger="click" droplist={fileMenu}>
            <Button type="text" size="small" className="titlebar-menu-item">{t('titleBar.file')}</Button>
          </Dropdown>
          <Dropdown trigger="click" droplist={editMenu}>
            <Button type="text" size="small" className="titlebar-menu-item">{t('titleBar.edit')}</Button>
          </Dropdown>
        </Space>

        {/* center search */}
        <div className="titlebar-center no-drag">
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
        <div className="titlebar-controls no-drag">
          <div className="titlebar-avatar no-drag" onClick={handleOpenProfileModal}>
            {renderAvatar(28, userProfile.avatarUrl, userProfile.userId)}
          </div>
          <button className="titlebar-btn no-drag" aria-label="最小化" onClick={() => window.electronAPI?.minimizeWindow?.()}>
            <IconMinus />
          </button>
          <button className="titlebar-btn no-drag" aria-label="最大化" onClick={() => window.electronAPI?.maximizeWindow?.()}>
            <IconExpand />
          </button>
          <button className="titlebar-btn titlebar-btn-close no-drag" aria-label="关闭" onClick={() => {
            const minimize = localStorage.getItem('papyrus_minimize_to_tray') === 'true';
            if (minimize) {
              window.electronAPI?.closeWindow?.();
            } else {
              window.electronAPI?.quitApp?.();
            }
          }}>
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

      {/* 用户设置对话框 */}
      <Modal
        title="用户设置"
        visible={profileModalVisible}
        onOk={handleCloseProfileModal}
        onCancel={() => setProfileModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <div className="tw-flex tw-flex-col tw-gap-6">
          {/* 头像上传区域 */}
          <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
            <div 
              className="tw-relative tw-cursor-pointer tw-group"
              onClick={handleAvatarUpload}
            >
              {renderAvatar(80, tempAvatarUrl, tempUserId)}
              <div className="tw-absolute tw-inset-0 tw-bg-black/40 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity">
                <IconUpload className="tw-text-white tw-text-xl" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="tw-hidden"
              onChange={handleFileChange}
              aria-label="选择头像图片"
            />
            <span className="tw-text-sm tw-text-arco-text-3">
              点击上传头像（最大 2MB）
            </span>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {/* 用户名称输入 */}
          <div className="tw-flex tw-flex-col tw-gap-2">
            <label className="tw-text-sm tw-font-medium tw-text-arco-text-1">
              用户标识
            </label>
            <Input
              value={tempUserId}
              onChange={handleUserIdChange}
              placeholder="请输入用户标识"
              maxLength={10}
              showWordLimit
            />
            <span className="tw-text-xs tw-text-arco-text-3">
              将显示为头像文字（最多10个字符）
            </span>
          </div>

          {/* 恢复默认按钮 */}
          <Button 
            type="secondary" 
            icon={<IconRefresh />}
            onClick={handleResetDefault}
            long
          >
            恢复默认设置
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default TitleBar;
