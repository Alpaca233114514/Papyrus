import { IconCheckCircle, IconCloseCircle, IconMinusCircle } from '@arco-design/web-react/icon';
import type { Card } from '../../api';
import { PRIMARY_COLOR, SUCCESS_COLOR, WARNING_COLOR, DANGER_COLOR } from '../../theme-constants';

export { PRIMARY_COLOR, SUCCESS_COLOR, WARNING_COLOR, DANGER_COLOR };

export type RatingGrade = 1 | 2 | 3;

export const RATING_CONFIG = {
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

export const DEMO_CARDS: Card[] = [
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

export type StudyState = 'loading' | 'empty' | 'question' | 'answer' | 'submitting';

export interface StudyStats {
  studied: number;
  mastered: number;
  forgotten: number;
}

export interface LastResult {
  grade: RatingGrade;
  card: Card;
}
