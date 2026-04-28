import { Typography, Button, Message } from '@arco-design/web-react';
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import RecentScrolls from './RecentScrolls';
import RecentNotes from './RecentNotes';
import ReviewQueue from './ReviewQueue';
import { getSolarTerm, fetchSolarTerm } from './solarTerms';
import { type SceneryContent, fetchSceneryContent } from './sceneryContent';
import FlashcardStudy from '../ScrollPage/FlashcardStudy';
import { api } from '../api';


type StartPageStats = {
  cardsDue: number;
  totalCards: number;
  streakDays: number;
  todayProgress: number;
};

type StartPageData = {
  greeting: string;
  dateLabel: string;
  solarTerm: string | null;
  scenery: SceneryContent | null;
  stats: StartPageStats;
  loading: boolean;
};

type StartPageProps = {
  onDoneChange?: (done: boolean) => void;
  onNavigate?: (page: string) => void;
};

type PendingCardProps = {
  stats: StartPageStats;
  greeting: string;
  dateLabel: string;
  solarTerm: string | null;
  loading: boolean;
  onStartStudy?: () => void;
};

const PRIMARY_COLOR = '#206CCF';
const SECONDARY_COLOR = '#9FD4FD';
const CARD_HEIGHT_EXPR = 'calc(61.8vh - 128px)';



const cardStyle: CSSProperties = {
  position: 'absolute',
  top: '152px',
  left: '64px',
  right: '64px',
  height: CARD_HEIGHT_EXPR,
  border: '1px solid var(--color-text-3)',
  borderRadius: '16px',
  overflow: 'hidden',
  transform: 'translateZ(0)',
};

