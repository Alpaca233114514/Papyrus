import { useState } from 'react';
import {
  Button,
  Typography,
  Message,
  Spin,
  Modal,
  Input,
  Popconfirm,
} from '@arco-design/web-react';
import {
  IconArrowLeft,
  IconSafe,
  IconStorage,
  IconDelete,
  IconCloud,
  IconFolder,
  IconDownload,
} from '@arco-design/web-react/icon';
import { api } from '../../api';
import { SettingItem } from '../components';
import { useScrollNavigation } from '../../hooks/useScrollNavigation';

const { Title, Text, Paragraph } = Typography;

interface DataViewProps {
  onBack: () => void;
}

const NAV_ITEMS = [
  { key: 'backup-section', label: '备份与恢复', icon: IconSafe },
  { key: 'storage-section', label: '存储管理', icon: IconStorage },
];

const DataView = ({ onBack }: DataViewProps) => {
  const { contentRef, activeSection, scrollToSection } = useScrollNavigation(NAV_ITEMS);
  const [loading, setLoading] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [vaultPath, setVaultPath] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const result = await api.createBackup();
      if (result.success) {
        Message.success(`备份成功: ${result.path}`);
      } else {
        Message.error('备份失败');
      }
    } catch (err) {
      Message.error(`备份失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const result = await api.exportData();
      const dataStr = JSON.stringify(result, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `papyrus_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Message.success('导出成功');
    } catch (err) {
      Message.error(`导出失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportObsidian = async () => {
    if (!vaultPath.trim()) {
      Message.error('请输入 Vault 路径');
      return;
    }
    setLoading(true);
    try {
      const result = await api.importObsidian(vaultPath.trim());
      Message.success(`导入完成: ${result.imported} 条已导入, ${result.skipped} 条已跳过`);
      setImportModalVisible(false);
      setVaultPath('');
    } catch (err) {
      Message.error(`导入失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setResetLoading(true);
    try {
      const res = await fetch('/api/data/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        Message.success('所有数据已重置');
        window.dispatchEvent(new CustomEvent('papyrus_cards_changed'));
        window.dispatchEvent(new CustomEvent('papyrus_notes_changed'));
      } else {
        Message.error(data.error || '重置失败');
      }
    } catch (err) {
      Message.error(`重置失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      overflow: 'hidden',
      position: 'relative',
      background: 'var(--color-bg-1)',
      height: '100%',
    }}>
      <div style={{
        width: 200,
        height: '100%',
        borderRight: '1px solid var(--color-border-2)',
        background: 'var(--color-bg-1)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        <div style={{
          padding: 16,
          borderBottom: '1px solid var(--color-border-2)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Button
            type="text"
            icon={<IconArrowLeft />}
            onClick={onBack}
            style={{ padding: 0, fontSize: 14 }}
          />
          <Text style={{ fontSize: '14px', fontWeight: 500 }}>数据设置</Text>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const isActive = activeSection === key;
            return (
              <button
                key={key}
                onClick={() => scrollToSection(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderRadius: 8,
                  marginBottom: 4,
                  background: isActive ? 'var(--color-primary-light)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-1)',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  userSelect: 'none',
                }}
              >
                <Icon style={{ fontSize: 16 }} />
                <Text style={{ 
                  fontSize: 13, 
                  color: isActive ? 'var(--color-primary)' : 'inherit',
                  fontWeight: isActive ? 500 : 400,
                }}>{label}</Text>
              </button>
            );
          })}
        </div>
      </div>

      <div 
        ref={contentRef}
        onWheel={(e) => e.stopPropagation()}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '32px 48px',
        }}
      >
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <IconSafe style={{ fontSize: 32, color: 'var(--color-primary)' }} />
            <Title heading={2} style={{ margin: 0, fontWeight: 400, fontSize: '28px' }}>
              数据设置
            </Title>
          </div>
          <Paragraph type="secondary">
            管理数据备份、恢复和存储
          </Paragraph>
        </div>

        <div id="backup-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>备份与恢复</Title>
          </div>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <SettingItem title="创建备份" desc="立即备份所有数据到本地文件">
              <Button 
                type="primary" 
                shape="round"
                onClick={handleBackup}
                disabled={loading}
              >
                {loading ? <Spin size={14} /> : '立即备份'}
              </Button>
            </SettingItem>

            <SettingItem title="导出数据" desc="导出为 JSON 或 Markdown 文件">
              <Button 
                shape="round"
                onClick={handleExport}
                disabled={loading}
              >
                {loading ? <Spin size={14} /> : '导出数据'}
              </Button>
            </SettingItem>

            <SettingItem title="从 Obsidian 导入" desc="导入 Obsidian Vault 中的 Markdown 文件">
              <Button 
                shape="round"
                onClick={() => setImportModalVisible(true)}
                disabled={loading}
              >
                导入
              </Button>
            </SettingItem>

            <SettingItem title="重置所有数据" desc="永久删除所有数据，不可恢复" divider={false}>
              <Popconfirm
                title="确认重置"
                content="确定要重置所有数据吗？此操作不可恢复！"
                onOk={handleReset}
              >
                <Button status="danger" shape="round" loading={resetLoading}>
                  重置
                </Button>
              </Popconfirm>
            </SettingItem>
          </div>

          <div className="settings-tip">
            <IconSafe style={{ color: 'var(--color-success)' }} />
            <Text type="secondary" style={{ fontSize: 13 }}>
              建议定期备份数据，以防止意外丢失
            </Text>
          </div>
        </div>

        <div id="storage-section" style={{ marginBottom: 48, scrollMarginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Title heading={4} style={{ margin: 0, fontSize: 20 }}>存储管理</Title>
          </div>

          <div className="settings-section" style={{ 
            background: 'var(--color-bg-2)', 
            borderRadius: 8, 
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <SettingItem title="本地存储" desc="使用本地文件系统存储数据">
              <Button shape="round" onClick={() => window.electronAPI?.openDataFolder?.()}>
                查看位置
              </Button>
            </SettingItem>

            <SettingItem title="云同步" desc="同步数据到云端（即将推出）" divider={false}>
              <Button shape="round" disabled>
                即将推出
              </Button>
            </SettingItem>
          </div>
        </div>

        <div style={{ height: 'calc(100vh - 200px)', flexShrink: 0 }} />
      </div>

      <Modal
        title="从 Obsidian 导入"
        visible={importModalVisible}
        onOk={handleImportObsidian}
        onCancel={() => {
          setImportModalVisible(false);
          setVaultPath('');
        }}
        okText="导入"
        cancelText="取消"
        confirmLoading={loading}
      >
        <div style={{ marginTop: 16 }}>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            请输入 Obsidian Vault 的完整路径，系统将导入其中的 Markdown 文件。
          </Paragraph>
          <Input
            value={vaultPath}
            onChange={setVaultPath}
            placeholder="例如: C:\Users\用户名\Documents\Obsidian Vault"
            disabled={loading}
          />
        </div>
      </Modal>
    </div>
  );
};

export default DataView;
