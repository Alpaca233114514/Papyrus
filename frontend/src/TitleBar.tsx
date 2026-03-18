import { Input, Button, Space, Menu, Dropdown, Avatar } from '@arco-design/web-react';
import { IconMinus, IconExpand, IconClose, IconSearch } from '@arco-design/web-react/icon';
import './TitleBar.css';

const TitleBar = () => {
  return (
    <div className="titlebar">
      <Dropdown
        trigger="click"
        droplist={
          <Menu>
            <Menu.Item key="about">关于</Menu.Item>
          </Menu>
        }
      >
        <div className="titlebar-logo">
          <img src="/icon.ico" alt="Papyrus" className="titlebar-logo-icon" />
        </div>
      </Dropdown>

      <Space className="titlebar-menus" size={0}>
        <Button type="text" size="small" className="titlebar-menu-item">文件</Button>
        <Button type="text" size="small" className="titlebar-menu-item">编辑</Button>
      </Space>

      {/* center search */}
      <div className="titlebar-center">
        <Input
          className="titlebar-search"
          placeholder="搜索"
          prefix={<IconSearch />}
          size="small"
          readOnly
        />
      </div>

      {/* avatar + window controls */}
      <div className="titlebar-avatar">
        <Avatar size={28} style={{ backgroundColor: 'rgb(32, 108, 207)', fontSize: 12, cursor: 'pointer' }}>P</Avatar>
      </div>
      <div className="titlebar-controls">
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
  );
};

export default TitleBar;