function getGreeting(hour: number): string {
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早安';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function formatDateLabel(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function useStartPageData(): StartPageData {
  const [today] = useState(() => new Date());
  const [solarTerm, setSolarTerm] = useState<string | null>(() => getSolarTerm(today));
  const [scenery, setScenery] = useState<SceneryContent | null>(null);
  const [stats, setStats] = useState<StartPageStats>({
    cardsDue: 0,
    totalCards: 0,
    streakDays: 7,
    todayProgress: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [remoteSolarTerm, nextScenery, nextDueRes] = await Promise.all([
          fetchSolarTerm(today),
          fetchSceneryContent(),
          api.nextDue(),
        ]);

        if (cancelled) return;

        if (remoteSolarTerm) {
          setSolarTerm(remoteSolarTerm);
        }

        setScenery(nextScenery);

        // 获取真实统计数据 — 后端字段缺失时回落 0,避免渲染 undefined 导致空白
        if (nextDueRes.success) {
          const dueCount = nextDueRes.due_count ?? 0;
          const totalCount = nextDueRes.total_count ?? 0;
          setStats({
            cardsDue: dueCount,
            totalCards: totalCount,
            streakDays: 7,
            todayProgress: totalCount > 0
              ? Math.round(((totalCount - dueCount) / totalCount) * 100)
              : 100,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setScenery(null);
          const msg = err instanceof Error ? err.message : '获取数据失败';
          Message.error(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [today]);

  return {
    greeting: getGreeting(today.getHours()),
    dateLabel: formatDateLabel(today),
    solarTerm,
    scenery,
    stats,
    loading,
  };
}

function useCardHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(300);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      setHeight(element.offsetHeight);
    };

    measure();

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measure)
      : null;

    observer?.observe(element);
    window.addEventListener('resize', measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return { ref, height };
}

const ShelfSection = ({ label, children }: { label: string; children: ReactNode }) => (
  <section style={{ marginBottom: '48px' }}>
    <Typography.Title
      heading={3}
      style={{
        fontWeight: 200,
        lineHeight: 1,
        margin: '0 0 24px 0',
        padding: 0,
        fontSize: '16px',
        color: 'var(--color-text-3)',
      }}
    >
      {label}
    </Typography.Title>
    {children}
  </section>
);

const ShortcutCard = ({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      style={{
        flex: '0 0 auto',
        width: '160px',
        height: '100px',
        borderRadius: '16px',
        border: `2px solid ${hovered ? SECONDARY_COLOR : 'var(--color-text-3)'}`,
        background: hovered ? `${PRIMARY_COLOR}08` : 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
        boxSizing: 'border-box' as const,
      }}
    >
      <div style={{ fontSize: '28px', color: hovered ? PRIMARY_COLOR : 'var(--color-text-3)' }}>
        {icon}
      </div>
      <Typography.Text
        type={hovered ? 'primary' : 'secondary'}
        style={{ fontSize: '14px', fontWeight: 500 }}
      >
        {label}
      </Typography.Text>
    </div>
  );
};

const shelfContainerStyle = {
  display: 'flex',
  flexDirection: 'row' as const,
  gap: '16px',
  overflowX: 'auto' as const,
  overflowY: 'hidden' as const,
  paddingBottom: '8px',
};

const ShelfSections = ({ onStudyTag, onNavigate }: { onStudyTag?: (tag: string) => void; onNavigate?: (page: string) => void }) => {
  const { ref, height } = useCardHeight();

  return (
    <>
      <div
        ref={ref}
        style={{
          position: 'absolute',
          height: CARD_HEIGHT_EXPR,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      />

      {onNavigate && (
        <ShelfSection label='快捷方式'>
          <div style={shelfContainerStyle}>
            <ShortcutCard
              icon={<span style={{ fontSize: '28px' }}>📝</span>}
              label='笔记'
              onClick={() => onNavigate('notes')}
            />
            <ShortcutCard
              icon={<span style={{ fontSize: '28px' }}>📁</span>}
              label='文件'
              onClick={() => onNavigate('files')}
            />
            <ShortcutCard
              icon={<span style={{ fontSize: '28px' }}>📊</span>}
              label='统计'
              onClick={() => onNavigate('charts')}
            />
            <ShortcutCard
              icon={<span style={{ fontSize: '28px' }}>⚙️</span>}
              label='设置'
              onClick={() => onNavigate('settings')}
            />
          </div>
        </ShelfSection>
      )}

      <ShelfSection label='待复习'>
        <ReviewQueue height={height} />
      </ShelfSection>
      <ShelfSection label='最近使用的卷帙'>
        <RecentScrolls height={height} onStudyTag={onStudyTag} />
      </ShelfSection>
      <ShelfSection label='最近使用的笔记'>
        <RecentNotes height={height} />
      </ShelfSection>
    </>
  );
};

const LatticeBackground = () => {
  const patternId = useId();

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='100%'
      height='100%'
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden='true'
    >
      <defs>
        <pattern id={patternId} x='0' y='0' width='48' height='48' patternUnits='userSpaceOnUse'>
          <line x1='0' y1='0' x2='64' y2='0' stroke='var(--color-text-3)' strokeWidth='0.5' strokeOpacity='0.25' />
          <line x1='0' y1='32' x2='64' y2='32' stroke='var(--color-text-3)' strokeWidth='0.5' strokeOpacity='0.25' />
          <line x1='0' y1='64' x2='64' y2='64' stroke='var(--color-text-3)' strokeWidth='0.5' strokeOpacity='0.25' />
          <line x1='0' y1='0' x2='0' y2='64' stroke='var(--color-text-3)' strokeWidth='0.5' strokeOpacity='0.25' />
          <line x1='32' y1='0' x2='32' y2='64' stroke='var(--color-text-3)' strokeWidth='0.5' strokeOpacity='0.25' />
          <line x1='64' y1='0' x2='64' y2='64' stroke='var(--color-text-3)' strokeWidth='0.5' strokeOpacity='0.25' />
        </pattern>
      </defs>
      <rect width='100%' height='100%' fill={`url(#${patternId})`} />
    </svg>
  );
};

const PendingCard = ({ stats, greeting, dateLabel, solarTerm, loading, onStartStudy }: PendingCardProps) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);

  const highlighted = hovered || pressed;

  const handleClick = () => {
    onStartStudy?.();
  };

  return (
    <div
      style={{
        ...cardStyle,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'var(--color-bg-2)',
      }}
    >
      <LatticeBackground />

      <div style={{ position: 'relative', zIndex: 1, padding: '24px' }}>
        <Typography.Paragraph
          type='secondary'
          spacing='close'
          style={{ margin: 0, fontSize: '48px', fontWeight: 600 }}
        >
          {loading ? (
            '加载中...'
          ) : (
            <>
              你有 <Typography.Text bold>{stats.cardsDue}</Typography.Text> 张卡片待复习
            </>
          )}
        </Typography.Paragraph>
        <Typography.Text className='scenery-sub-text' style={{ fontSize: '24px' }}>
          {loading ? '' : `已连续精进 ${stats.streakDays} 天 | 今日目标已完成 ${stats.todayProgress}%`}
        </Typography.Text>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '24px',
        }}
      >
        <Typography.Text className='scenery-sub-text' style={{ fontSize: '24px', fontWeight: 600 }}>
          {greeting}，学习者。今天是 {dateLabel}{solarTerm ? `，${solarTerm}` : ''}。
        </Typography.Text>

        <Button
          shape='round'
          size='large'
          type={highlighted ? 'primary' : 'secondary'}
          style={{
            position: 'relative',
            overflow: 'hidden',
            minWidth: '120px',
            height: '48px',
            padding: '0 32px',
            fontSize: '16px',
            flexShrink: 0,
            backgroundColor: highlighted ? PRIMARY_COLOR : undefined,
            borderColor: highlighted ? PRIMARY_COLOR : undefined,
          }}
          onMouseEnter={() => {
            setHovered(true);
            setRippleKey((value) => value + 1);
          }}
          onMouseLeave={() => {
            setHovered(false);
            setPressed(false);
          }}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onClick={handleClick}
        >
          {hovered ? (
            <span
              key={rippleKey}
              className='start-btn-ripple'
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '100%',
                aspectRatio: '1',
                borderRadius: '50%',
                background: PRIMARY_COLOR,
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
          ) : null}
          <span style={{ position: 'relative', zIndex: 1 }}>开始</span>
        </Button>
      </div>
    </div>
  );
};

