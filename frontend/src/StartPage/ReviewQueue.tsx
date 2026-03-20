import { Typography } from '@arco-design/web-react';
import { useState } from 'react';

interface ReviewItem {
  id: string;
  collectionTitle: string; // 所属卷帙
  scrollCount: number;     // 待复习卷轴数
  estimatedMinutes: number;
  // i18n: reserved for future localization
}

const MOCK_REVIEW: ReviewItem[] = [
  { id: '1', collectionTitle: '高等数学', scrollCount: 12, estimatedMinutes: 8 },
  { id: '2', collectionTitle: '日本語 N2', scrollCount: 31, estimatedMinutes: 20 },
  { id: '3', collectionTitle: '操作系统', scrollCount: 5, estimatedMinutes: 4 },
];

const ReviewCard = ({ item }: { item: ReviewItem }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '0 0 auto',
        width: '220px',
        height: '100%',
        borderRadius: '16px',
        border: `1px solid ${hovered ? '#206CCF' : 'var(--color-text-3)'}`,
        background: hovered ? '#206CCF0f' : 'transparent',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{
          display: 'inline-flex',
          alignSelf: 'flex-start',
          background: '#206CCF',
          color: '#fff',
          borderRadius: '999px',
          padding: '2px 10px',
          fontSize: '12px',
          fontWeight: 600,
          lineHeight: '20px',
        }}>
          {item.scrollCount} 待复习
        </div>
        <Typography.Text bold style={{ fontSize: '18px', lineHeight: 1.3 }}>
          {item.collectionTitle}
        </Typography.Text>
      </div>

      <Typography.Text type='secondary' style={{ fontSize: '13px' }}>
        约 {item.estimatedMinutes} 分钟
      </Typography.Text>
    </div>
  );
};

interface ReviewQueueProps {
  height: number;
}

const ReviewQueue = ({ height }: ReviewQueueProps) => (
  <div style={{
    display: 'flex',
    flexDirection: 'row',
    gap: '16px',
    height: `${height}px`,
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingBottom: '4px',
  }}>
    {MOCK_REVIEW.map(r => (
      <ReviewCard key={r.id} item={r} />
    ))}
  </div>
);

export default ReviewQueue;