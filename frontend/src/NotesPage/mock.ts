import type { Note, Folder } from './types';

// 更多样化的 Mock 数据
export const MOCK_NOTES: Note[] = [
  // ========== 高等数学 (5条) ==========
  { 
    id: '1', 
    title: '极限的定义与性质', 
    folder: '高等数学', 
    preview: '数列极限：对于任意 ε > 0，存在正整数 N，使得当 n > N 时，|aₙ - A| < ε 恒成立...', 
    tags: ['数学', '极限', '基础'], 
    updatedAt: '今天', 
    wordCount: 1240,
    content: `## 核心概念

数列极限的定义：对于任意 ε > 0，存在正整数 N，使得当 n > N 时，|aₙ - A| < ε 恒成立。

### 要点一：ε 的任意性
ε 代表了接近的程度，可以任意小。

### 要点二：N 的存在性
N 依赖于 ε，不同的 ε 对应不同的 N。

## 详细说明

极限的性质包括：
- 唯一性
- 有界性
- 保号性

## 实例分析

**例1**：证明 lim(1/n) = 0 (n→∞)

**例2**：证明等比数列的极限`
  },
  { 
    id: '2', 
    title: '导数的几何意义', 
    folder: '高等数学', 
    preview: '函数在某点的导数表示函数曲线在该点切线的斜率。导数 f\'(x₀) = tan α...', 
    tags: ['数学', '导数', '几何'], 
    updatedAt: '昨天', 
    wordCount: 890,
    content: `## 核心概念

导数的几何意义：函数在某点的导数表示函数曲线在该点切线的斜率。

### 要点一：切线斜率
导数 f'(x₀) = tan α，其中 α 是切线与 x 轴的夹角。

### 要点二：法线方程
法线与切线垂直，斜率为 -1/f'(x₀)。`
  },
  { 
    id: '3', 
    title: '微分中值定理', 
    folder: '高等数学', 
    preview: '罗尔定理、拉格朗日中值定理、柯西中值定理是微分学的核心理论...', 
    tags: ['数学', '定理', '微分'], 
    updatedAt: '3天前', 
    wordCount: 2100,
    content: `## 三大中值定理

### 1. 罗尔定理
若函数 f(x) 满足：
- 在 [a,b] 上连续
- 在 (a,b) 内可导
- f(a) = f(b)

则存在 ξ ∈ (a,b)，使得 f'(ξ) = 0

### 2. 拉格朗日中值定理
若函数 f(x) 满足上述前两个条件，则存在 ξ ∈ (a,b)，使得：
f'(ξ) = (f(b) - f(a)) / (b - a)

### 3. 柯西中值定理`
  },
  {
    id: 'math-4',
    title: '定积分的应用',
    folder: '高等数学',
    preview: '定积分在几何、物理中有广泛应用，包括面积、体积、弧长、功、质心等计算...',
    tags: ['数学', '积分', '应用'],
    updatedAt: '5天前',
    wordCount: 3200,
    content: `## 几何应用

### 平面图形面积
- 直角坐标：S = ∫[a,b] f(x) dx
- 极坐标：S = ½∫[α,β] r²(θ) dθ

### 旋转体体积
- 圆盘法：V = π∫[a,b] [f(x)]² dx
- 柱壳法：V = 2π∫[a,b] x·f(x) dx

## 物理应用
- 变力做功
- 液体压力
- 引力计算`
  },
  {
    id: 'math-5',
    title: '无穷级数敛散性判定',
    folder: '高等数学',
    preview: '正项级数、交错级数、任意项级数的敛散性判定方法汇总...',
    tags: ['数学', '级数', '难点'],
    updatedAt: '1周前',
    wordCount: 2800,
    content: `## 正项级数判别法

1. 比较判别法
2. 比值判别法（达朗贝尔）
3. 根值判别法（柯西）
4. 积分判别法

## 交错级数
莱布尼茨判别法`
  },

  // ========== 前端开发 (6条) ==========
  { 
    id: '4', 
    title: 'React useEffect 详解', 
    folder: '前端开发', 
    preview: 'useEffect 是 React 中用于处理副作用的 Hook，掌握其依赖数组至关重要...', 
    tags: ['React', 'Hooks', '进阶'], 
    updatedAt: '今天', 
    wordCount: 3200,
    content: `## useEffect 基础

useEffect 用于在函数组件中执行副作用操作。

\`\`\`jsx
useEffect(() => {
  // 副作用逻辑
  return () => {
    // 清理函数
  };
}, [dependencies]);
\`\`\``
  },
  { 
    id: '5', 
    title: 'TypeScript 泛型实战', 
    folder: '前端开发', 
    preview: '泛型（Generics）是 TypeScript 的核心特性之一，让代码更灵活且类型安全...', 
    tags: ['TypeScript', '进阶', '类型系统'], 
    updatedAt: '2天前', 
    wordCount: 1560,
    content: `## 泛型基础

\`\`\`typescript
function identity<T>(arg: T): T {
  return arg;
}
\`\`\``
  },
  {
    id: 'fe-3',
    title: 'CSS Grid 布局完全指南',
    folder: '前端开发',
    preview: 'Grid 布局是二维布局系统，同时处理行和列，比 Flexbox 更强大...',
    tags: ['CSS', '布局', '基础'],
    updatedAt: '昨天',
    wordCount: 2100,
    content: `## Grid 容器

\`\`\`css
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
\`\`\``
  },
  {
    id: 'fe-4',
    title: 'Vite 构建原理与优化',
    folder: '前端开发',
    preview: 'Vite 利用 ES Modules 实现按需加载，大幅提升开发体验...',
    tags: ['工程化', 'Vite', '性能'],
    updatedAt: '4天前',
    wordCount: 1850,
    content: `## 为什么快？

1. 基于 ES Modules 的 Dev Server
2. 按需编译
3. Rollup 预构建依赖`
  },
  {
    id: 'fe-5',
    title: 'React 性能优化实践',
    folder: '前端开发',
    preview: 'React.memo、useMemo、useCallback 的正确使用场景...',
    tags: ['React', '性能', '优化'],
    updatedAt: '6天前',
    wordCount: 2400,
    content: `## 优化策略

1. 避免不必要渲染
2. 虚拟列表
3. 代码分割
4. 状态管理优化`
  },
  {
    id: 'fe-6',
    title: '前端安全：XSS 与 CSRF 防护',
    folder: '前端开发',
    preview: 'Web 安全是前端工程师必须掌握的知识，常见的攻击方式及防御手段...',
    tags: ['安全', 'Web', '必知'],
    updatedAt: '1周前',
    wordCount: 1950,
    content: `## XSS 跨站脚本攻击

### 类型
- 存储型
- 反射型
- DOM 型

### 防御
- 输入过滤
- 输出编码
- CSP 策略`
  },

  // ========== 操作系统 (4条) ==========
  { 
    id: '6', 
    title: '进程与线程', 
    folder: '操作系统', 
    preview: '进程是操作系统资源分配的基本单位，线程是 CPU 调度的基本单位...', 
    tags: ['OS', '并发', '基础'], 
    updatedAt: '4天前', 
    wordCount: 2800,
    content: `## 进程

进程是程序的一次执行过程。

## 线程

线程是进程中的一个实体，是被系统独立调度和分派的基本单位。`
  },
  { 
    id: '7', 
    title: '内存管理', 
    folder: '操作系统', 
    preview: '操作系统的内存管理主要包括内存分配、地址映射、内存保护、虚拟内存等...', 
    tags: ['OS', '内存', '虚拟内存'], 
    updatedAt: '5天前', 
    wordCount: 3400,
    content: `## 内存管理方式

- 连续分配
- 分页存储
- 分段存储
- 段页式存储`
  },
  {
    id: 'os-3',
    title: '文件系统与磁盘调度',
    folder: '操作系统',
    preview: '文件系统的层次结构、目录管理、磁盘调度算法（FCFS、SSTF、SCAN、C-SCAN）...',
    tags: ['OS', '文件系统', '磁盘'],
    updatedAt: '1周前',
    wordCount: 2600,
    content: `## 文件系统

### 文件分配方式
- 连续分配
- 链接分配
- 索引分配

## 磁盘调度
- FCFS
- SSTF
- SCAN（电梯算法）
- C-SCAN`
  },
  {
    id: 'os-4',
    title: '死锁：预防、避免与检测',
    folder: '操作系统',
    preview: '死锁产生的四个必要条件，银行家算法，资源分配图...',
    tags: ['OS', '死锁', '重点'],
    updatedAt: '2周前',
    wordCount: 2200,
    content: `## 死锁条件

1. 互斥
2. 占有并等待
3. 不可抢占
4. 循环等待

## 银行家算法`
  },

  // ========== 日本語 (5条) ==========
  { 
    id: '8', 
    title: '日语动词变形总结', 
    folder: '日本語', 
    preview: '日语动词分为三类：一类动词（五段）、二类动词（一段）、三类动词（变格）...', 
    tags: ['日语', 'N2', '语法'], 
    updatedAt: '今天', 
    wordCount: 1890,
    content: `## 动词分类

- 一类动词（五段动词）
- 二类动词（一段动词）
- 三类动词（变格动词）`
  },
  {
    id: 'jp-2',
    title: 'JLPT N2 听力对策',
    folder: '日本語',
    preview: 'N2 听力五大题型解析，即时应答题的常考场景与应对策略...',
    tags: ['日语', 'N2', '听力'],
    updatedAt: '昨天',
    wordCount: 1650,
    content: `## 题型分析

1. 課題理解
2. ポイント理解
3. 概要理解
4. 即時応答
5. 統合理解`
  },
  {
    id: 'jp-3',
    title: '日语敬语体系详解',
    folder: '日本語',
    preview: '尊敬语、谦让语、礼貌语的用法区别，以及常见动词的敬语形式...',
    tags: ['日语', '敬语', 'N1'],
    updatedAt: '3天前',
    wordCount: 2400,
    content: `## 敬语分类

- 尊敬語
- 謙譲語
- 丁寧語`
  },
  {
    id: 'jp-4',
    title: '日语拟声词拟态词归纳',
    folder: '日本語',
    preview: '拟声词（オノマトペ）是日语特色，掌握常见搭配让表达更地道...',
    tags: ['日语', '词汇', '表达'],
    updatedAt: '5天前',
    wordCount: 1800,
    content: `## 分类

- ガ行：硬、强烈
- カ行：干燥、清脆
- サ行：细长、流畅`
  },
  {
    id: 'jp-5',
    title: 'N1 语法难点突破',
    folder: '日本語',
    preview: 'N1 考试中常考的语法点：～を禁じえない、～を余儀なくされる...',
    tags: ['日语', 'N1', '语法'],
    updatedAt: '1周前',
    wordCount: 2100,
    content: `## 难点语法

- ～を禁じえない
- ～を余儀なくされる
- ～まじき`
  },

  // ========== 数据结构与算法 (4条) ==========
  {
    id: 'algo-1',
    title: '动态规划核心思想',
    folder: '数据结构与算法',
    preview: 'DP 的核心是状态和转移方程，常见题型：背包、最长子序列、区间 DP...',
    tags: ['算法', 'DP', '重点'],
    updatedAt: '2天前',
    wordCount: 3200,
    content: `## DP 三部曲

1. 定义状态
2. 状态转移
3. 初始化与边界

## 经典问题
- 0/1 背包
- 完全背包
- 最长公共子序列`
  },
  {
    id: 'algo-2',
    title: '图的遍历：DFS vs BFS',
    folder: '数据结构与算法',
    preview: '深度优先搜索和广度优先搜索的实现方式、应用场景对比...',
    tags: ['算法', '图论', '基础'],
    updatedAt: '4天前',
    wordCount: 2400,
    content: `## DFS

递归或栈实现，适合：
- 连通分量
- 拓扑排序
- 强连通分量

## BFS

队列实现，适合：
- 最短路径（无权图）
- 层次遍历`
  },
  {
    id: 'algo-3',
    title: '常见排序算法对比',
    folder: '数据结构与算法',
    preview: '冒泡、选择、插入、归并、快速排序的时间复杂度、稳定性分析...',
    tags: ['算法', '排序', '基础'],
    updatedAt: '6天前',
    wordCount: 1800,
    content: `## 复杂度对比

| 算法 | 平均 | 最坏 | 空间 | 稳定性 |
|------|------|------|------|--------|
| 冒泡 | n² | n² | 1 | ✓ |
| 快排 | nlogn | n² | logn | ✗ |
| 归并 | nlogn | nlogn | n | ✓ |`
  },
  {
    id: 'algo-4',
    title: '二叉树遍历技巧',
    folder: '数据结构与算法',
    preview: '前序、中序、后序、层序遍历的递归与非递归实现...',
    tags: ['算法', '树', '基础'],
    updatedAt: '1周前',
    wordCount: 2100,
    content: `## 递归写法

\`\`\`python
def inorder(root):
  if not root: return
  inorder(root.left)
  print(root.val)
  inorder(root.right)
\`\`\``
  },

  // ========== 计算机网络 (3条) ==========
  {
    id: 'net-1',
    title: 'TCP 三次握手与四次挥手',
    folder: '计算机网络',
    preview: 'TCP 连接建立和关闭的完整过程，为什么需要三次和四次...',
    tags: ['网络', 'TCP', '重点'],
    updatedAt: '3天前',
    wordCount: 2600,
    content: `## 三次握手

1. SYN
2. SYN-ACK
3. ACK

## 四次挥手

1. FIN
2. ACK
3. FIN
4. ACK`
  },
  {
    id: 'net-2',
    title: 'HTTP 状态码详解',
    folder: '计算机网络',
    preview: '1xx-5xx 各类状态码含义，常见 200、301、404、502 等场景分析...',
    tags: ['网络', 'HTTP', 'Web'],
    updatedAt: '5天前',
    wordCount: 1900,
    content: `## 分类

- 2xx：成功
- 3xx：重定向
- 4xx：客户端错误
- 5xx：服务器错误`
  },
  {
    id: 'net-3',
    title: '从输入 URL 到页面呈现',
    folder: '计算机网络',
    preview: '完整的浏览器渲染流程：DNS 解析、TCP 连接、HTTP 请求、渲染引擎...',
    tags: ['网络', '浏览器', '综合'],
    updatedAt: '1周前',
    wordCount: 3500,
    content: `## 流程

1. URL 解析
2. DNS 查询
3. TCP 连接
4. HTTP 请求
5. 服务器响应
6. 渲染引擎工作`
  },

  // ========== 数据库 (2条) ==========
  {
    id: 'db-1',
    title: 'MySQL 索引原理与优化',
    folder: '数据库',
    preview: 'B+树索引结构、聚簇索引、覆盖索引、最左前缀原则...',
    tags: ['MySQL', '索引', '优化'],
    updatedAt: '昨天',
    wordCount: 2800,
    content: `## 索引结构

B+ 树特点：
- 数据都在叶子节点
- 叶子节点形成链表
- 查询稳定 O(logN)`
  },
  {
    id: 'db-2',
    title: '事务 ACID 与隔离级别',
    folder: '数据库',
    preview: '原子性、一致性、隔离性、持久性，四种隔离级别及并发问题...',
    tags: ['MySQL', '事务', '基础'],
    updatedAt: '4天前',
    wordCount: 2300,
    content: `## ACID

- Atomicity
- Consistency
- Isolation
- Durability

## 隔离级别
- READ UNCOMMITTED
- READ COMMITTED
- REPEATABLE READ
- SERIALIZABLE`
  },

  // ========== 英语学习 (2条) ==========
  {
    id: 'en-1',
    title: '雅思写作 Task 2 结构模板',
    folder: '英语学习',
    preview: 'Argument、Discussion、Problem-Solution 三类作文的写作框架...',
    tags: ['英语', '雅思', '写作'],
    updatedAt: '2天前',
    wordCount: 1650,
    content: `## Argument 结构

Introduction: Paraphrase + Thesis
Body 1: Point + Explanation + Example
Body 2: Point + Explanation + Example
Conclusion: Summarize`
  },
  {
    id: 'en-2',
    title: '英语长难句分析技巧',
    folder: '英语学习',
    preview: '找主干、去修饰、理结构三步法，攻克阅读理解难题...',
    tags: ['英语', '阅读', '技巧'],
    updatedAt: '6天前',
    wordCount: 1400,
    content: `## 三步法

1. 找主干（主谓宾/主系表）
2. 去修饰（从句、非谓语）
3. 理结构（逻辑关系）`
  },

  // ========== 读书笔记 (3条) ==========
  {
    id: 'read-1',
    title: '《深入理解计算机系统》笔记',
    folder: '读书笔记',
    preview: 'CSAPP 第一章计算机系统漫游，信息的表示与处理要点总结...',
    tags: ['CSAPP', '计算机基础', '必读'],
    updatedAt: '今天',
    wordCount: 4200,
    content: `## 第一章 计算机系统漫游

程序的生命周期：从源代码到机器码

## 第二章 信息的表示和处理`
  },
  {
    id: 'read-2',
    title: '《代码整洁之道》核心观点',
    folder: '读书笔记',
    preview: 'Clean Code 的命名规范、函数设计、注释原则、错误处理等...',
    tags: ['编程思想', '代码质量', '必读'],
    updatedAt: '3天前',
    wordCount: 2600,
    content: `## 命名

- 见名知意
- 避免误导
- 有意义的区分

## 函数
- 短小
- 只做一件事
- 无副作用`
  },
  {
    id: 'read-3',
    title: '《设计模式》工厂模式详解',
    folder: '读书笔记',
    preview: '简单工厂、工厂方法、抽象工厂的区别与应用场景...',
    tags: ['设计模式', '面向对象', '进阶'],
    updatedAt: '1周前',
    wordCount: 3100,
    content: `## 工厂模式分类

1. 简单工厂
2. 工厂方法
3. 抽象工厂

## 应用场景`
  },

  // ========== 项目文档 (2条) ==========
  {
    id: 'doc-1',
    title: 'Papyrus 项目架构设计',
    folder: '项目文档',
    preview: '前端 React + TypeScript，后端 Python FastAPI，数据层 JSON 存储...',
    tags: ['Papyrus', '架构', '文档'],
    updatedAt: '今天',
    wordCount: 1800,
    content: `## 技术栈

- 前端：React 19 + TypeScript + Arco Design
- 后端：Python 3.14 + FastAPI
- 存储：JSON 文件`
  },
  {
    id: 'doc-2',
    title: 'API 接口文档',
    folder: '项目文档',
    preview: 'RESTful API 设计规范，笔记、卡片、设置的接口定义...',
    tags: ['Papyrus', 'API', '文档'],
    updatedAt: '2天前',
    wordCount: 1500,
    content: `## 笔记 API

- GET /api/notes - 列表
- POST /api/notes - 创建
- PUT /api/notes/:id - 更新
- DELETE /api/notes/:id - 删除`
  },

  // ========== 杂项 (2条) ==========
  {
    id: 'misc-1',
    title: '2024年学习规划',
    folder: '杂项',
    preview: '全年学习目标：通过 N1、完成 CSAPP、掌握 React 源码...',
    tags: ['规划', '目标', '年度'],
    updatedAt: '2周前',
    wordCount: 950,
    content: `## Q1 目标

- 高等数学一轮复习
- React 进阶学习

## Q2 目标
- 操作系统复习
- 日语 N2 考试`
  },
  {
    id: 'misc-2',
    title: '常用开发工具清单',
    folder: '杂项',
    preview: '编辑器、IDE、调试工具、版本控制、效率软件推荐...',
    tags: ['工具', '效率', '收藏'],
    updatedAt: '3周前',
    wordCount: 1200,
    content: `## 编辑器

- VS Code
- Vim
- JetBrains 系列

## 效率工具
- Alfred
- Rectangle`
  },
];

// 生成文件夹列表
export const generateFolders = (notes: Note[]): Folder[] => {
  const folderMap = new Map<string, number>();
  folderMap.set('全部笔记', notes.length);
  notes.forEach(note => {
    folderMap.set(note.folder, (folderMap.get(note.folder) || 0) + 1);
  });
  return Array.from(folderMap.entries()).map(([name, count]) => ({ name, count }));
};

// 生成标签列表
export const generateTags = (notes: Note[]): string[] => {
  const tagSet = new Set<string>();
  notes.forEach(note => note.tags.forEach(tag => tagSet.add(tag)));
  return Array.from(tagSet);
};
