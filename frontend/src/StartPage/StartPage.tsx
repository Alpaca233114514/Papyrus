import { Typography, Button, Message } from '@arco-design/web-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import RecentScrolls from './RecentScrolls';
import RecentNotes from './RecentNotes';
import ReviewQueue from './ReviewQueue';
import { getSolarTerm, fetchSolarTerm } from './solarTerms';
import { type SceneryContent, fetchSceneryContent } from './sceneryContent';
import FlashcardStudy from '../ScrollPage/FlashcardStudy';
import { api } from '../api';
import './StartPage.css';


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

function getGreeting(hour: number): string {
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早安';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function formatDateLabel(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function useStartPageData(): StartPageData & { refresh: () => void } {
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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [remoteSolarTerm, nextScenery, nextDueRes] = await Promise.all([
        fetchSolarTerm(today),
        fetchSceneryContent(),
        api.nextDue(),
      ]);

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
      setScenery(null);
      const msg = err instanceof Error ? err.message : '获取数据失败';
      Message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return useMemo(() => ({
    greeting: getGreeting(today.getHours()),
    dateLabel: formatDateLabel(today),
    solarTerm,
    scenery,
    stats,
    loading,
    refresh,
  }), [today, solarTerm, scenery, stats, loading, refresh]);
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
  <section className="start-shelf-section">
    <Typography.Title heading={3} className="start-shelf-section-title">
      {label}
    </Typography.Title>
    {children}
  </section>
);

const ShortcutCard = ({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  const hoverState = hovered ? 'true' : 'false';
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
      className="start-shortcut"
      data-hovered={hoverState}
    >
      <div className="start-shortcut-icon-wrap" data-hovered={hoverState}>
        {icon}
      </div>
      <Typography.Text
        type={hovered ? 'primary' : 'secondary'}
        className="start-shortcut-label"
      >
        {label}
      </Typography.Text>
    </div>
  );
};

const ShelfSections = ({ onStudyTag, onNavigate }: { onStudyTag?: (tag: string) => void; onNavigate?: (page: string) => void }) => {
  const { t } = useTranslation();
  const { ref, height } = useCardHeight();

  return (
    <>
      <div ref={ref} className="start-shelf-measure" />

      {onNavigate && (
        <ShelfSection label={t('startPage.shortcuts')}>
          <div className="start-shelf-row">
            <ShortcutCard
              icon={<span className="start-shortcut-icon">📝</span>}
              label={t('sidebar.notes')}
              onClick={() => onNavigate('notes')}
            />
            <ShortcutCard
              icon={<span className="start-shortcut-icon">📁</span>}
              label={t('sidebar.files')}
              onClick={() => onNavigate('files')}
            />
            <ShortcutCard
              icon={<span className="start-shortcut-icon">📊</span>}
              label={t('sidebar.charts')}
              onClick={() => onNavigate('charts')}
            />
            <ShortcutCard
              icon={<span className="start-shortcut-icon">⚙️</span>}
              label={t('sidebar.settings')}
              onClick={() => onNavigate('settings')}
            />
          </div>
        </ShelfSection>
      )}

      <ShelfSection label={t('startPage.review')}>
        <ReviewQueue height={height} />
      </ShelfSection>
      <ShelfSection label={t('startPage.recentScrolls')}>
        <RecentScrolls height={height} onStudyTag={onStudyTag} />
      </ShelfSection>
      <ShelfSection label={t('startPage.recentNotes')}>
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
      className="start-lattice-svg"
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
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);

  const highlighted = hovered || pressed;

  const handleClick = () => {
    onStartStudy?.();
  };

  return (
    <div className="start-card-frame start-card-frame--pending">
      <LatticeBackground />

      <div className="start-card-top">
        <Typography.Paragraph
          type='secondary'
          spacing='close'
          className="start-card-headline"
        >
          {loading ? (
            t('startPage.fetchCardsFailed')
          ) : (
            <>
              {t('startPage.cardsDue', { count: stats.cardsDue })}
            </>
          )}
        </Typography.Paragraph>
        <Typography.Text className="scenery-sub-text start-card-subline">
          {loading ? '' : `已连续精进 ${stats.streakDays} 天 | 今日目标已完成 ${stats.todayProgress}%`}
        </Typography.Text>
      </div>

      <div className="start-card-bottom">
        <Typography.Text className="scenery-sub-text start-card-greeting">
          {greeting} | {dateLabel}{solarTerm ? ` | ${solarTerm}` : ''}
        </Typography.Text>

        <Button
          shape='round'
          size='large'
          type={highlighted ? 'primary' : 'secondary'}
          className="start-cta-button"
          data-highlighted={highlighted ? 'true' : 'false'}
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
            <span key={rippleKey} className="start-btn-ripple" />
          ) : null}
          <span className="start-cta-button-label">{t('startPage.start')}</span>
        </Button>
      </div>
    </div>
  );
};

const DoneCard = ({ scenery }: { scenery: SceneryContent | null }) => {
  const [hovered, setHovered] = useState(false);
  const hoverState = hovered ? 'true' : 'false';

  // 窗景关闭时（scenery 为 null），显示纯背景卡片样式
  if (!scenery) {
    return (
      <div className="start-card-frame start-card-frame--done">
        <div className="start-card-top">
          <Typography.Paragraph
            type='secondary'
            spacing='close'
            className="start-card-headline"
          >
            恭喜你，今日任务已完成！
          </Typography.Paragraph>
        </div>

        <div className="start-card-bottom">
          <Typography.Text className="scenery-sub-text start-card-greeting">
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
      className="start-card-frame start-card-frame--scenery"
    >
      <img
        src={image}
        alt={`窗景图片：${poem} —— ${source}`}
        className="start-scenery-image"
        data-hovered={hoverState}
      />

      <div className="start-done-greeting" data-hovered={hoverState}>
        <Typography.Paragraph
          type='secondary'
          spacing='close'
          className="start-card-headline"
        >
          恭喜你，今日任务已完成！
        </Typography.Paragraph>
      </div>

      <div className="start-poem-container" data-hovered={hoverState}>
        <div className="start-poem-inner">
          <div className="start-poem-text">
            {poem}
          </div>
          {source && (
            <div className="start-poem-source">
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

  // 监听学习完成事件，刷新数据
  useEffect(() => {
    const handleStudyCompleted = () => {
      data.refresh();
    };
    window.addEventListener('papyrus_study_completed', handleStudyCompleted);
    return () => window.removeEventListener('papyrus_study_completed', handleStudyCompleted);
  }, [data.refresh]);

  // 退出学习模式后刷新数据（避免初始挂载时重复刷新）
  const prevIsStudyingRef = useRef(false);
  useEffect(() => {
    if (prevIsStudyingRef.current && !isStudying) {
      data.refresh();
    }
    prevIsStudyingRef.current = isStudying;
  }, [isStudying, data.refresh]);

  // 学习模式
  if (isStudying) {
    return (
      <div className="start-study-shell">
        <FlashcardStudy onExit={() => setIsStudying(false)} demo={false} filterTag={studyTag} />
      </div>
    );
  }

  return (
    <div id="start-page-scroll" className="start-page-root">
      <div className="start-hero">
        <Typography.Title heading={1} className="start-hero-title">
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

      <div className="start-shelves">
        <Typography.Title heading={2} className="start-shelves-title">
          书架
        </Typography.Title>

        <ShelfSections
          onNavigate={onNavigate}
          onStudyTag={(tag) => {
            setStudyTag(tag);
            setIsStudying(true);
          }}
        />

        <div className="start-bottom-spacer" />
      </div>
    </div>
  );
};

export default StartPage;
