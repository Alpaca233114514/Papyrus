import { Typography, Button, BackTop } from '@arco-design/web-react';
import { useState, useEffect, useRef } from 'react';
import RecentScrolls from './RecentScrolls';
import RecentNotes from './RecentNotes';
import ReviewQueue from './ReviewQueue';
import { getSolarTerm, fetchSolarTerm } from './solarTerms';
import { type SceneryContent, fetchSceneryContent } from './sceneryContent';

/* ── 共享数据 ── */
function useStartPageData() {
  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 6 ? '夜深了' : hour < 12 ? '早安' : hour < 18 ? '下午好' : '晚上好';
  const dateLabel = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const [solarTerm, setSolarTerm] = useState<string | null>(() => getSolarTerm(today));
  const [scenery, setScenery] = useState<SceneryContent | null>(null);

  useEffect(() => {
    fetchSolarTerm(today).then(t => { if (t) setSolarTerm(t); });
    fetchSceneryContent().then(setScenery);
  }, []);

  // TODO: 替换为真实数据接口
  const stats = {
    cardsDue: 1,
    streakDays: 7,
    todayProgress: 20, // TODO: 接入学习进度 API
  };

  return { today, greeting, dateLabel, solarTerm, scenery, stats };
}

/* 窗景卡片高度常量，书架区复用 */
const CARD_HEIGHT_EXPR = 'calc(61.8vh - 128px)';

/* 动态测量窗景卡片高度，供书架区各列表复用 */
const useCardHeight = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(300);

  useEffect(() => {
    const measure = () => { if (ref.current) setHeight(ref.current.offsetHeight); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return { ref, height };
};

const ShelfSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: '48px' }}>
    <Typography.Text
      style={{ display: 'block', marginBottom: '24px', fontSize: '24px', color: 'var(--color-text-3)' }}
    >
      {label}
    </Typography.Text>
    {children}
  </div>
);

/* 书架区三个分区 */
const ShelfSections = () => {
  const { ref, height } = useCardHeight();
  return (
    <>
      <div ref={ref} style={{ height: CARD_HEIGHT_EXPR, visibility: 'hidden', position: 'absolute', pointerEvents: 'none' }} />
      <ShelfSection label='待复习'>
        <ReviewQueue height={height} />
      </ShelfSection>
      <ShelfSection label='最近使用的卷帙'>
        <RecentScrolls height={height} />
      </ShelfSection>
      <ShelfSection label='最近使用的笔记'>
        <RecentNotes height={height} />
      </ShelfSection>
    </>
  );
};

/* ── 共享卡片外壳 ── */
const cardStyle: React.CSSProperties = {
  position: 'absolute',
  top: '152px',
  left: '64px',
  right: '64px',
  height: CARD_HEIGHT_EXPR,
  border: '1px solid var(--color-text-3)',
  borderRadius: '16px',
  overflow: 'hidden',
};

/* ── 窗棂 SVG 背景 ── */
const LatticeBackground = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='100%'
    height='100%'
    style={{ position: 'absolute', inset: 0 }}
  >
    <defs>
      <pattern id='lattice' x='0' y='0' width='48' height='48' patternUnits='userSpaceOnUse'>
        {/* 横线 */}
        <line x1='0' y1='0' x2='64' y2='0' stroke='var(--color-text-3)' strokeWidth='0.5' strokeOpacity='0.25' />
        <line x1='0' y1='32' x2='64' y2='32' stroke='var(--color-text-3)' strokeWidth='0.5' strokeOpacity='0.25' />
        <line x1='0' y1='64' x2='64' y2='64' stroke='var(--color-text-3)' strokeWidth='0.5' strokeOpacity='0.25' />
        {/* 竖线 */}
        <line x1='0' y1='0' x2='0' y2='64' stroke='var(--color-text-3)' strokeWidth='0.5' strokeOpacity='0.25' />
        <line x1='32' y1='0' x2='32' y2='64' stroke='var(--color-text-3)' strokeWidth='0.5' strokeOpacity='0.25' />
        <line x1='64' y1='0' x2='64' y2='64' stroke='var(--color-text-3)' strokeWidth='0.5' strokeOpacity='0.25' />
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(#lattice)' />
  </svg>
);

