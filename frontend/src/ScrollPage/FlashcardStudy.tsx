import { useState, useEffect, useCallback, useRef } from 'react';
import { Typography, Button, Spin, Empty, Switch } from '@arco-design/web-react';
import { IconArrowLeft, IconCheckCircle, IconCloseCircle, IconMinusCircle, IconUndo } from '@arco-design/web-react/icon';
import { api, type Card, type NextDueRes } from '../api';

interface FlashcardStudyProps {
  onExit: () => void;
  demo?: boolean; // 演示模式，使用样板数据
}

type StudyState = 'loading' | 'empty' | 'question' | 'answer' | 'submitting';

const PRIMARY_COLOR = '#206CCF';
const SUCCESS_COLOR = '#00B42A';
const WARNING_COLOR = '#FF7D00';
const DANGER_COLOR = '#F53F3F';

// 评级配置
const RATING_CONFIG = {
  1: { 
    label: '忘记', 
    key: '1', 
    color: DANGER_COLOR, 
    bgColor: '#FFF2F0',
    desc: '短期内高频重现',
    icon: IconCloseCircle,
  },
  2: { 
    label: '模糊', 
    key: '2', 
    color: WARNING_COLOR, 
    bgColor: '#FFF7E8',
    desc: '稍后再次复习',
    icon: IconMinusCircle,
  },
  3: { 
    label: '掌握', 
    key: '3', 
    color: SUCCESS_COLOR, 
    bgColor: '#E8FFEA',
    desc: '复习间隔翻倍',
    icon: IconCheckCircle,
  },
} as const;

type RatingGrade = 1 | 2 | 3;

// 样板数据 - 用于演示模式
const DEMO_CARDS: Card[] = [
  {
    id: 'demo-1',
    q: '什么是艾宾浩斯遗忘曲线？',
    a: '艾宾浩斯遗忘曲线描述了人类大脑对新习得知识的遗忘规律：遗忘在学习后20分钟开始，1小时后保留44%，1天后保留33%，6天后保留25%。间隔重复可以有效对抗遗忘。',
    next_review: 0,
    interval: 0,
  },
  {
    id: 'demo-2',
    q: 'Python 中列表推导式的语法是什么？',
    a: '[expression for item in iterable if condition]\n\n例如：\nsquares = [x**2 for x in range(10) if x % 2 == 0]\n# 结果: [0, 4, 16, 36, 64]',
    next_review: 0,
    interval: 0,
  },
  {
    id: 'demo-3',
    q: 'TCP 和 UDP 的主要区别是什么？',
    a: 'TCP（传输控制协议）：\n• 面向连接，可靠传输\n• 有拥塞控制和流量控制\n• 适用于文件传输、HTTP等\n\nUDP（用户数据报协议）：\n• 无连接，不可靠传输\n• 低延迟，开销小\n• 适用于视频流、DNS、游戏等',
    next_review: 0,
    interval: 0,
  },
  {
    id: 'demo-4',
    q: 'React 中 useEffect 的依赖数组作用是什么？',
    a: '依赖数组控制 effect 的执行时机：\n• [] - 只在组件挂载和卸载时执行\n• [a, b] - 在挂载和依赖项变化时执行\n• 无依赖数组 - 每次渲染都执行\n\n注意：依赖项必须包含 effect 中使用的所有响应式值。',
    next_review: 0,
    interval: 0,
  },
  {
    id: 'demo-5',
    q: '什么是 SQL 注入攻击？如何防范？',
    a: 'SQL注入：攻击者在输入中嵌入恶意 SQL 代码，欺骗数据库执行非授权操作。\n\n防范措施：\n• 使用参数化查询（Prepared Statements）\n• 输入验证和过滤\n• 最小权限原则\n• ORM 框架',
    next_review: 0,
    interval: 0,
  },
];

// 提示框组件 - 显示上一张卡片评分结果 + 撤销功能
interface ResultToastProps {
  grade: RatingGrade;
  onUndo: () => void;
  canUndo: boolean;
}

const ResultToast = ({ grade, onUndo, canUndo }: ResultToastProps) => {
  const config = RATING_CONFIG[grade];
  const Icon = config.icon;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      background: config.bgColor,
      borderRadius: '8px',
      border: `1px solid ${config.color}20`,
      animation: 'slideIn 0.3s ease',
    }}>
      <Icon style={{ fontSize: '18px', color: config.color }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <Typography.Text style={{ 
          fontSize: '14px', 
          fontWeight: 500, 
          color: config.color,
          lineHeight: 1.4,
        }}>
          上一张卡片标记为「{config.label}」
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: '12px', lineHeight: 1.4 }}>
          {config.desc}
        </Typography.Text>
      </div>
      {canUndo && (
        <Button
          type="text"
          size="small"
          icon={<IconUndo style={{ fontSize: '14px' }} />}
          onClick={onUndo}
          style={{
            marginLeft: '8px',
            color: 'var(--color-text-2)',
            fontSize: '13px',
          }}
        >
          撤销
        </Button>
      )}
    </div>
  );
};

