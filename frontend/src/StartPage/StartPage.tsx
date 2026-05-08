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
  scenery: SceneryContent | null;
};

function getGreeting(hour: number, t: (key: string) => string): string {
  if (hour < 6) return t('startPage.lateNight');
  if (hour < 12) return t('startPage.goodMorning');
  if (hour < 18) return t('startPage.goodAfternoon');
  return t('startPage.goodEvening');
}

function formatDateLabel(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function useStartPageData(t: (key: string) => string): StartPageData & { refresh: () => void } {
  const [today] = useState(() => new Date());
  const [solarTerm, setSolarTerm] = useState<string | null>(() => getSolarTerm(today));
  const [scenery, setScenery] = useState<SceneryContent | null>(null);
  const [stats, setStats] = useState<StartPageStats>({
    cardsDue: 0,
    totalCards: 0,
    streakDays: 0,
    todayProgress: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [remoteSolarTerm, nextScenery, nextDueRes, streakRes] = await Promise.all([
        fetchSolarTerm(today),
        fetchSceneryContent(),
        api.nextDue(),
        api.streak(),
      ]);

      if (remoteSolarTerm) {
        setSolarTerm(remoteSolarTerm);
      }

      setScenery(nextScenery);

      const dueCount = nextDueRes.success ? (nextDueRes.due_count ?? 0) : 0;
      const totalCount = nextDueRes.success ? (nextDueRes.total_count ?? 0) : 0;
      const streakDays = streakRes.success ? (streakRes.current_streak ?? 0) : 0;
      const todayProgress = streakRes.success ? (streakRes.progress_percent ?? 0) : 0;
      setStats({ cardsDue: dueCount, totalCards: totalCount, streakDays, todayProgress });
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
    greeting: getGreeting(today.getHours(), t),
    dateLabel: formatDateLabel(today),
    solarTerm,
    scenery,
    stats,
    loading,
    refresh,
  }), [today, solarTerm, scenery, stats, loading, refresh, t]);
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

const PendingCard = ({ stats, greeting, dateLabel, solarTerm, loading, onStartStudy, scenery }: PendingCardProps) => {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);
  const [imageError, setImageError] = useState(false);

  const highlighted = hovered || pressed;
  const showScenery = scenery !== null;
  const defaultImage = './scenery/image.png';
  const image = imageError ? defaultImage : scenery?.image;
  const poem = scenery?.poem ?? '且将新火试新茶，诗酒趁年华。';
  const source = scenery?.source ?? '[宋] 苏轼《望江南·超然台作》';

  const handleClick = () => {
    onStartStudy?.();
  };

  return (
    <div
      className={`start-card-frame ${showScenery ? 'start-card-frame--scenery' : 'start-card-frame--pending'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
    >
      {!showScenery && <LatticeBackground />}

      {showScenery && (
        <img
          src={image}
          alt={`窗景图片：${poem} —— ${source}`}
          className="start-scenery-image"
          data-hovered={hovered ? 'true' : 'false'}
          onError={() => setImageError(true)}
        />
      )}

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
          {loading ? '' : t('startPage.streakProgress', { streakDays: stats.streakDays, todayProgress: stats.todayProgress })}
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

      {showScenery && (
        <div className="start-poem-container" data-hovered={hovered ? 'true' : 'false'}>
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
      )}
    </div>
  );
};

const DoneCard = ({ scenery }: { scenery: SceneryContent | null }) => {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const hoverState = hovered ? 'true' : 'false';

  const defaultImage = './scenery/image.png';

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
            {t('startPage.congratulations')}
          </Typography.Paragraph>
        </div>

        <div className="start-card-bottom">
          <Typography.Text className="scenery-sub-text start-card-greeting">
            {t('startPage.keepGoing')}
          </Typography.Text>
        </div>
      </div>
    );
  }

  // 窗景开启时，显示图片 + 诗句 + 渐变遮罩
  const image = imageError ? defaultImage : scenery.image;
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
        onError={() => setImageError(true)}
      />

      <div className="start-done-greeting" data-hovered={hoverState}>
        <Typography.Paragraph
          type='secondary'
          spacing='close'
          className="start-card-headline"
        >
          {t('startPage.congratulations')}
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
  const { t } = useTranslation();
  const data = useStartPageData(t);
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
          {t('startPage.title')}
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
            scenery={data.scenery}
            onStartStudy={() => {
              setStudyTag(undefined);
              setIsStudying(true);
            }}
          />
        )}
      </div>

      <div className="start-shelves">
        <Typography.Title heading={2} className="start-shelves-title">
          {t('startPage.bookshelf')}
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
