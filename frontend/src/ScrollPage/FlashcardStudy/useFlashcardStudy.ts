import { useState, useEffect, useCallback, useRef } from 'react';
import { Message } from '@arco-design/web-react';
import { api, type Card, type NextDueRes } from '../../api';
import {
  DEMO_CARDS,
  type StudyState,
  type StudyStats,
  type LastResult,
  type RatingGrade,
} from './constants';

interface UseFlashcardStudyProps {
  demo: boolean;
  filterTag?: string;
  onExit: () => void;
}

interface UseFlashcardStudyReturn {
  studyState: StudyState;
  currentCard: Card | null;
  dueCount: number;
  totalCount: number;
  stats: StudyStats;
  lastResult: LastResult | null;
  isDemo: boolean;
  demoIndex: number;
  loadRealCard: () => Promise<void>;
  submitRating: (grade: RatingGrade) => Promise<void>;
  undoRating: () => void;
  revealAnswer: () => void;
  toggleDemo: () => void;
  resetStudy: () => void;
}

export function useFlashcardStudy({
  demo,
  filterTag,
  onExit,
}: UseFlashcardStudyProps): UseFlashcardStudyReturn {
  const [studyState, setStudyState] = useState<StudyState>('loading');
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<StudyStats>({ studied: 0, mastered: 0, forgotten: 0 });
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [isDemo, setIsDemo] = useState(demo);
  const [demoIndex, setDemoIndex] = useState(0);
  const loadedRef = useRef(false);

  const loadDemoCard = useCallback((index: number) => {
    const remaining = DEMO_CARDS.length - index;
    if (remaining > 0) {
      setCurrentCard(DEMO_CARDS[index]);
      setDueCount(remaining);
      setTotalCount(DEMO_CARDS.length);
      setStudyState('question');
    } else {
      setCurrentCard(null);
      setDueCount(0);
      setStudyState('empty');
    }
  }, []);

  const loadRealCard = useCallback(async () => {
    try {
      const res: NextDueRes = await api.nextDue(filterTag);
      setDueCount(res.due_count);
      setTotalCount(res.total_count);

      if (res.card) {
        setCurrentCard(res.card);
        setStudyState('question');
      } else {
        setCurrentCard(null);
        setStudyState('empty');
      }
    } catch (err) {
      console.error('加载卡片失败:', err);
      const msg = err instanceof Error ? err.message : '加载卡片失败';
      Message.error(msg);
      setStudyState('empty');
    }
  }, [filterTag]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    setStudyState('loading');
    if (isDemo) {
      loadDemoCard(0);
    } else {
      loadRealCard();
    }
  }, [isDemo, loadDemoCard, loadRealCard]);

  useEffect(() => {
    if (isDemo || studyState === 'empty' || studyState === 'loading') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (stats.studied > 0) {
        e.preventDefault();
        e.returnValue = '正在复习中，确定要离开吗？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDemo, stats.studied, studyState]);

  const revealAnswer = useCallback(() => {
    if (studyState === 'question') {
      setStudyState('answer');
    }
  }, [studyState]);

  const submitRating = useCallback(async (grade: RatingGrade) => {
    if (!currentCard || studyState !== 'answer') return;

    setStudyState('submitting');

    const ratedCard = currentCard;

    if (isDemo) {
      setStats((prev) => ({
        studied: prev.studied + 1,
        mastered: grade === 3 ? prev.mastered + 1 : prev.mastered,
        forgotten: grade === 1 ? prev.forgotten + 1 : prev.forgotten,
      }));

      setLastResult({ grade, card: ratedCard });

      setTimeout(() => {
        setDemoIndex((prev) => {
          const nextIdx = prev + 1;
          loadDemoCard(nextIdx);
          return nextIdx;
        });
      }, 400);
      return;
    }

    try {
      const res = await api.rateCard(currentCard.id, grade, filterTag);

      setStats((prev) => ({
        studied: prev.studied + 1,
        mastered: grade === 3 ? prev.mastered + 1 : prev.mastered,
        forgotten: grade === 1 ? prev.forgotten + 1 : prev.forgotten,
      }));

      setLastResult({ grade, card: ratedCard });

      if (res.next) {
        setDueCount(res.next.due_count);
        setTotalCount(res.next.total_count);

        if (res.next.card) {
          setCurrentCard(res.next.card);
          setStudyState('question');
        } else {
          setCurrentCard(null);
          setStudyState('empty');
        }
      } else {
        await loadRealCard();
      }
    } catch (err) {
      console.error('评分失败:', err);
      const msg = err instanceof Error ? err.message : '评分失败';
      Message.error(msg);
      setStudyState('answer');
    }
  }, [currentCard, studyState, isDemo, loadDemoCard, loadRealCard, filterTag]);

  const undoRating = useCallback(() => {
    if (!lastResult) return;

    setCurrentCard(lastResult.card);
    setStudyState('answer');

    setStats((prev) => ({
      studied: Math.max(0, prev.studied - 1),
      mastered: lastResult.grade === 3 ? Math.max(0, prev.mastered - 1) : prev.mastered,
      forgotten: lastResult.grade === 1 ? Math.max(0, prev.forgotten - 1) : prev.forgotten,
    }));

    if (isDemo) {
      setDemoIndex((prev) => Math.max(0, prev - 1));
    }

    setLastResult(null);
  }, [lastResult, isDemo]);

  useEffect(() => {
    if (studyState === 'empty' && stats.studied > 0) {
      window.dispatchEvent(new CustomEvent('papyrus_study_completed'));
    }
  }, [studyState, stats.studied]);

  const toggleDemo = useCallback(() => {
    setIsDemo((prev) => {
      const newValue = !prev;
      setTimeout(() => {
        setDemoIndex(0);
        setStats({ studied: 0, mastered: 0, forgotten: 0 });
        setLastResult(null);
        setStudyState('loading');
        if (newValue) {
          loadDemoCard(0);
        } else {
          loadRealCard();
        }
      }, 200);
      return newValue;
    });
  }, [loadDemoCard, loadRealCard]);

  const resetStudy = useCallback(() => {
    setDemoIndex(0);
    setStats({ studied: 0, mastered: 0, forgotten: 0 });
    setLastResult(null);
    setStudyState('loading');
    if (isDemo) {
      loadDemoCard(0);
    } else {
      loadRealCard();
    }
  }, [isDemo, loadDemoCard, loadRealCard]);

  return {
    studyState,
    currentCard,
    dueCount,
    totalCount,
    stats,
    lastResult,
    isDemo,
    demoIndex,
    loadRealCard,
    submitRating,
    undoRating,
    revealAnswer,
    toggleDemo,
    resetStudy,
  };
}