export default function FlashcardStudy({ onExit, demo = false }: FlashcardStudyProps) {
  const [studyState, setStudyState] = useState<StudyState>('loading');
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ studied: 0, mastered: 0, forgotten: 0 });
  const [lastResult, setLastResult] = useState<{ grade: RatingGrade; card: Card } | null>(null);
  const [isDemo, setIsDemo] = useState(demo);
  const [demoIndex, setDemoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  // 加载下一张卡片（演示模式）
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

  // 加载下一张卡片（API 模式）
  const loadRealCard = useCallback(async () => {
    try {
      const res: NextDueRes = await api.nextDue();
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
      setStudyState('empty');
    }
  }, []);

  // 初始加载
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

  // 揭晓答案
  const revealAnswer = useCallback(() => {
    if (studyState === 'question') {
      setStudyState('answer');
    }
  }, [studyState]);

  // 提交评分
  const submitRating = useCallback(async (grade: RatingGrade) => {
    if (!currentCard || studyState !== 'answer') return;
    
    setStudyState('submitting');
    
    // 保存当前卡片用于撤销
    const ratedCard = currentCard;
    
    // 演示模式：模拟评分结果
    if (isDemo) {
      setStats(prev => ({
        studied: prev.studied + 1,
        mastered: grade === 3 ? prev.mastered + 1 : prev.mastered,
        forgotten: grade === 1 ? prev.forgotten + 1 : prev.forgotten,
      }));
      
      setLastResult({ grade, card: ratedCard });
      
      // 延迟加载下一张，让用户看到反馈
      setTimeout(() => {
        setDemoIndex(prev => {
          const nextIdx = prev + 1;
          loadDemoCard(nextIdx);
          return nextIdx;
        });
      }, 400);
      return;
    }
    
    // 真实模式：调用 API
    try {
      const res = await api.rateCard(currentCard.id, grade);
      
      setStats(prev => ({
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
      setStudyState('answer');
    }
  }, [currentCard, studyState, isDemo, loadDemoCard, loadRealCard]);

  // 撤销评分
  const undoRating = useCallback(() => {
    if (!lastResult) return;
    
    // 恢复上一张卡片
    setCurrentCard(lastResult.card);
    setStudyState('answer'); // 直接显示答案，让用户重新评分
    
    // 恢复统计
    setStats(prev => ({
      studied: Math.max(0, prev.studied - 1),
      mastered: lastResult.grade === 3 ? Math.max(0, prev.mastered - 1) : prev.mastered,
      forgotten: lastResult.grade === 1 ? Math.max(0, prev.forgotten - 1) : prev.forgotten,
    }));
    
    // 恢复 demoIndex
    if (isDemo) {
      setDemoIndex(prev => Math.max(0, prev - 1));
    }
    
    // 清除上次结果
    setLastResult(null);
  }, [lastResult, isDemo]);

  // 切换演示模式
  const toggleDemo = useCallback(() => {
    setIsDemo(prev => {
      const newValue = !prev;
      setDemoIndex(0);
      setStats({ studied: 0, mastered: 0, forgotten: 0 });
      setLastResult(null);
      // 立即加载新模式的卡片
      setStudyState('loading');
      if (newValue) {
        loadDemoCard(0);
      } else {
        loadRealCard();
      }
      return newValue;
    });
  }, [loadDemoCard, loadRealCard]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 防止在输入框等场景下触发
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          revealAnswer();
          break;
        case 'Digit1':
        case 'Numpad1':
          e.preventDefault();
          submitRating(1);
          break;
        case 'Digit2':
        case 'Numpad2':
          e.preventDefault();
          submitRating(2);
          break;
        case 'Digit3':
        case 'Numpad3':
          e.preventDefault();
          submitRating(3);
          break;
        case 'Escape':
          e.preventDefault();
          onExit();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealAnswer, submitRating, onExit]);

  // 渲染加载状态
  if (studyState === 'loading') {
    return (
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '16px',
      }}>
        <Spin size={40} />
        <Typography.Text type="secondary">加载中...</Typography.Text>
      </div>
    );
  }

  // 渲染空状态（无待复习卡片）
  if (studyState === 'empty') {
    return (
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '24px',
        padding: '48px',
      }}>
        <Empty
          icon={<div style={{ fontSize: '64px' }}>🎉</div>}
          description={
            <div style={{ textAlign: 'center' }}>
              <Typography.Title heading={3} style={{ marginBottom: '8px' }}>
                {isDemo ? '演示结束！' : '今日复习完成！'}
              </Typography.Title>
              <Typography.Text type="secondary">
                {isDemo ? '所有样板卡片已复习完毕' : '没有待复习的卡片了，明天再来吧'}
              </Typography.Text>
            </div>
          }
        />
        
        {stats.studied > 0 && (
          <div style={{
            display: 'flex',
            gap: '32px',
            padding: '24px 48px',
            background: 'var(--color-fill-2)',
            borderRadius: '12px',
            marginTop: '16px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <Typography.Text style={{ fontSize: '24px', fontWeight: 600, color: PRIMARY_COLOR }}>
                {stats.studied}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                已复习
              </Typography.Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Typography.Text style={{ fontSize: '24px', fontWeight: 600, color: SUCCESS_COLOR }}>
                {stats.mastered}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                已掌握
              </Typography.Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Typography.Text style={{ fontSize: '24px', fontWeight: 600, color: DANGER_COLOR }}>
                {stats.forgotten}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>
                需加强
              </Typography.Text>
            </div>
          </div>
        )}
        
        {/* 演示模式切换 */}
        <div style={{
          marginTop: '16px',
          padding: '16px 24px',
          background: 'var(--color-fill-2)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <Typography.Text type="secondary">演示模式</Typography.Text>
          <Switch checked={isDemo} onChange={toggleDemo} />
          <Button type="primary" onClick={() => { 
            setDemoIndex(0); 
            setStats({ studied: 0, mastered: 0, forgotten: 0 });
            setLastResult(null);
            if (isDemo) {
              loadDemoCard(0);
            } else {
              loadRealCard();
            }
          }}>
            重新开始
          </Button>
        </div>
        
        <Button
          type="primary"
          size="large"
          onClick={onExit}
          style={{ 
            marginTop: '8px',
            borderRadius: '20px',
            padding: '0 32px',
            backgroundColor: PRIMARY_COLOR,
          }}
        >
          返回卷轴列表
        </Button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        padding: '32px 48px',
        gap: '24px',
      }}
    >
      {/* 顶部工具栏 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
      }}>
        <Button 
          type="text" 
          icon={<IconArrowLeft />}
          onClick={onExit}
          style={{ color: 'var(--color-text-2)' }}
        >
          退出学习
        </Button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* 演示模式切换 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            background: isDemo ? '#FFF7E8' : 'transparent',
            borderRadius: '16px',
            border: isDemo ? `1px solid ${WARNING_COLOR}` : '1px solid transparent',
          }}>
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
              演示模式
            </Typography.Text>
            <Switch 
              checked={isDemo} 
              onChange={toggleDemo}
              size="small"
            />
          </div>
          
          {/* 进度显示 */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '6px 16px',
            background: 'var(--color-fill-2)',
            borderRadius: '20px',
          }}>
            <Typography.Text type="secondary" style={{ fontSize: '13px' }}>
              待复习
            </Typography.Text>
            <Typography.Text style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              color: dueCount > 0 ? PRIMARY_COLOR : 'inherit' 
            }}>
              {dueCount}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: '13px' }}>
              / {totalCount}
            </Typography.Text>
          </div>
          
          {/* 本次统计 */}
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
            <span style={{ color: SUCCESS_COLOR }}>✓ {stats.mastered}</span>
            <span style={{ color: DANGER_COLOR }}>✗ {stats.forgotten}</span>
          </div>
        </div>
      </div>

      {/* 卡片区域 */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
      }}>
        {/* 演示模式提示 */}
        {isDemo && (
          <div style={{
            padding: '8px 16px',
            background: '#FFF7E8',
            border: `1px dashed ${WARNING_COLOR}`,
            borderRadius: '8px',
          }}>
            <Typography.Text style={{ fontSize: '13px', color: WARNING_COLOR }}>
              🎯 演示模式：使用样板数据，评分不会保存
            </Typography.Text>
          </div>
        )}

        {/* 评分结果提示框 */}
        {lastResult && studyState === 'question' && (
          <ResultToast 
            grade={lastResult.grade} 
            onUndo={undoRating}
            canUndo={true}
          />
        )}

        {/* 卷轴卡片 */}
        <div
          onClick={revealAnswer}
          style={{
            width: '100%',
            maxWidth: '720px',
            minHeight: '320px',
            maxHeight: '480px',
            background: 'var(--color-bg-1)',
            borderRadius: '20px',
            border: '1px solid var(--color-border-2)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
            padding: '48px',
            display: 'flex',
            flexDirection: 'column',
            cursor: studyState === 'question' ? 'pointer' : 'default',
            transition: 'transform 0.2s, box-shadow 0.2s',
            position: 'relative',
            overflow: 'auto',
          }}
        >
          {/* 卷首 - 问题 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography.Text 
              type="secondary" 
              style={{ 
                fontSize: '12px', 
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '16px',
              }}
            >
              卷首 · 问题
            </Typography.Text>
            <Typography.Paragraph style={{ 
              fontSize: '22px', 
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}>
              {currentCard?.q}
            </Typography.Paragraph>
          </div>

          {/* 分隔线 */}
          <div style={{
            height: '1px',
            background: 'var(--color-border-2)',
            margin: '32px 0',
            transition: 'opacity 0.3s',
            opacity: studyState === 'answer' ? 1 : 0.3,
          }} />

          {/* 卷尾 - 答案 */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            opacity: studyState === 'answer' ? 1 : 0,
            transition: 'opacity 0.3s',
          }}>
            <Typography.Text 
              type="secondary" 
              style={{ 
                fontSize: '12px', 
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '16px',
              }}
            >
              卷尾 · 答案
            </Typography.Text>
            <Typography.Paragraph style={{ 
              fontSize: '20px', 
              lineHeight: 1.6,
              margin: 0,
              color: PRIMARY_COLOR,
              whiteSpace: 'pre-wrap',
            }}>
              {currentCard?.a}
            </Typography.Paragraph>
          </div>

          {/* 点击提示 */}
          {studyState === 'question' && (
            <div style={{
              position: 'absolute',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'var(--color-fill-2)',
              borderRadius: '20px',
            }}>
              <Typography.Text style={{ fontSize: '16px' }}>␣</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: '14px' }}>
                按空格揭晓答案
              </Typography.Text>
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        {studyState === 'answer' ? (
          // 评分按钮
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
          }}>
            {(Object.entries(RATING_CONFIG) as [string, typeof RATING_CONFIG[1]][]).map(([grade, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={grade}
                  size="large"
                  onClick={() => submitRating(Number(grade) as RatingGrade)}
                  style={{
                    height: '72px',
                    minWidth: '140px',
                    borderRadius: '12px',
                    border: `2px solid ${config.color}`,
                    background: config.bgColor,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '0 20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon style={{ fontSize: '18px', color: config.color }} />
                    <Typography.Text style={{ 
                      fontSize: '16px', 
                      fontWeight: 600, 
                      color: config.color,
                      lineHeight: 1.4,
                    }}>
                      {config.label}
                    </Typography.Text>
                  </div>
                  <Typography.Text type="secondary" style={{ 
                    fontSize: '12px', 
                    lineHeight: 1.4,
                  }}>
                    {config.desc}
                  </Typography.Text>
                </Button>
              );
            })}
          </div>
        ) : (
          // 揭晓答案提示
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 24px',
            background: 'var(--color-fill-2)',
            borderRadius: '24px',
          }}>
            <Typography.Text type="secondary" style={{ fontSize: '14px' }}>
              按
            </Typography.Text>
            <kbd style={{
              padding: '4px 12px',
              background: 'var(--color-bg-1)',
              border: '1px solid var(--color-border-2)',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}>Space</kbd>
            <Typography.Text type="secondary" style={{ fontSize: '14px' }}>
              揭晓答案
            </Typography.Text>
          </div>
        )}
      </div>

      {/* 快捷键提示 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        padding: '16px',
      }}>
        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
          <kbd style={kbdStyle}>Space</kbd> 揭晓
        </Typography.Text>
        <Typography.Text style={{ fontSize: '12px', color: DANGER_COLOR }}>
          <kbd style={kbdStyle}>1</kbd> 忘记
        </Typography.Text>
        <Typography.Text style={{ fontSize: '12px', color: WARNING_COLOR }}>
          <kbd style={kbdStyle}>2</kbd> 模糊
        </Typography.Text>
        <Typography.Text style={{ fontSize: '12px', color: SUCCESS_COLOR }}>
          <kbd style={kbdStyle}>3</kbd> 掌握
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
          <kbd style={kbdStyle}>Esc</kbd> 退出
        </Typography.Text>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  padding: '2px 8px',
  background: 'var(--color-fill-2)',
  border: '1px solid var(--color-border-2)',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '11px',
  marginRight: '4px',
};