const DoneCard = ({ scenery }: { scenery: SceneryContent | null }) => {
  const [hovered, setHovered] = useState(false);

  // 窗景关闭时（scenery 为 null），显示纯背景卡片样式
  if (!scenery) {
    return (
      <div
        style={{
          ...cardStyle,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'var(--color-bg-2)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1, padding: '24px' }}>
          <Typography.Paragraph
            type='secondary'
            spacing='close'
            style={{ margin: 0, fontSize: '48px', fontWeight: 600 }}
          >
            恭喜你，今日任务已完成！
          </Typography.Paragraph>
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '24px',
          }}
        >
          <Typography.Text className='scenery-sub-text' style={{ fontSize: '24px', fontWeight: 600 }}>
            继续保持，明天见。
          </Typography.Text>
        </div>
      </div>
    );
  }

  // 窗景开启时，显示图片 + 诗句 + 渐变遮罩
  const image = scenery.image;
  const poem = scenery.poem ?? '且将新火试新茶，诗酒趁年华。';
  const source = scenery.source ?? '[宋] 苏轼《望江南·超然台作》';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={cardStyle}
    >
      <img
        src={image}
        alt={`窗景图片：${poem} —— ${source}`}
        className={`scenery-img${hovered ? ' expanded' : ''}`}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1,
          padding: '24px',
          opacity: hovered ? 0 : 1,
          transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: hovered ? 'none' : 'auto',
        }}
      >
        <Typography.Paragraph
          type='secondary'
          spacing='close'
          style={{ margin: 0, fontSize: '48px', fontWeight: 600 }}
        >
          恭喜你，今日任务已完成！
        </Typography.Paragraph>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '38.2%',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row-reverse',
            alignItems: 'flex-start',
            gap: '12px',
            height: '90%',
            maxHeight: '90%',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              writingMode: 'vertical-rl',
              fontFamily: '"Noto Serif SC", "Source Han Serif SC", "STSong", serif',
              fontSize: '18px',
              fontWeight: 400,
              letterSpacing: '0.3em',
              color: 'var(--color-text-1)',
              lineHeight: 1.6,
              height: '100%',
              overflow: 'hidden',
            }}
          >
            {poem}
          </div>
          {source && (
            <div
              style={{
                writingMode: 'vertical-rl',
                fontFamily: '"Noto Serif SC", "Source Han Serif SC", "STSong", serif',
                fontSize: '14px',
                fontWeight: 400,
                letterSpacing: '0.15em',
                color: 'var(--color-text-3)',
                lineHeight: 1.6,
                overflow: 'hidden',
              }}
            >
              {'——'}{source}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StartPage = ({ onDoneChange, onNavigate }: StartPageProps) => {
  const data = useStartPageData();
  const done = !data.loading && data.stats.cardsDue === 0;
  const [isStudying, setIsStudying] = useState(false);
  const [studyTag, setStudyTag] = useState<string | undefined>(undefined);

  useEffect(() => {
    onDoneChange?.(done);
  }, [done, onDoneChange]);

  // 学习模式
  if (isStudying) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <FlashcardStudy onExit={() => setIsStudying(false)} demo={false} filterTag={studyTag} />
      </div>
    );
  }

  return (
    <div id="start-page-scroll" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
      <div style={{ position: 'relative', height: '61.8vh', padding: '48px 0 0 64px' }}>
        <Typography.Title
          heading={1}
          style={{ fontWeight: 600, lineHeight: 1, margin: 0, fontSize: '40px' }}
        >
          开始
        </Typography.Title>

        {done ? (
          <DoneCard scenery={data.scenery} />
        ) : (
          <PendingCard
            stats={data.stats}
            greeting={data.greeting}
            dateLabel={data.dateLabel}
            solarTerm={data.solarTerm}
            loading={data.loading}
            onStartStudy={() => {
              setStudyTag(undefined);
              setIsStudying(true);
            }}
          />
        )}
      </div>

      <div style={{ padding: '48px 64px 64px' }}>
        <Typography.Title
          heading={2}
          style={{ fontWeight: 400, lineHeight: 1, margin: '0 0 16px 0', padding: 0, fontSize: '28px' }}
        >
          书架
        </Typography.Title>

        <ShelfSections
          onNavigate={onNavigate}
          onStudyTag={(tag) => {
            setStudyTag(tag);
            setIsStudying(true);
          }}
        />

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
          -webkit-mask-image: linear-gradient(to right, transparent var(--mask-start), black 100%);
          mask-image: linear-gradient(to right, transparent var(--mask-start), black 100%);
          transition: transform 6s cubic-bezier(0.4, 0, 0.2, 1), --mask-start 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform: scale(1);
        }
        .scenery-img.expanded {
          --mask-start: 38.2%;
          transform: scale(1.05);
        }

        .scenery-sub-text {
          color: var(--color-text-3);
        }

        @keyframes ripple-effect {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }

        .start-btn-ripple {
          animation: ripple-effect 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default StartPage;
