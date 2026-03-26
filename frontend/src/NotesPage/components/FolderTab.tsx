import { IconFolder } from '@arco-design/web-react/icon';
import { PRIMARY_COLOR } from '../constants';

interface FolderTabProps {
  folder: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

export const FolderTab = ({ folder, count, isActive, onClick }: FolderTabProps) => (
  <div
    onClick={onClick}
    style={{
      padding: '10px 20px',
      borderRadius: '10px',
      cursor: 'pointer',
      background: isActive ? `${PRIMARY_COLOR}15` : 'transparent',
      border: `1px solid ${isActive ? PRIMARY_COLOR : 'transparent'}`,
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minWidth: '120px',
      justifyContent: 'center',
      height: '52px',
      boxSizing: 'border-box' as const,
    }}
  >
    <IconFolder style={{ 
      fontSize: '16px', 
      color: isActive ? PRIMARY_COLOR : 'var(--color-text-3)' 
    }} />
    <div style={{ textAlign: 'center' }}>
      <div style={{ 
        fontSize: '14px', 
        fontWeight: isActive ? 500 : 400,
        color: isActive ? PRIMARY_COLOR : 'var(--color-text-1)',
      }}>
        {folder}
      </div>
      <div style={{ 
        fontSize: '11px', 
        color: 'var(--color-text-3)', 
        marginTop: '4px' 
      }}>
        {count} 篇
      </div>
    </div>
  </div>
);