/* ── 未完成状态 ── */
const PendingCard = ({ stats, greeting, dateLabel, solarTerm, scenery }: {
  stats: { cardsDue: number; streakDays: number; todayProgress: number };
  greeting: string;
  dateLabel: string;
  solarTerm: string | null;
  scenery: SceneryContent | null;
}) => {
  const [btnHovered, setBtnHovered] = useState(false);
  const [btnActive, setBtnActive] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {/* 窗棂背景（无画作时展示） */}
      <LatticeBackground />

      {/* 左上：主文案 + 进度 */}
      <div style={{ position: 'relative', zIndex: 1, padding: '24px' }}>
        <Typography.Paragraph type='secondary' spacing='close' style={{ margin: 0, fontSize: '48px', fontWeight: 600 }}>
          你有 <Typography.Text bold>{stats.cardsDue}</Typography.Text> 张卡片待复习
        </Typography.Paragraph>
        <Typography.Text className='scenery-sub-text' style={{ fontSize: '24px' }}>
          已连续精进 {stats.streakDays} 天 | 今日目标已完成 {stats.todayProgress}%
        </Typography.Text>
      </div>

      {/* 底部：日期左下，按钮右下 */}
      <div style={{ position: 'relative', zIndex: 1, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Typography.Text className='scenery-sub-text' style={{ fontSize: '24px', fontWeight: 600 }}>
          {greeting}，学习者。今天是 {dateLabel}{solarTerm ? `，${solarTerm}` : ''}。
        </Typography.Text>
        <Button
          shape='round'
          size='large'
          type={btnHovered || btnActive ? 'primary' : 'secondary'}
          style={{
            backgroundColor: btnHovered || btnActive ? '#206CCF' : undefined,
            borderColor: btnHovered || btnActive ? '#206CCF' : undefined,
            overflow: 'hidden',
            position: 'relative',
            padding: '0 32px',
            height: '48px',
            fontSize: '16px',
          }}
          onMouseEnter={() => { setBtnHovered(true); setRippleKey(k => k + 1); }}
          onMouseLeave={() => setBtnHovered(false)}
          onClick={() => setBtnActive(v => !v)}
        >
          {btnHovered && (
            <span
              key={rippleKey}
              className='start-btn-ripple'
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width: '100%', aspectRatio: '1',
                borderRadius: '50%',
                background: '#206CCF',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
          )}
          <span style={{ position: 'relative', zIndex: 1 }}>开始</span>
        </Button>
      </div>
    </div>
  );
};

/* ── 已完成状态 ── */
const DoneCard = ({ scenery }: { scenery: SceneryContent | null }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...cardStyle, position: 'absolute' }}
    >
      {/* 窗景图片 */}
      <img
        src={scenery?.image ?? '/scenery/image.png'}
        alt=''
        className={`scenery-img${hovered ? ' expanded' : ''}`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* 主文案：淡出 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1, padding: '24px',
        opacity: hovered ? 0 : 1,
        transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: hovered ? 'none' : 'auto',
      }}>
        <Typography.Paragraph type='secondary' spacing='close' style={{ margin: 0, fontSize: '48px', fontWeight: 600 }}>
          恭喜你，今日任务已完成！
        </Typography.Paragraph>
      </div>

      {/* 诗句：悬停淡入，竖排，定位在左侧 38.2% */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: '38.2%',
        zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        opacity: (hovered && !!scenery) ? 1 : 0,
        transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'none',
      }}>
        <div style={{
          display: 'flex', flexDirection: 'row-reverse', alignItems: 'flex-start',
          gap: '12px', height: '90%', maxHeight: '90%', overflow: 'hidden',
        }}>
          <div style={{
            writingMode: 'vertical-rl',
            fontFamily: '"Noto Serif SC", "Source Han Serif SC", "STSong", serif',
            fontSize: '18px', fontWeight: 400, letterSpacing: '0.3em',
            color: '#2C2C2C', lineHeight: 1.6,
            height: '100%', overflow: 'hidden',
          }}>
            {scenery?.poem ?? ''}
          </div>
          {scenery?.source && (
            <div style={{
              writingMode: 'vertical-rl',
              fontFamily: '"Noto Serif SC", "Source Han Serif SC", "STSong", serif',
              fontSize: '14px', fontWeight: 400, letterSpacing: '0.15em',
              color: 'var(--color-text-3)', lineHeight: 1.6, overflow: 'hidden',
            }}>
              {'——'}{scenery.source}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── 页面入口 ── */
const StartPage = ({ onDoneChange }: { onDoneChange?: (done: boolean) => void }) => {
  const data = useStartPageData();
  const done = false; // TODO: 接入真实完成状态

  useEffect(() => { onDoneChange?.(done); }, [done]);

  return (
    <div id='start-page-scroll' style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>

            

      {/* ── 第一屏：开始区 ── */}
      <div style={{ position: 'relative', height: '61.8vh', padding: '64px 0 0 64px' }}>
        <Typography.Title heading={1} style={{ fontWeight: 400, lineHeight: 1, margin: 0, fontSize: '56px' }}>开始</Typography.Title>

        {done
          ? <DoneCard scenery={data.scenery} />
          : <PendingCard {...data} />
        }
      </div>

      {/* ── 第二屏：书架区 ── */}
      <div style={{ padding: '64px 64px 0 64px' }}>
        <Typography.Title
          heading={2}
          style={{ fontWeight: 400, lineHeight: 1, margin: 0, marginBottom: '48px', fontSize: '32px' }}
        >
          书架
        </Typography.Title>

        <ShelfSections />

        <div style={{ height: '64px' }} />
      </div>

      <style>{`
        @property --mask-start {
          syntax: '<percentage>';
          inherits: false;
          initial-value: 61.8%;
        }
        .scenery-img {
          --mask-start: 61.8%;
          mask-image: linear-gradient(to right, transparent var(--mask-start), black 100%);
          -webkit-mask-image: linear-gradient(to right, transparent var(--mask-start), black 100%);
          transition: --mask-start 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .scenery-img.expanded {
          --mask-start: 38.2%;
        }
        .scenery-sub-text {
          color: #888;
        }
        body[arco-theme='dark'] .scenery-sub-text {
          color: #666;
        }
        @keyframes spread {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(8); opacity: 1; }
        }
        .start-btn-ripple {
          animation: spread 1s ease-out forwards;
        }
        /* 隐藏横向滚动条但保留滚动功能 */
        #start-page-scroll ::-webkit-scrollbar {
          height: 0;
        }
      `}</style>
    </div>
  );
};

export default StartPage;