# Arco Design React 组件库完整参考文档

> **文档用途**: 供 AI 前端开发参考使用  
> **组件来源**: [Arco Design React](https://arco.design/react/docs/overview)  
> **安装**: `npm install @arco-design/web-react`  
> **总组件数**: 60+  
> **采集日期**: 2026-05-03

---

## 文档目录

### 通用 (General) - 4 个组件
- [Icon 图标](#icon-图标)
- [Button 按钮](#button-按钮)
- [Link 链接](#link-链接)
- [Typography 排版](#typography-排版)

### 布局 (Layout) - 4 个组件
- [Divider 分割线](#divider-分割线)
- [Grid 栅格](#grid-栅格)
- [Layout 布局](#layout-布局)
- [Space 间距](#space-间距)

### 数据展示 (Data Display) - 19 个组件
- [Avatar 头像](#avatar-头像)
- [Badge 徽标](#badge-徽标)
- [Calendar 日历](#calendar-日历)
- [Card 卡片](#card-卡片)
- [Carousel 图片轮播](#carousel-图片轮播)
- [Collapse 折叠面板](#collapse-折叠面板)
- [Comment 评论](#comment-评论)
- [Descriptions 描述列表](#descriptions-描述列表)
- [Empty 空状态](#empty-空状态)
- [Image 图片](#image-图片)
- [List 列表](#list-列表)
- [Popover 气泡卡片](#popover-气泡卡片)
- [Statistic 数值显示](#statistic-数值显示)
- [Table 表格](#table-表格)
- [Tabs 标签页](#tabs-标签页)
- [Tag 标签](#tag-标签)
- [Timeline 时间轴](#timeline-时间轴)
- [Tooltip 文字气泡](#tooltip-文字气泡)
- [Tree 树](#tree-树)

### 数据输入 (Data Input) - 17 个组件
- [DatePicker 日期选择器](#datepicker-日期选择器)
- [TimePicker 时间选择器](#timepicker-时间选择器)
- [Input 输入框](#input-输入框)
- [InputNumber 数字输入框](#inputnumber-数字输入框)
- [AutoComplete 自动补全](#autocomplete-自动补全)
- [Checkbox 复选框](#checkbox-复选框)
- [Radio 单选框](#radio-单选框)
- [Rate 评分](#rate-评分)
- [Switch 开关](#switch-开关)
- [Select 选择器](#select-选择器)
- [TreeSelect 树选择](#treeselect-树选择)
- [Cascader 级联选择](#cascader-级联选择)
- [Slider 滑动输入条](#slider-滑动输入条)
- [Form 表单](#form-表单)
- [Upload 上传](#upload-上传)
- [Transfer 数据穿梭框](#transfer-数据穿梭框)
- [Mentions 提及](#mentions-提及)

### 反馈 (Feedback) - 10 个组件
- [Alert 警告提示](#alert-警告提示)
- [Drawer 抽屉](#drawer-抽屉)
- [Message 全局提示](#message-全局提示)
- [Notification 通知提醒框](#notification-通知提醒框)
- [Popconfirm 气泡确认框](#popconfirm-气泡确认框)
- [Progress 进度条](#progress-进度条)
- [Result 结果页](#result-结果页)
- [Spin 加载中](#spin-加载中)
- [Modal 对话框](#modal-对话框)
- [Skeleton 骨架屏](#skeleton-骨架屏)

### 导航 (Navigation) - 6 个组件
- [Breadcrumb 面包屑](#breadcrumb-面包屑)
- [Dropdown 下拉菜单](#dropdown-下拉菜单)
- [Menu 菜单](#menu-菜单)
- [PageHeader 页头](#pageheader-页头)
- [Pagination 分页](#pagination-分页)
- [Steps 步骤条](#steps-步骤条)

### 其他 (Others) - 6 个组件
- [ConfigProvider 全局配置](#configprovider-全局配置)
- [Affix 固钉](#affix-固钉)
- [Anchor 锚点](#anchor-锚点)
- [BackTop 返回顶部](#backtop-返回顶部)
- [Trigger 触发器](#trigger-触发器)
- [ResizeBox 伸缩框](#resizebox-伸缩框)

---

# Arco Design React 通用组件文档

> 采集时间: 2024年
> 组件类别: 通用 (General)

---

## 目录

1. [Icon 图标](#icon-图标)
2. [Button 按钮](#button-按钮)
3. [Link 链接](#link-链接)
4. [Typography 排版](#typography-排版)

---

## Icon 图标

**简介**: Arco Design 内置了大量的图标，通过 `<IconXXX />` 的形式即可使用。同时还支持自定义 Icon 和从 iconfont.cn 加载图标项目。

**基本用法**:
通过 `<IconXXX />` 的形式即可使用 Icon。注意使用驼峰命名法，例如 icon 的名字叫 `arrow-back`，那么对应的 Icon 名称为 `IconArrowBack`。

```tsx
import { Tooltip } from '@arco-design/web-react';
import { IconStar } from '@arco-design/web-react/icon';

const App = () => {
  return (
    <div style={{ color: 'var(--color-text-1)' }}>
      <Tooltip content='This is IconStar'>
        <IconStar style={{ fontSize: 24, marginRight: 20 }} />
      </Tooltip>
      <IconStar style={{ fontSize: 24, color: '#ffcd00' }} />
    </div>
  );
};

export default App;
```

**自定义 Icon**:
配合 `@svgr/webpack` 来引入 svg 文件使用。记得加上 `className="arco-icon"`，会添加上 arco 的默认 Icon 样式。

```tsx
import IconIronMan from './Iron Man.svg';

const App = () => {
  return (
    <div>
      <IconIronMan className='arco-icon' style={{ fontSize: '50px' }} />
    </div>
  );
};
```

**从 iconfont.cn 加载 Icon**:
调用组件库暴露的工具方法 `Icon.addFromIconfontCn`，把网站中导出 symbol 的代码传入 `src` 属性中加载项目图标库。

```tsx
const IconFont = Icon.addFromIconFontCn({
  src: 'url' // iconfont.cn 项目在线生成的 js 地址
});
```

**主要 Props ( `<IconXXX>` )**:

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| className | 节点类名 | `string \| string[]` | - |
| style | 节点样式 | `object` | `{}` |
| spin | 是否旋转 | `boolean` | `false` |

**Icon.addFromIconFontCn 参数**:

| 参数名 | 说明 | 类型 | 默认值 |
|--------|------|------|--------|
| src | iconfont.cn 项目在线生成的 js 地址 | `string` | - |
| extraProps | 给 svg 标签设置额外的属性 | `{[key: string]: any}` | `{}` |

**注意事项**:
- 使用驼峰命名法引用图标，`arrow-back` 对应 `IconArrowBack`
- 自定义 SVG Icon 必须加上 `className="arco-icon"` 以获得默认样式
- 从 iconfont.cn 加载的原理是创建了一个使用 `<use>` 标签来渲染图标的组件

---

## Button 按钮

**简介**: 按钮是一种命令组件，可发起一个即时操作。分为主要按钮、次要按钮、虚线按钮、线形按钮和文本按钮五种。

**基本用法**:
```tsx
import { Button, Space } from '@arco-design/web-react';

const App = () => {
  return (
    <Space size='large'>
      <Button type='primary'>Primary</Button>
      <Button type='secondary'>Secondary</Button>
      <Button type='dashed'>Dashed</Button>
      <Button type='outline'>Outline</Button>
      <Button type='text'>Text</Button>
    </Space>
  );
};

export default App;
```

**图标按钮**:
Button 可以嵌入图标，在只设置图标而没有 children 时，按钮的高宽相等。

```tsx
import { IconPlus, IconDelete } from '@arco-design/web-react/icon';

<Space size='large'>
  <Button type='primary' icon={<IconPlus />} />
  <Button type='primary' icon={<IconDelete />}>Delete</Button>
</Space>
```

**按钮状态**:
按钮状态分为 警告、危险、成功 三种，可以与按钮类型同时生效，优先级高于按钮类型。

```tsx
<Button type='primary' status='warning'>Warning</Button>
<Button type='primary' status='danger'>Danger</Button>
<Button type='primary' status='success'>Success</Button>
```

**加载中按钮**:
通过设置 `loading` 可以让一个按钮处于加载中状态。处于加载中状态的按钮不会触发点击事件。

```tsx
<Button type='primary' loading>Loading</Button>
<Button type='primary' loading={loading} onClick={onClick}>Click Me</Button>
```

**主要 Props**:

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| type | 按钮类型：主要、次要、虚框、文字、线性 | `'default' \| 'primary' \| 'secondary' \| 'dashed' \| 'text' \| 'outline'` | `default` |
| status | 按钮状态 | `'warning' \| 'danger' \| 'success' \| 'default'` | `default` |
| size | 按钮尺寸 | `'mini' \| 'small' \| 'default' \| 'large'` | `default` |
| shape | 按钮形状：圆形、全圆角、长方形 | `'circle' \| 'round' \| 'square'` | `square` |
| disabled | 是否禁用 | `boolean` | - |
| loading | 按钮是否是加载状态 | `boolean` | - |
| loadingFixedWidth | 当 loading 的时候，不改变按钮的宽度 | `boolean` | - |
| icon | 设置按钮的图标 | `ReactNode` | - |
| iconOnly | 只有图标，按钮宽高相等。如果指定 icon 且没有 children，iconOnly 默认为 true | `boolean` | - |
| long | 按钮宽度随容器自适应 | `boolean` | - |
| href | 添加跳转链接，设置此属性，button 表现跟 a 标签一致 | `string` | - |
| target | a 链接的 target 属性，href 存在时生效 | `string` | - |
| htmlType | 按钮原生的 html type 类型 | `'button' \| 'submit' \| 'reset'` | `button` |
| anchorProps | a 链接的原生属性，href 存在时生效 | `HTMLProps<HTMLAnchorElement>` | - |
| className | 节点类名 | `string \| string[]` | - |
| style | 节点样式 | `CSSProperties` | - |
| onClick | 点击按钮的回调 | `(e: Event) => void` | - |

**注意事项**:
- 按钮尺寸分为：迷你(24px)、小(28px)、中(32px)、大(36px)，推荐及默认尺寸为「中」
- `status` 优先级高于 `type`
- 处于 `loading` 状态的按钮不会触发点击事件
- 通过 `Button.Group` 可以使用组合按钮

---

## Link 链接

**简介**: 链接的基本样式。与按钮相比，链接不太突出，因此通常将其用作可选操作。

**基础用法**:
```tsx
import { Link, Space } from '@arco-design/web-react';

const App = () => {
  return (
    <Space size={40}>
      <Link href='#'>Link</Link>
      <Link href='#' disabled>Link</Link>
    </Space>
  );
};

export default App;
```

**其他状态**:
```tsx
<Link href='#' status='error'>Error Link</Link>
<Link href='#' status='success'>Success Link</Link>
<Link href='#' status='warning'>Warning Link</Link>
```

**图标链接**:
通过 `icon` 属性设置带图标的链接，设置为 `true` 时候显示默认图标。

```tsx
<Link href='#' icon>Hyperlinks</Link>
<Link href='#' icon={<IconEdit />}>Hyperlinks</Link>
```

**悬浮状态样式**:
可以通过 `hoverable` 属性设置是否在悬浮状态时隐藏底色。

```tsx
<Link hoverable={false}>Link</Link>
<Link hoverable={false} status='error'>Link</Link>
```

**主要 Props**:

| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| disabled | 是否禁用 | `boolean` | - | - |
| hoverable | 悬浮状态是否有底色 | `boolean` | `true` | 2.23.0 |
| status | 不同状态 | `'error' \| 'success' \| 'warning'` | - | - |
| icon | 显示图标，设置为 `true` 时展示默认图标 | `ReactNode \| boolean` | - | - |
| className | 节点类名 | `string \| string[]` | - | - |
| style | 节点样式 | `CSSProperties` | - | - |

**注意事项**:
- 链接通常用作可选操作，相比按钮不太突出
- `hoverable` 默认为 `true`，悬浮时会有底色
- 可以配合 `Dropdown` 组件实现带下拉选择的链接

---

## Typography 排版

**简介**: 用于展示标题、段落、文本内容。包含 Title、Paragraph、Text、Ellipsis 等子组件。

**组合使用**:
```tsx
import { Typography } from '@arco-design/web-react';
const { Title, Paragraph, Text } = Typography;

const App = () => {
  return (
    <Typography>
      <Title>Design system</Title>
      <Paragraph>
        A design is a plan or specification for the construction of an object or system...
      </Paragraph>
      <Paragraph>
        In some cases, the direct construction of an object...
        <Text bold>to be a design activity.</Text>
      </Paragraph>
      <Title heading={2}>ArcoDesign</Title>
      <Paragraph blockquote>
        A design is a plan or specification...
        <Text code>prototype</Text>, <Text code>product</Text> or <Text code>process</Text>.
      </Paragraph>
    </Typography>
  );
};

export default App;
```

**标题**:
```tsx
<Typography.Title>H1. The Pragmatic Romanticism</Typography.Title>
<Typography.Title heading={2}>H2. The Pragmatic Romanticism</Typography.Title>
<Typography.Title heading={3}>H3. The Pragmatic Romanticism</Typography.Title>
<Typography.Title heading={4}>H4. The Pragmatic Romanticism</Typography.Title>
<Typography.Title heading={5}>H5. The Pragmatic Romanticism</Typography.Title>
<Typography.Title heading={6}>H6. The Pragmatic Romanticism</Typography.Title>
```

**文本样式**:
```tsx
<Typography.Text>Arco Design</Typography.Text>
<Typography.Text type='secondary'>Secondary</Typography.Text>
<Typography.Text type='primary'>Primary</Typography.Text>
<Typography.Text type='success'>Success</Typography.Text>
<Typography.Text type='warning'>Warning</Typography.Text>
<Typography.Text type='error'>Error</Typography.Text>
<Typography.Text bold>Bold</Typography.Text>
<Typography.Text disabled>Disabled</Typography.Text>
<Typography.Text mark>Mark</Typography.Text>
<Typography.Text underline>Underline</Typography.Text>
<Typography.Text delete>Line through</Typography.Text>
<Typography.Text code>Code snippet</Typography.Text>
```

**文本省略 (推荐方式)**:
```tsx
import { Typography } from '@arco-design/web-react';

<Typography.Ellipsis rows={2} expandable showTooltip>
  {text}
</Typography.Ellipsis>
```

**主要 Props**:

### Typography.Title

| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| heading | 标题级别，相当于 h1~h6 | `1 \| 2 \| 3 \| 4 \| 5 \| 6` | `1` | - |
| bold | 粗体 | `boolean` | - | - |
| code | 代码块样式 | `boolean` | - | - |
| delete | 删除线样式 | `boolean` | - | - |
| disabled | 禁用状态 | `boolean` | - | - |
| underline | 下划线样式 | `boolean` | - | - |
| type | 文本类型 | `'primary' \| 'secondary' \| 'success' \| 'error' \| 'warning'` | - | - |
| mark | 标记样式 | `boolean \| { color: string }` | - | - |
| className | 节点类名 | `string \| string[]` | - | - |
| style | 节点样式 | `CSSProperties` | - | - |
| ellipsis | 自动溢出省略（不推荐使用，建议 Typography.Ellipsis 替代） | `boolean \| EllipsisConfig` | - | - |
| copyable | 开启复制功能 | `boolean \| { text?: string; onCopy?: (text: string, e) => void; icon?: ReactNode; tooltips?: [ReactNode, ReactNode]; tooltipProps?: TooltipProps }` | - | - |
| editable | 开启可编辑功能 | `boolean \| { editing?: boolean; tooltipProps?: TooltipProps; onStart?: (text, e) => void; onChange?: (text) => void; onEnd?: (text) => void }` | - | - |

### Typography.Paragraph

| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| blockquote | 长引用 | `boolean` | - | - |
| spacing | 段落行高，`default` 为默认行高，`close` 为紧密行高 | `'default' \| 'close'` | `default` | - |
| bold | 粗体 | `boolean` | - | - |
| code | 代码块样式 | `boolean` | - | - |
| delete | 删除线样式 | `boolean` | - | - |
| disabled | 禁用状态 | `boolean` | - | - |
| underline | 下划线样式 | `boolean` | - | - |
| type | 文本类型 | `'primary' \| 'secondary' \| 'success' \| 'error' \| 'warning'` | - | - |
| mark | 标记样式 | `boolean \| { color: string }` | - | - |
| className | 节点类名 | `string \| string[]` | - | - |
| style | 节点样式 | `CSSProperties` | - | - |
| ellipsis | 自动溢出省略（不推荐使用） | `boolean \| EllipsisConfig` | - | - |
| copyable | 开启复制功能 | `boolean \| CopyableConfig` | - | - |
| editable | 开启可编辑功能 | `boolean \| EditableConfig` | - | - |

### Typography.Text

| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| bold | 粗体 | `boolean` | - | - |
| code | 代码块样式 | `boolean` | - | - |
| delete | 删除线样式 | `boolean` | - | - |
| disabled | 禁用状态 | `boolean` | - | - |
| underline | 下划线样式 | `boolean` | - | - |
| type | 文本类型 | `'primary' \| 'secondary' \| 'success' \| 'error' \| 'warning'` | - | - |
| mark | 标记样式 | `boolean \| { color: string }` | - | - |
| className | 节点类名 | `string \| string[]` | - | - |
| style | 节点样式 | `CSSProperties` | - | - |
| ellipsis | 自动溢出省略（不推荐使用） | `boolean \| EllipsisConfig` | - | - |
| copyable | 开启复制功能 | `boolean \| CopyableConfig` | - | - |
| editable | 开启可编辑功能 | `boolean \| EditableConfig` | - | - |

### EllipsisConfig

| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| cssEllipsis | 自动溢出省略（只支持字符串），在大量使用情况下建议开启提高性能 | `boolean` | - | 2.36.0 |
| defaultExpanded | 默认展开 | `boolean` | - | 2.33.0 |
| expandable | 显示展开/折叠按钮 | `boolean` | - | - |
| expanded | 是否展开 | `boolean` | - | 2.33.0 |
| rows | 显示省略的行数 | `number` | `1` | - |
| ellipsisStr | 省略号 | `string` | `...` | - |
| suffix | 后缀 | `string` | - | - |
| showTooltip | 配置省略时的弹出框 | `boolean \| { type?: 'tooltip' \| 'popover'; props?: Record<string, any> }` | - | - |
| expandNodes | 配置折叠/展开的元素 | `ReactNode[]` | - | - |
| onEllipsis | 在省略发生改变的时候触发 | `(isEllipsis: boolean) => void` | - | - |
| onExpand | 在折叠/展开状态发生改变的时候触发 | `(isExpand: boolean, e) => void` | - | - |

### Typography.Ellipsis (推荐组件)

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| defaultExpanded | 默认展开 | `boolean` | - |
| disabled | 是否禁用省略功能 | `boolean` | - |
| expanded | 是否展开 | `boolean` | - |
| rows | 显示省略的行数 | `number` | `1` |
| className | 节点类名 | `string \| string[]` | - |
| expandable | 是否显示操控按钮（2.61.0 版本支持 `single` 属性） | `boolean \| { single?: boolean }` | `true` |
| showTooltip | 是否显示弹出提示 | `boolean \| TooltipProps` | - |
| style | 节点样式 | `CSSProperties` | - |
| expandRender | 自定义渲染操控按钮 | `(expanded: boolean) => ReactNode` | - |
| onEllipsis | 当省略状态发生改变时触发 | `(isEllipsis: boolean) => void` | - |
| onExpand | 点击展开、折叠时触发 | `(isExpand: boolean, ev: Event) => void` | - |

**注意事项**:
- 长文本(大于5行)推荐段落使用默认行高，短文本(小于等于3行)推荐使用 `close` 紧密行高
- 不推荐使用 `ellipsis` 属性开启折叠，建议使用 `Typography.Ellipsis` 组件替代
- 父元素 `flex` 模式下，省略的 `Typography` 的 `ellipsis` 场景会受影响，可以添加 `width: 100%` 使 `Typography` 充满整个父元素
- 使用谷歌翻译页面可能导致页面白屏报错（React.Fragment 问题），可设置 `ellipsis.wrapper` 解决，例如 `ellipsis={{ wrapper: 'span' }}`
- 2.36.0 版本对超出省略进行重构优化：
  - `ellipsis.cssEllipsis` 默认值由 `true` 变为 `false`
  - 开启 `ellipsis.cssEllipsis` 时会在排版组件下插入额外样式 dom，造成 dom 结构变化
  - 开启 `ellipsis.cssEllipsis` 支持多行省略场景，在大量使用场景下会有显著性能提高

---

> 文档采集完成。所有信息来源于 Arco Design React 官方文档页面。


# Arco Design React - 布局 (Layout) 组件文档

---

## Divider 分割线

**简介**: 划分内容区域，对模块做分隔。对不同章节的文本段落进行分割，默认为水平分割线，可在中间加入文字。

**基本用法**:
```tsx
import { Divider, Typography } from '@arco-design/web-react';
const { Paragraph } = Typography;

const App = () => {
  return (
    <div className='divider-demo'>
      <Paragraph>A design is a plan or specification for the construction of an object.</Paragraph>
      <Divider />
      <Paragraph>A design is a plan or specification for the construction of an object.</Paragraph>
      <Divider style={{ borderBottomStyle: 'dashed' }} />
      <Paragraph>A design is a plan or specification for the construction of an object.</Paragraph>
    </div>
  );
};
```

**带有文字的分割线**:
```tsx
import { Divider, Typography } from '@arco-design/web-react';
const { Paragraph } = Typography;

const App = () => {
  return (
    <div className='divider-demo'>
      <Paragraph>A design is a plan or specification for the construction of an object.</Paragraph>
      <Divider orientation='left'>Text</Divider>
      <Paragraph>A design is a plan or specification for the construction of an object.</Paragraph>
      <Divider orientation='center'>Text</Divider>
      <Paragraph>A design is a plan or specification for the construction of an object.</Paragraph>
      <Divider orientation='right'>Text</Divider>
    </div>
  );
};
```

**竖直分割线**:
```tsx
import { Divider, Typography } from '@arco-design/web-react';
const { Text } = Typography;

const App = () => {
  return (
    <div className='divider-demo'>
      <Text>Item 1</Text>
      <Divider type='vertical' />
      <Text>Item 2</Text>
      <Divider type='vertical' />
      <Text>Item 3</Text>
    </div>
  );
};
```

**主要 Props**:

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| orientation | 分割线文字的位置 | 'left' \| 'right' \| 'center' | center |
| type | 分割线的类型，是水平还是竖直 | 'horizontal' \| 'vertical' | horizontal |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**注意事项**:
- 竖直分割线 (`type='vertical'`) 不能带文字
- 可以通过 `style` 自定义分割线样式，如 `borderBottomStyle: 'dashed'`

---

## Grid 栅格

**简介**: 栅格可以有效的保证页面的一致性、逻辑性、加强团队协作和统一。

**基本用法**:
```tsx
import { Grid } from '@arco-design/web-react';
const Row = Grid.Row;
const Col = Grid.Col;

const App = () => {
  return (
    <div style={{ width: '100%' }} className='grid-demo-background'>
      <Row className='grid-demo' style={{ marginBottom: 16 }}>
        <Col span={24}><div>24 - 100%</div></Col>
      </Row>
      <Row className='grid-demo' style={{ marginBottom: 16 }}>
        <Col span={12}><div>12 - 50%</div></Col>
        <Col span={12}><div>12 - 50%</div></Col>
      </Row>
      <Row className='grid-demo' style={{ marginBottom: 16 }}>
        <Col span={8}><div>8 - 33.33%</div></Col>
        <Col span={8}><div>8 - 33.33%</div></Col>
        <Col span={8}><div>8 - 33.33%</div></Col>
      </Row>
    </div>
  );
};
```

**栅格偏移**:
```tsx
<Row>
  <Col span={8}>col - 8</Col>
  <Col span={8} offset={8}>col - 8 | offset - 8</Col>
</Row>
```

**Flex 用法**:
```tsx
<Row>
  <Col flex='100px'><div>100px</div></Col>
  <Col flex='auto'><div>auto</div></Col>
</Row>
<Row>
  <Col flex={3}><div>3/12</div></Col>
  <Col flex={4}><div>4/12</div></Col>
  <Col flex={5}><div>5/12</div></Col>
</Row>
```

**Grid 布局**:
```tsx
import { Grid } from '@arco-design/web-react';
const { GridItem } = Grid;

const App = () => {
  return (
    <Grid collapsed={false} cols={3} colGap={12} rowGap={16}>
      <GridItem className='demo-item'>item</GridItem>
      <GridItem className='demo-item'>item</GridItem>
      <GridItem className='demo-item'>item</GridItem>
      <GridItem className='demo-item' offset={1}>item | offset - 1</GridItem>
      <GridItem className='demo-item'>item</GridItem>
      <GridItem className='demo-item' span={3}>item | span - 3</GridItem>
      <GridItem className='demo-item' suffix>{({ overflow }) => `suffix | overflow: ${!!overflow}`}</GridItem>
    </Grid>
  );
};
```

**主要 Props**:

### Row
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| div | 开启后 Row 和 Col 都会被当作 div 而不附带 Grid 相关类和样式 | boolean | - | - |
| align | 竖直对齐方式 (align-items) | 'start' \| 'center' \| 'end' \| 'stretch' | start | - |
| justify | 水平对齐方式 (justify-content) | 'start' \| 'center' \| 'end' \| 'space-around' \| 'space-between' | start | - |
| className | 节点类名 | string \| string[] | - | - |
| gutter | 栅格间隔，单位是 px。可传入响应式对象或数组 [水平间距, 垂直间距] | GridRowGutter \| Array<GridRowGutter> | 0 | vertical gutter in 2.5.0 |
| style | 节点样式 | CSSProperties | - | - |

### Col
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| span | 栅格占位格数 | number | 24 | - |
| offset | 栅格左侧的间隔格数 | number | - | - |
| order | 对元素进行排序 | number | - | - |
| push | 对元素进行排序（向右推） | number | - | 2.20.0 |
| pull | 对元素进行排序（向左拉） | number | - | 2.20.0 |
| flex | 设置 flex 布局属性 | FlexType | - | 2.26.0 |
| className | 节点类名 | string \| string[] | - | - |
| style | 节点样式 | CSSProperties | - | - |
| xs | < 576px 响应式栅格 | number \| { [key: string]: any } | - | - |
| sm | >= 576px 响应式栅格 | number \| { [key: string]: any } | - | - |
| md | >= 768px 响应式栅格 | number \| { [key: string]: any } | - | - |
| lg | >= 992px 响应式栅格 | number \| { [key: string]: any } | - | - |
| xl | >= 1200px 响应式栅格 | number \| { [key: string]: any } | - | - |
| xxl | >= 1600px 响应式栅格 | number \| { [key: string]: any } | - | - |
| xxxl | >= 2000px 响应式栅格 | number \| { [key: string]: any } | - | 2.40.0 |

### Grid
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| collapsed | 是否折叠 | boolean | false |
| collapsedRows | 折叠时显示的行数 | number | 1 |
| className | 节点类名 | string \| string[] | - |
| colGap | 列与列之间的间距 | number \| ResponsiveValue | 0 |
| cols | 每一行展示的列数 | number \| ResponsiveValue | 24 |
| rowGap | 行与行之间的间距 | number \| ResponsiveValue | 0 |
| style | 节点样式 | CSSProperties | - |

### GridItem
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| suffix | 是否是后缀元素 | boolean | false |
| className | 节点类名 | string \| string[] | - |
| offset | 左侧的间隔格数 | number \| ResponsiveValue | 0 |
| span | 跨越的格数 | number \| ResponsiveValue | 1 |
| style | 节点样式 | CSSProperties | - |

**类型定义**:
- `GridRowGutter = number | Partial<Record<GridResponsiveBreakpoint, number>>`
- `FlexType = string | number | "auto" | "none"`
- `ResponsiveValue = { xs?: number, sm?: number, md?: number, lg?: number, xl?: number, xxl?: number, xxxl?: number }`

**注意事项**:
- 栅格系统基于 24 等分
- `Grid` 组件是基于 CSS Grid 布局实现的，支持折叠和后缀节点
- `GridItem` 的 `suffix` 属性会确保元素始终显示在一行结尾
- 响应式断点：xs(<576px)、sm(≥576px)、md(≥768px)、lg(≥992px)、xl(≥1200px)、xxl(≥1600px)、xxxl(≥2000px)

---

## Layout 布局

**简介**: 页面的基础布局框架，常与组件嵌套使用，构建页面整体布局。

**基本用法**:
```tsx
import { Layout } from '@arco-design/web-react';
const Sider = Layout.Sider;
const Header = Layout.Header;
const Footer = Layout.Footer;
const Content = Layout.Content;

const App = () => {
  return (
    <div className='layout-basic-demo'>
      {/* 上中下布局 */}
      <Layout style={{ height: '400px' }}>
        <Header>Header</Header>
        <Content>Content</Content>
        <Footer>Footer</Footer>
      </Layout>

      {/* 左侧边栏布局 */}
      <Layout style={{ height: '400px' }}>
        <Header>Header</Header>
        <Layout>
          <Sider>Sider</Sider>
          <Content>Content</Content>
        </Layout>
        <Footer>Footer</Footer>
      </Layout>

      {/* 右侧边栏布局 */}
      <Layout style={{ height: '400px' }}>
        <Header>Header</Header>
        <Layout>
          <Content>Content</Content>
          <Sider>Sider</Sider>
        </Layout>
        <Footer>Footer</Footer>
      </Layout>
    </div>
  );
};
```

**可伸缩侧边栏**:
```tsx
<Layout>
  <Header>Header</Header>
  <Layout>
    <Sider 
      resizeDirections={['right']}
      style={{ minWidth: 150, maxWidth: 500, height: 200 }}
    >
      Sider
    </Sider>
    <Content>Content</Content>
  </Layout>
  <Footer>Footer</Footer>
</Layout>
```

**主要 Props**:

### Layout
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| hasSider | 表示子元素里有 Sider，可用于服务端渲染时避免样式闪动 | boolean | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

### Layout.Header / Layout.Footer / Layout.Content
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

### Layout.Sider
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| collapsed | 当前收起状态 | boolean | - | - |
| collapsible | 是否可收起 | boolean | - | - |
| defaultCollapsed | 是否默认收起 | boolean | - | - |
| reverseArrow | 翻转折叠提示箭头的方向，当 Sider 在右边时可以使用 | boolean | - | - |
| collapsedWidth | 收缩宽度 | number | 48 | - |
| onCollapse | 展开-收起时的回调函数 | (collapse: boolean, type: 'clickTrigger' \| 'responsive') => void | - | - |
| theme | 主题颜色 | 'dark' \| 'light' | light | - |
| trigger | 自定义底部折叠触发器，设置为 null 时隐藏 trigger | string \| ReactNode | - | - |
| breakpoint | 触发响应式布局的断点 | GridResponsiveBreakpoint | - | - |
| width | 宽度 | number \| string | 200 | - |
| resizeDirections | 可以用 ResizeBox 替换原生 aside 标签，配置可拖拽方向 | string[] | - | - |
| resizeBoxProps | 接受 ResizeBox 所有参数，对菜单栏 width 进行受控或与 collapsed 联动 | ResizeBoxProps | - | 2.34.0 |
| className | 节点类名 | string \| string[] | - | - |
| style | 节点样式 | CSSProperties | - | - |

**注意事项**:
- Layout 子元素：Header/Sider/Footer/Content
- 常见的页面布局形式：上中下、左右、上中+侧边栏等
- `Sider` 可以通过 `resizeDirections` 实现可拖拽伸缩的侧边栏
- `Sider` 的 `breakpoint` 可触发响应式收缩
- 通过 `resizeBoxProps.onMoving` 可以实现既拖拽伸缩也可点击收缩的侧边栏

---

## Space 间距

**简介**: 设置组件之间的间距。避免组件紧贴在一起，保持合适的视觉距离。

**基本用法**:
```tsx
import { Space, Button, Switch, Typography, Tag } from '@arco-design/web-react';

const App = () => {
  return (
    <Space>
      <Typography.Text>Space:</Typography.Text>
      <Tag color='arcoblue'>Tag</Tag>
      <Button type='primary'>Item1</Button>
      <Button type='primary'>Item2</Button>
      <Switch defaultChecked />
    </Space>
  );
};
```

**垂直间距**:
```tsx
import { Space, Button } from '@arco-design/web-react';

const App = () => {
  return (
    <Space direction='vertical'>
      <Button type='primary'>Item1</Button>
      <Button type='primary'>Item2</Button>
      <Button type='primary'>Item3</Button>
    </Space>
  );
};
```

**尺寸**:
```tsx
import { Space, Button } from '@arco-design/web-react';

// 内置尺寸：mini(4px)、small(8px 默认)、medium(16px)、large(24px)
// 也支持数字自定义
<Space size='large'>
  <Button type='primary'>Item1</Button>
  <Button type='primary'>Item2</Button>
</Space>

// 2.15.0 开始支持数组形式 [水平间距, 垂直间距]
<Space size={[12, 18]}>
  <Button type='primary'>Item1</Button>
  <Button type='primary'>Item2</Button>
</Space>
```

**环绕间距与分隔符**:
```tsx
import { Space, Button, Link, Divider } from '@arco-design/web-react';

// 环绕间距（用于折行场景）
<Space wrap size={[12, 18]}>
  <Button type='primary'>Item1</Button>
  <Button type='primary'>Item2</Button>
</Space>

// 分隔符
<Space split={<Divider type='vertical' />}>
  <Link>Link 1</Link>
  <Link>Link 2</Link>
  <Link>Link 3</Link>
</Space>
```

**主要 Props**:

| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| direction | 间距方向 | 'vertical' \| 'horizontal' | horizontal | - |
| size | 尺寸，支持数组形式 [水平间距, 垂直间距] | SpaceSize \| SpaceSize[] | small | 2.15.0 支持数组 |
| align | 对齐方式 | 'start' \| 'end' \| 'center' \| 'baseline' | - | - |
| wrap | 环绕类型的间距，用于折行的场景 | boolean | - | - |
| split | 设置分隔符 | ReactNode | - | 2.22.0 |
| className | 节点类名 | string \| string[] | - | - |
| style | 节点样式 | CSSProperties | - | - |

**类型定义**:
- `SpaceSize = "mini" | "small" | "medium" | "large" | number`

**注意事项**:
- 内置 4 个尺寸：`mini`(4px)、`small`(8px，默认)、`medium`(16px)、`large`(24px)
- 也支持传入数字来自定义尺寸
- `size` 从 2.15.0 开始支持数组形式 `[水平间距, 垂直间距]`
- `align` 在水平模式下默认为 `center`
- `wrap` 属性用于环绕类型间距，一般用于换行场景
- `split` 可以为相邻子元素设置分隔符（如 `Divider`）

---

*文档来源: [Arco Design React](https://arco.design/react/components/)*


# Arco Design React 数据展示组件文档

---

## 1. Avatar (头像)

**简介**: 用作头像显示，可以为图片、图标或字符形式展示。支持文字自动调整字体大小来适应头像框。

**基本用法**:
```tsx
import { Avatar, Space } from '@arco-design/web-react';
import { IconUser } from '@arco-design/web-react/icon';

const App = () => {
  return (
    <Space size="large">
      <Avatar>A</Avatar>
      <Avatar style={{ backgroundColor: '#3370ff' }}>
        <IconUser />
      </Avatar>
      <Avatar style={{ backgroundColor: '#00d0b6' }}>Design</Avatar>
      <Avatar>
        <img alt="avatar" src="//p1-arco.byteimg.com/..." />
      </Avatar>
    </Space>
  );
};
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| autoFixFontSize | 是否自动根据头像尺寸调整字体大小 | boolean | true |
| size | 头像的尺寸大小，单位是 px | number | 40 |
| shape | 头像的形状(circle/square) | 'circle' \| 'square' | circle |
| triggerType | 可点击的头像交互类型 | 'mask' \| 'button' | button |
| triggerIcon | 可点击的头像交互图标 | ReactNode | - |
| onClick | 点击回调 | (e) => void | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**Avatar.Group Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| maxCount | 头像组最多显示的头像数量 | number | - |
| size | 头像组尺寸 | number | - |
| shape | 头像组形状 | 'circle' \| 'square' | circle |
| zIndexAscend | z-index 递增，默认递减 | boolean | - |

**注意事项**: 头像组使用 `Avatar.Group`，文字头像会自动调整字体大小适应容器。

---

## 2. Badge (徽标)

**简介**: 一般出现在图标或文字的右上角。提供及时、重要的信息提示。

**基本用法**:
```tsx
import { Badge, Avatar, Space } from '@arco-design/web-react';

const App = () => {
  return (
    <Space size={40}>
      <Badge count={9}>
        <Avatar shape="square" />
      </Badge>
      <Badge count={9} dot dotStyle={{ width: 10, height: 10 }}>
        <Avatar shape="square" />
      </Badge>
      <Badge count={100} maxCount={99} />
    </Space>
  );
};
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| count | 徽标显示的数字 | number \| ReactNode | 0 |
| dot | 显示为小红点 | boolean | - |
| maxCount | 徽标最大显示数值 | number | 99 |
| text | 自定义提示内容 | string | - |
| color | 内置颜色或自定义色值 | string | - |
| status | 徽标状态类型 | 'default' \| 'processing' \| 'success' \| 'warning' \| 'error' | - |
| offset | 设置徽标位置的偏移 | [number, number] | - |
| dotStyle | 徽标的样式 | CSSProperties | - |
| className | 节点类名 | string \| string[] | - |

**注意事项**: `count > 0` 时才展示徽标；`dot=true` 时只显示小红点。

---

## 3. Calendar (日历)

**简介**: 日历组件，用于日期展示和选择。

**基本用法**:
```tsx
import { Calendar } from '@arco-design/web-react';

const App = () => {
  return (
    <div style={{ width: '100%', overflow: 'auto' }}>
      <Calendar defaultValue="2020-04-01" />
    </div>
  );
};
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| defaultValue | 默认显示的日期 | string \| Dayjs | - |
| value | 当前显示的日期(受控) | string \| Dayjs | - |
| mode | 日历模式(月/年) | 'month' \| 'year' | month |
| panel | 是否以卡片形式展示 | boolean | false |
| headerType | 头部切换类型 | 'default' \| 'select' | default |
| onChange | 日期改变时的回调 | (date: Dayjs) => void | - |
| onPanelChange | 面板切换回调 | (date: Dayjs, mode: string) => void | - |
| dateRender | 自定义日期单元格渲染 | (currentDate: Dayjs) => ReactNode | - |
| monthRender | 自定义月份单元格渲染 | (currentDate: Dayjs) => ReactNode | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**注意事项**: 支持下拉选择的头部，更快速定位日期。

---

## 4. Card (卡片)

**简介**: 将信息分类后分标题、详情等区域聚合展现，一般作为简洁介绍或者信息的大盘和入口。

**基本用法**:
```tsx
import { Card, Link } from '@arco-design/web-react';

const App = () => {
  return (
    <Card
      style={{ width: 360 }}
      title="Arco Card"
      extra={<Link>More</Link>}
    >
      ByteDance's core product, Toutiao ("Headlines"), is a content platform...
    </Card>
  );
};
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| title | 卡片标题 | string \| ReactNode | - |
| extra | 卡片右上角的操作区域 | string \| ReactNode | - |
| bordered | 是否有边框 | boolean | true |
| hoverable | 是否可悬浮 | boolean | - |
| loading | 是否为加载中 | boolean | - |
| size | 卡片尺寸 | 'default' \| 'small' | default |
| cover | 卡片封面 | ReactNode | - |
| actions | 卡片底部的操作组 | ReactNode[] | - |
| bodyStyle | 内容区域自定义样式 | CSSProperties | - |
| headerStyle | 自定义标题区域样式 | CSSProperties | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**Card.Meta Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| avatar | 头像 | ReactNode | - |
| description | 描述 | string \| ReactNode | - |
| title | 标题 | string \| ReactNode | - |

**注意事项**: 支持嵌套卡片，内部可使用 Tabs 组件。

---

## 5. Carousel (图片轮播)

**简介**: 用于展示多张图片、视频或内嵌框架等内容的循环播放，支持系统自动播放或用户手动切换。

**基本用法**:
```tsx
import { Carousel } from '@arco-design/web-react';

const imageSrc = [
  '//p1-arco.byteimg.com/...',
  '//p1-arco.byteimg.com/...',
];

const App = () => {
  return (
    <Carousel style={{ width: 600, height: 240 }}>
      {imageSrc.map((src, index) => (
        <div key={index}>
          <img src={src} style={{ width: '100%' }} />
        </div>
      ))}
    </Carousel>
  );
};
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| currentIndex | 当前展示索引 | number | 0 |
| autoPlay | 是否自动循环展示 | boolean \| { interval?: number; hoverToPause?: boolean } | - |
| animation | 切换动画 | 'slide' \| 'card' \| 'fade' | slide |
| direction | 幻灯片移动方向 | 'horizontal' \| 'vertical' | horizontal |
| indicatorPosition | 指示器位置 | 'bottom' \| 'top' \| 'left' \| 'right' \| 'outer' \| 'outer-right' | bottom |
| indicatorType | 指示器类型 | 'line' \| 'dot' \| 'slider' \| 'never' | dot |
| showArrow | 切换箭头显示时机 | 'always' \| 'hover' \| 'never' | always |
| trigger | 切换触发方式 | 'click' \| 'hover' | click |
| moveSpeed | 幻灯片移动速率(ms) | number | 500 |
| timingFunc | 过渡速度曲线 | string | cubic-bezier(0.34, 0.69, 0.1, 1) |
| carousel | 用于获得 Carousel 引用 | MutableRefObject | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**注意事项**: 自定义组件作为子元素时需支持 `style` 和 `className`。

---

## 6. Collapse (折叠面板)

**简介**: 可以折叠/展开的内容区域，用于将复杂的内容区域分组和隐藏。

**基本用法**:
```tsx
import { Collapse, Divider } from '@arco-design/web-react';
const CollapseItem = Collapse.Item;

const App = () => {
  return (
    <Collapse defaultActiveKey={['1', '2']}>
      <CollapseItem header="Header 1" name="1">
        Content 1
      </CollapseItem>
      <CollapseItem header="Header 2" name="2" disabled>
        Content 2
      </CollapseItem>
      <CollapseItem header="Header 3" name="3">
        Content 3
      </CollapseItem>
    </Collapse>
  );
};
```

**主要 Props (Collapse)**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| accordion | 是否是手风琴模式 | boolean | - |
| bordered | 无边框样式 | boolean | true |
| activeKey | 当前面板选中值(受控) | string \| string[] | - |
| defaultActiveKey | 默认展开的面板 | string \| string[] | - |
| destroyOnHide | 是否销毁被折叠的面板 | boolean | - |
| lazyload | 挂载时是否渲染被隐藏面板 | boolean | true |
| expandIconPosition | 展开图标位置 | 'left' \| 'right' | left |
| triggerRegion | 可触发折叠操作的区域 | 'header' \| 'icon' | - |
| onChange | 展开面板改变时触发 | (key, keys, e) => void | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**Collapse.Item Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| name | 唯一标识(必填) | string | - |
| header | 面板头部 | string \| ReactNode | - |
| disabled | 是否禁用 | boolean | - |
| extra | 额外节点 | ReactNode | - |
| showExpandIcon | 是否展示展开按钮 | boolean | true |
| destroyOnHide | 折叠时是否销毁节点 | boolean | - |

**注意事项**: 支持手风琴模式、嵌套面板、懒加载和隐藏时销毁。

---

## 7. Comment (评论)

**简介**: 展示评论信息，带有作者、头像、时间和操作。

**基本用法**:
```tsx
import { Comment, Avatar } from '@arco-design/web-react';
import { IconHeart, IconMessage, IconStar } from '@arco-design/web-react/icon';

const App = () => {
  const actions = [
    <span key="heart"><IconHeart /> 83</span>,
    <span key="reply"><IconMessage /> Reply</span>,
  ];

  return (
    <Comment
      actions={actions}
      author="Socrates"
      avatar={
        <Avatar>
          <img alt="avatar" src="..." />
        </Avatar>
      }
      content={<div>Comment body content.</div>}
      datetime="1 hour"
    />
  );
};
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| author | 作者名 | string \| ReactNode | - |
| avatar | 头像 | ReactNode | - |
| content | 评论内容 | string \| ReactNode | - |
| datetime | 评论时间 | string \| ReactNode | - |
| actions | 评论操作项 | ReactNode[] | - |
| align | datetime 和 actions 的对齐方式 | 'left' \| 'right' \| 'center' | left |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**注意事项**: 支持嵌套评论，可以配合 List 组件使用。

---

## 8. Descriptions (描述列表)

**简介**: 一般用于详情页的信息展示，简单地成组展示多个只读字段。

**基本用法**:
```tsx
import { Descriptions } from '@arco-design/web-react';

const data = [
  { label: 'Name', value: 'Socrates' },
  { label: 'Mobile', value: '123-1234-1234' },
  { label: 'Residence', value: 'Beijing' },
];

const App = () => {
  return (
    <Descriptions
      colon=":"
      layout="inline-horizontal"
      title="User Info"
      data={data}
    />
  );
};
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| data | 描述列表的数据 | { label?: ReactNode; value?: ReactNode }[] | - |
| title | 标题 | string \| ReactNode | - |
| colon | 是否显示冒号 | string \| boolean | - |
| layout | 布局方式 | 'inline-horizontal' \| 'inline-vertical' \| 'horizontal' \| 'vertical' | inline-horizontal |
| labelStyle | 标签样式 | CSSProperties | - |
| valueStyle | 值样式 | CSSProperties | - |
| column | 一行的 DescriptionItems 数量 | number | 3 |
| bordered | 是否带边框 | boolean | - |
| size | 列表尺寸 | 'mini' \| 'small' \| 'medium' \| 'default' \| 'large' | default |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**注意事项**: 支持多种布局方式、边框展示和响应式排列。

---

## 9. Empty (空状态)

**简介**: 指当前场景没有对应数据内容时的状态展示。

**基本用法**:
```tsx
import { Empty } from '@arco-design/web-react';

const App = () => {
  return <Empty description="No data" />;
};
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| description | 描述文字 | string \| ReactNode | - |
| icon | 自定义图标 | ReactNode | - |
| imgSrc | 自定义图片地址 | string | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**注意事项**: 可自定义图标、图片和描述内容。

---

## 10. Image (图片)

**简介**: 展示和预览图片，支持自定义预览、懒加载、渐进加载等功能。

**基本用法**:
```tsx
import { Image } from '@arco-design/web-react';

function App() {
  return (
    <Image
      width={200}
      src="//p1-arco.byteimg.com/..."
      alt="lamp"
    />
  );
}
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| src | 图片地址 | string | - |
| alt | 图片alt文字 | string | - |
| width | 图片宽度 | number \| string | - |
| height | 图片高度 | number \| string | - |
| title | 标题 | string | - |
| description | 描述 | string | - |
| footerPosition | 标题和描述显示位置 | 'inner' \| 'outer' | inner |
| actions | 额外操作 | ReactNode[] | - |
| previewProps | 预览配置 | { visible?, defaultVisible?, onVisibleChange?, ... } | - |
| loader | 是否显示加载状态 | boolean \| ReactNode | true |
| error | 加载失败时的显示内容 | ReactNode | - |
| lazyload | 是否懒加载 | boolean | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**注意事项**: 自定义组件作为子元素需支持 `style` 和 `className`。

---

## 11. List (列表)

**简介**: 最基础的列表展示，可承载文字、列表、图片、段落，常用于后台数据展示页面。

**基本用法**:
```tsx
import { List } from '@arco-design/web-react';

const App = () => {
  return (
    <List
      style={{ width: 622 }}
      size="small"
      header="List title"
      dataSource={[
        'Beijing Bytedance Technology Co., Ltd.',
        'Bytedance Technology Co., Ltd.',
      ]}
      render={(item, index) => <List.Item key={index}>{item}</List.Item>}
    />
  );
};
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| dataSource | 列表数据源 | any[] | - |
| size | 列表尺寸 | 'small' \| 'default' \| 'large' | default |
| bordered | 是否显示边框 | boolean | - |
| split | 是否显示分割线 | boolean | true |
| loading | 是否加载中 | boolean | - |
| header | 列表头部 | ReactNode | - |
| footer | 列表底部 | ReactNode | - |
| emptyContent | 空内容展示 | ReactNode | - |
| render | 自定义渲染函数 | (item, index) => ReactNode | - |
| grid | 栅格配置 | { gutter?, span?, xs?, sm?, md?, lg?, xl?, xxl? } | - |
| virtualListProps | 虚拟列表配置 | { height?, threshold? } | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**List.Item Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| actions | 列表项操作组 | ReactNode[] | - |
| extra | 额外内容 | ReactNode | - |

**注意事项**: 支持虚拟列表、栅格布局、滚动加载和无限长列表。

---

## 12. Popover (气泡卡片)

**简介**: 点击/悬停弹出气泡式卡片，可放置更复杂的内容，如标题、描述和交互元素。

**基本用法**:
```tsx
import { Popover, Button } from '@arco-design/web-react';

const App = () => {
  return (
    <Popover
      title="标题"
      content="气泡卡片内容"
    >
      <Button>悬停弹出</Button>
    </Popover>
  );
};
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| title | 标题 | ReactNode | - |
| content | 内容 | ReactNode \| (() => ReactNode) | - |
| position | 弹出位置 | 'top' \| 'tl' \| 'tr' \| 'bottom' \| 'bl' \| 'br' \| 'left' \| 'lt' \| 'lb' \| 'right' \| 'rt' \| 'rb' | top |
| trigger | 触发方式 | 'hover' \| 'focus' \| 'click' | hover |
| popupVisible | 是否显示(受控) | boolean | - |
| defaultPopupVisible | 默认是否显示 | boolean | - |
| disabled | 是否禁用 | boolean | - |
| getPopupContainer | 弹出容器 | (node) => Element | - |
| onVisibleChange | 显示状态变化回调 | (visible: boolean) => void | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**注意事项**: 继承 Tooltip 的所有 props，支持更丰富的内容展示。

---

## 13. Statistic (数值显示)

**简介**: 突出展示某个或某组数字、带描述的统计类数据。

**基本用法**:
```tsx
import { Statistic } from '@arco-design/web-react';

const App = () => {
  return (
    <div>
      <Statistic
        title="Downloads"
        value={125670}
        groupSeparator
        style={{ marginRight: 60 }}
      />
      <Statistic
        extra="Comments"
        value={40509}
        groupSeparator
        precision={2}
      />
    </div>
  );
};
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| value | 数值 | string \| number \| Dayjs | - |
| title | 数值的标题 | string \| ReactNode | - |
| extra | 在数值下展示额外内容 | ReactNode | - |
| prefix | 前缀 | string \| ReactNode | - |
| suffix | 后缀 | string \| ReactNode | - |
| precision | 数字精度 | number | - |
| groupSeparator | 显示千位分割符 | boolean | - |
| countUp | 数字动态变大 | boolean | - |
| countDuration | 动态变大的过渡时间(ms) | number | 2000 |
| countFrom | 从什么数字开始动态变大 | number | 0 |
| format | dayjs 的 format | string | - |
| renderFormat | 自定义 render 函数 | (value, formattedValue) => ReactNode | - |
| loading | 数字是否加载中 | boolean | - |
| styleValue | 数值的样式 | CSSProperties | - |
| styleDecimal | 数值小数部分的样式 | CSSProperties | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**Statistic.Countdown Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| value | 目标时间 | string \| number \| Dayjs | - |
| now | 当前时间(修正显示) | string \| number \| Dayjs | - |
| format | 时间格式 | string | HH:mm:ss |
| start | 是否开始倒计时 | boolean | true |
| onFinish | 倒计时完成回调 | () => void | - |

**注意事项**: 支持数值动效(countUp)、倒计时组件(Countdown)和千位分隔符。

---

## 14. Table (表格)

**简介**: 用于数据收集展示、分析整理、操作处理。

**基本用法**:
```tsx
import { Table } from '@arco-design/web-react';

const columns = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Salary', dataIndex: 'salary' },
  { title: 'Address', dataIndex: 'address' },
  { title: 'Email', dataIndex: 'email' },
];

const data = [
  { key: '1', name: 'Jane Doe', salary: 23000, address: '32 Park Road, London', email: 'jane.doe@example.com' },
];

const App = () => {
  return <Table columns={columns} data={data} />;
};
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| columns | 列配置 | TableColumnProps[] | - |
| data | 数据 | any[] | - |
| border | 是否显示边框 | boolean \| { headerCell?, bodyCell?, wrapper? } | - |
| borderCell | 是否显示单元格边框 | boolean | - |
| hover | 是否开启鼠标悬浮效果 | boolean | true |
| stripe | 是否开启斑马纹 | boolean | - |
| size | 表格尺寸 | 'default' \| 'middle' \| 'small' \| 'mini' | default |
| loading | 是否加载中 | boolean | - |
| pagination | 分页配置 | PaginationProps \| boolean | true |
| pagePosition | 分页器位置 | 'br' \| 'bl' \| 'tr' \| 'tl' \| 'topCenter' \| 'bottomCenter' | br |
| rowSelection | 行选择配置 | { type?, selectedRowKeys?, onChange?, ... } | - |
| expandable | 展开行配置 | { expandedRowRender?, onExpand?, ... } | - |
| scroll | 滚动配置 | { x?, y? } | - |
| virtualized | 是否开启虚拟滚动 | boolean | - |
| indentSize | 树形数据层级偏移像素 | number | 15 |
| childrenColumnName | 树形数据字段名 | string | children |
| tableLayoutFixed | table-layout 设为 fixed | boolean | - |
| showHeader | 是否显示表头 | boolean | true |
| noDataElement | 无数据时显示元素 | string \| ReactNode | <Empty /> |
| onChange | 分页、排序、筛选回调 | (pagination, sorter, filters, extra) => void | - |
| components | 自定义组件 | { header?, body? } | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**TableColumnProps**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| title | 列标题 | ReactNode | - |
| dataIndex | 数据字段 | string | - |
| width | 列宽 | number \| string | - |
| fixed | 固定列 | 'left' \| 'right' | - |
| align | 对齐方式 | 'left' \| 'center' \| 'right' | left |
| sorter | 排序 | boolean \| ((a, b) => number) \| { compare?, multiple? } | - |
| filters | 筛选菜单 | { text, value }[] | - |
| render | 自定义渲染 | (col, record, index) => ReactNode | - |
| className | 列类名 | string \| string[] | - |

**注意事项**: 支持虚拟滚动(大数据)、树形数据、固定列、排序筛选、可编辑单元格、拖拽排序和表头吸顶。

---

## 15. Tabs (标签页)

**简介**: 将内容组织在同一视图中，一次可查看一个视图内容，查看其他内容可切换选项卡。

**基本用法**:
```tsx
import { Tabs, Typography } from '@arco-design/web-react';
const TabPane = Tabs.TabPane;

const App = () => {
  return (
    <Tabs defaultActiveTab="1">
      <TabPane key="1" title="Tab 1">
        <Typography.Paragraph>Content of Tab Panel 1</Typography.Paragraph>
      </TabPane>
      <TabPane key="2" title="Tab 2" disabled>
        <Typography.Paragraph>Content of Tab Panel 2</Typography.Paragraph>
      </TabPane>
      <TabPane key="3" title="Tab 3">
        <Typography.Paragraph>Content of Tab Panel 3</Typography.Paragraph>
      </TabPane>
    </Tabs>
  );
};
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| activeTab | 当前选中的 tab key(受控) | string | - |
| defaultActiveTab | 默认选中的标签 | string | - |
| type | 标签页类型 | 'line' \| 'card' \| 'card-gutter' \| 'text' \| 'rounded' \| 'capsule' | line |
| tabPosition | 选项卡位置 | 'left' \| 'right' \| 'top' \| 'bottom' | top |
| direction | 方向(已废弃，用 tabPosition) | 'horizontal' \| 'vertical' | - |
| size | 尺寸 | 'mini' \| 'small' \| 'default' \| 'large' | - |
| destroyOnHide | 是否销毁隐藏标签页节点 | boolean | - |
| lazyload | 挂载时是否渲染被隐藏标签页 | boolean | true |
| editable | 是否允许增减标签 | boolean | - |
| showAddButton | 是否显示新增按钮 | boolean | true |
| headerPadding | 头部是否存在水平边距 | boolean | true |
| justify | 高度撑满容器 | boolean | - |
| overflow | 标签页较多时展示形式 | 'scroll' \| 'dropdown' | scroll |
| scrollPosition | 被选中 tab 的滚动位置 | 'start' \| 'end' \| 'center' \| 'auto' \| number | auto |
| inkBarSize | 定制下划线尺寸 | { width?, height? } | - |
| onChange | 切换标签回调 | (key: string) => void | - |
| onAdd | 新增标签回调 | () => void | - |
| onDelete | 删除标签回调 | (key: string) => void | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**TabPane Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| title | 选项卡标题 | string \| ReactNode | - |
| key | 唯一标识 | string | - |
| disabled | 是否禁用 | boolean | - |
| destroyOnHide | 隐藏时是否销毁 | boolean | - |
| closable | 是否可关闭 | boolean | - |

**注意事项**: 支持多种类型、位置、尺寸、动态增减、可拖拽、嵌套使用和虚拟列表。

---

## 16. Tag (标签)

**简介**: 用于标记事物的属性和维度，进行分类。

**基本用法**:
```tsx
import { Tag, Space } from '@arco-design/web-react';

const App = () => {
  return (
    <Space size="large">
      <Tag>Tag 1</Tag>
      <Tag color="arcoblue">Blue</Tag>
      <Tag color="red" closable>Red</Tag>
      <Tag checkable>Checkable</Tag>
    </Space>
  );
};
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| color | 标签背景色 | string | - |
| size | 标签尺寸 | 'small' \| 'default' \| 'medium' \| 'large' | default |
| closable | 是否可关闭 | boolean | - |
| checkable | 是否可选中 | boolean | - |
| checked | 是否选中(受控) | boolean | - |
| defaultChecked | 默认是否选中 | boolean | - |
| visible | 是否可见(受控) | boolean | - |
| bordered | 是否有边框 | boolean | - |
| closeIcon | 自定义关闭图标 | ReactNode | - |
| icon | 设置图标 | ReactNode | - |
| onClose | 关闭回调 | (e) => Promise<any> \| void | - |
| onCheck | 选中回调 | (checked: boolean) => void | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**注意事项**: 支持多种预设颜色、可选中、可关闭、自定义图标。

---

## 17. Timeline (时间轴)

**简介**: 按照时间顺序或倒序规则的展示信息内容。

**基本用法**:
```tsx
import { Timeline, Switch, Typography } from '@arco-design/web-react';
const TimelineItem = Timeline.Item;

class App extends React.Component {
  state = { reverse: false };
  render() {
    return (
      <div>
        <Switch
          checked={this.state.reverse}
          onChange={() => this.setState({ reverse: !this.state.reverse })}
        />
        <Timeline reverse={this.state.reverse}>
          <TimelineItem label="2017-03-10">The first milestone</TimelineItem>
          <TimelineItem label="2018-05-12">The second milestone</TimelineItem>
          <TimelineItem label="2020-09-30">The third milestone</TimelineItem>
        </Timeline>
      </div>
    );
  }
}
```

**主要 Props (Timeline)**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| reverse | 是否倒序 | boolean | - |
| direction | 时间轴方向 | 'horizontal' \| 'vertical' | vertical |
| labelPosition | 设置标签文本的位置 | 'relative' \| 'same' | same |
| mode | 展示类型 | 'left' \| 'right' \| 'top' \| 'bottom' \| 'alternate' | left(vertical) \| top(horizontal) |
| pending | 是否展示幽灵节点 | boolean \| ReactNode | - |
| pendingDot | 定制幽灵节点 | ReactNode | <Spin size={12} /> |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**Timeline.Item Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| dotColor | 节点颜色 | string | - |
| dotType | 节点类型 | 'hollow' \| 'solid' | solid |
| lineType | 时间轴类型 | 'solid' \| 'dashed' \| 'dotted' | solid |
| lineColor | 时间轴颜色 | string | - |
| dot | 自定义节点 | string \| ReactNode | - |
| label | 标签文本 | string \| ReactNode | - |
| labelPosition | 时间轴节点位置 | 'relative' \| 'same' | - |
| autoFixDotSize | 是否自动适配自定义节点尺寸到 16px | boolean | true |
| className | 节点类名 | string \| string[] | - |

**注意事项**: 支持横向/纵向、多种节点样式、幽灵节点和交替展示。

---

## 18. Tooltip (文字气泡)

**简介**: 鼠标悬停、聚焦或点击在某个组件时，弹出的文字提示。

**基本用法**:
```tsx
import { Tooltip, Typography } from '@arco-design/web-react';
const { Text } = Typography;

const App = () => {
  return (
    <div>
      <Tooltip content="This is tooltip content">
        <Text>Mouse over to display tooltip</Text>
      </Tooltip>
    </div>
  );
};
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| content | 气泡内容 | string \| ReactNode | - |
| position | 气泡位置 | 'top' \| 'tl' \| 'tr' \| 'bottom' \| 'bl' \| 'br' \| 'left' \| 'lt' \| 'lb' \| 'right' \| 'rt' \| 'rb' | top |
| trigger | 触发方式 | 'hover' \| 'focus' \| 'click' | hover |
| mini | 迷你尺寸 | boolean | - |
| popupVisible | 是否显示(受控) | boolean | - |
| defaultPopupVisible | 默认是否显示 | boolean | - |
| disabled | 是否禁用 | boolean | - |
| color | 背景颜色 | string | - |
| getPopupContainer | 弹出容器 | (node) => Element | - |
| onVisibleChange | 显示状态变化回调 | (visible: boolean) => void | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**注意事项**: 支持 12 个方位、受控模式、迷你尺寸和不同颜色。

---

## 19. Tree (树)

**简介**: 对于文件夹、分类目录、组织架构等层级较多的内容，树可以清楚显示层级关系，并具有展开、收起、选择等交互功能。

**基本用法**:
```tsx
import { Tree } from '@arco-design/web-react';
const TreeNode = Tree.Node;

const App = () => {
  return (
    <Tree
      defaultExpandedKeys={['0-0-0']}
      defaultSelectedKeys={['0-0-0', '0-0-1']}
      onSelect={(value, info) => console.log(value, info)}
      onExpand={(keys, info) => console.log(keys, info)}
    >
      <TreeNode title="Trunk" key="0-0">
        <TreeNode title="Branch 0-0-0" key="0-0-0" disabled>
          <TreeNode title="Leaf" key="0-0-0-0" />
          <TreeNode title="Leaf" key="0-0-0-1" />
        </TreeNode>
        <TreeNode title="Branch 0-0-1" key="0-0-1">
          <TreeNode title="Leaf" key="0-0-1-0" />
        </TreeNode>
      </TreeNode>
    </Tree>
  );
};
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| treeData | 树形数据 | TreeNodeData[] | - |
| fieldNames | 自定义字段名 | { key?, title?, children?, disabled?, isLeaf? } | - |
| blockNode | 节点占据一行 | boolean | - |
| checkable | 是否添加选框 | boolean | - |
| checkStrictly | 是否取消父子节点关联 | boolean | - |
| draggable | 是否可拖拽 | boolean | - |
| multiple | 是否支持多选 | boolean | - |
| selectable | 是否可以选择 | boolean | true |
| showLine | 是否展示连接线 | boolean | - |
| size | 尺寸 | 'mini' \| 'small' \| 'default' \| 'large' | - |
| actionOnClick | 点击节点时操作 | 'select' \| 'check' \| ActionOnClick[] | select |
| checkedKeys | 选中复选框节点(受控) | string[] | - |
| checkedStrategy | 定制回填方式 | 'all' \| 'parent' \| 'child' | all |
| defaultCheckedKeys | 默认选中复选框节点 | string[] | - |
| defaultExpandedKeys | 默认展开节点 | string[] | - |
| defaultSelectedKeys | 默认选中节点 | string[] | - |
| expandedKeys | 展开节点(受控) | string[] | - |
| selectedKeys | 选中节点(受控) | string[] | - |
| autoExpandParent | 是否自动展开父节点 | boolean | true |
| allowDrop | 是否允许拖拽放置 | (options) => boolean | () => true |
| virtualListProps | 虚拟列表配置 | { height? } | - |
| onSelect | 选中回调 | (selectedKeys, extra) => void | - |
| onCheck | 复选回调 | (checkedKeys, extra) => void | - |
| onExpand | 展开回调 | (expandedKeys, extra) => void | - |
| onDragStart | 拖拽开始回调 | (e, node) => void | - |
| onDragEnd | 拖拽结束回调 | (e, node) => void | - |
| onDrop | 放置回调 | (e) => void | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**Tree.Node Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| key | 唯一标识(必填) | string | - |
| title | 节点标题 | ReactNode | - |
| disabled | 是否禁用 | boolean | - |
| selectable | 是否可选中 | boolean | - |
| checkable | 是否可勾选 | boolean | - |
| isLeaf | 是否为叶子节点 | boolean | - |
| icon | 自定义图标 | ReactNode | - |

**注意事项**: 支持虚拟列表、拖拽、动态加载、复选框、搜索和自定义字段名。

---

*文档生成时间: 2024年*
*数据来源: Arco Design React 官方组件文档 (https://arco.design/react/components)*


# Arco Design React - 数据输入 (Data Input) 组件文档

> 本文档汇总了 Arco Design React 数据输入类别下17个核心组件的官方文档信息。
> 来源: https://arco.design/react/components

---

## 1. DatePicker - 日期选择器

**简介**: 当用户需要输入一个日期，可以点击标准输入框，弹出日期面板进行选择。

**基本用法**:
```tsx
import { DatePicker } from '@arco-design/web-react';

const App = () => {
  return (
    <DatePicker style={{ width: 200 }} />
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| allowClear | 允许清除 | boolean | true |
| defaultValue | 默认日期 | CalendarValue | - |
| value | 日期 | CalendarValue | - |
| disabled | 是否禁用 | boolean | - |
| disabledDate | 不可选取的日期 | (current?: Dayjs) => boolean | - |
| format | 展示日期的格式 | string | 'YYYY-MM-DD' |
| locale | 国际化配置 | Record<string, any> | - |
| mode | 面板模式 | 'date' \| 'week' \| 'month' \| 'quarter' \| 'year' | 'date' |
| onChange | 日期变化时的回调 | (dateString?: string, date?: Dayjs) => void | - |
| onVisibleChange | 面板显示或隐藏触发的回调 | (visible?: boolean) => void | - |
| placeholder | 提示文案 | string | '选择日期' |
| position | 弹出的位置 | 'top' \| 'tl' \| 'tr' \| 'bottom' \| 'bl' \| 'br' | 'bl' |
| showTime | 是否增加时间选择 | boolean | false |
| size | 尺寸 | 'mini' \| 'small' \| 'default' \| 'large' | 'default' |

**注意事项**:
- `showTime` 为 true 时，format 默认为 `YYYY-MM-DD HH:mm:ss`
- 支持 RangePicker 范围选择，通过 `DatePicker.RangePicker` 使用
- 支持 WeekPicker, MonthPicker, QuarterPicker, YearPicker 等预设模式

---

## 2. TimePicker - 时间选择器

**简介**: 当用户需要输入一个时间，可以点击标准输入框，弹出时间面板进行选择。

**基本用法**:
```tsx
import { TimePicker } from '@arco-design/web-react';

const App = () => {
  return (
    <TimePicker style={{ width: 194 }} />
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| allowClear | 允许清除 | boolean | true |
| defaultValue | 默认时间 | string \| number \| Date | - |
| value | 时间 | string \| number \| Date | - |
| disabled | 是否禁用 | boolean | - |
| disabledHours | 禁用部分小时选项 | () => number[] | - |
| disabledMinutes | 禁用部分分钟选项 | (selectedHour?: number) => number[] | - |
| disabledSeconds | 禁用部分秒选项 | (selectedHour?: number, selectedMinute?: number) => number[] | - |
| format | 展示时间的格式 | string | 'HH:mm:ss' |
| onChange | 时间变化时的回调 | (timeString?: string, date?: Dayjs) => void | - |
| placeholder | 提示文案 | string | '选择时间' |
| position | 弹出的位置 | 'top' \| 'tl' \| 'tr' \| 'bottom' \| 'bl' \| 'br' | 'bl' |
| size | 尺寸 | 'mini' \| 'small' \| 'default' \| 'large' | 'default' |
| showNowBtn | 是否显示 "此刻" 按钮 | boolean | true |
| isRange | 是否为时间范围选择 | boolean | - |

**注意事项**:
- 时间范围选择通过 `<TimePicker.RangePicker />` 使用
- `format` 支持 HH:mm:ss, HH:mm, mm:ss 等格式
- `showNowBtn` 在 2.30.0 版本支持

---

## 3. Input - 输入框

**简介**: 单行输入框。

**基本用法**:
```tsx
import { Input } from '@arco-design/web-react';

const App = () => {
  return (
    <div>
      <Input style={{ width: 350 }} placeholder='Please enter something' />
      <Input style={{ width: 350 }} defaultValue='Hello world' />
      <Input style={{ width: 350 }} allowClear placeholder='Input with clear icon' />
      <Input style={{ width: 350 }} disabled defaultValue='disabled input' />
    </div>
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| allowClear | 允许一键清除 | boolean | - |
| defaultValue | 默认值 | string | - |
| value | 当前值 | string | - |
| disabled | 是否禁用 | boolean | - |
| error | 是否为错误状态（已废弃，使用 status='error' 替代） | boolean | - |
| placeholder | 输入框提示文字 | string | - |
| size | 尺寸 | 'mini' \| 'small' \| 'default' \| 'large' | 'default' |
| maxLength | 输入值的最大长度 | number | - |
| showWordLimit | 是否显示字数统计 | boolean | - |
| status | 状态 | 'error' \| 'warning' | - |
| onChange | 输入时的回调 | (value: string, e) => void | - |
| onPressEnter | 按下回车键的回调 | (e) => void | - |
| onClear | 点击清除按钮的回调 | () => void | - |
| prefix | 添加前缀文字或图标 | ReactNode | - |
| suffix | 添加后缀文字或图标 | ReactNode | - |
| addBefore | 输入框前添加元素 | ReactNode | - |
| addAfter | 输入框后添加元素 | ReactNode | - |
| normalize | 在 blur 或 按下回车时，将输入框值格式化 | (value: string) => string | - |
| normalizeTrigger | 触发 normalize 的时机 | ('onBlur' \| 'onPressEnter')[] | ['onBlur'] |

**注意事项**:
- `showWordLimit` 在开启字数统计后，会在 textarea 标签外包一层 div
- `normalize` 可以在 blur 时格式化用户输入

---

## 4. InputNumber - 数字输入框

**简介**: 仅允许输入数字格式的输入框。

**基本用法**:
```tsx
import { InputNumber } from '@arco-design/web-react';

const App = () => {
  return (
    <InputNumber min={10} max={100} step={2} defaultValue={12} />
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| min | 最小值 | number | -Infinity |
| max | 最大值 | number | +Infinity |
| step | 数字变化步长 | number | 1 |
| precision | 数字精度 | number | 0 |
| defaultValue | 初始值 | number | - |
| value | 当前值 | number | - |
| disabled | 禁用 | boolean | - |
| placeholder | 输入框提示文字 | string | - |
| size | 尺寸 | 'mini' \| 'small' \| 'default' \| 'large' | 'default' |
| mode | 模式（embed/button） | 'embed' \| 'button' | 'embed' |
| readOnly | 只读 | boolean | - |
| onChange | 变化回调 | (value?: number) => void | - |
| onBlur | 失去焦点时的回调 | (e) => void | - |
| onFocus | 获得焦点时的回调 | (e) => void | - |
| onKeyDown | 键盘事件回调 | (e) => void | - |

**注意事项**:
- `mode='button'` 展示 + - 按钮调节数值
- `precision` 指定小数位数
- 设置 `min`/`max` 后越界输入将自动修正

---

## 5. AutoComplete - 自动补全

**简介**: 输入框自动完成功能。不同于 Select 组件直接选择，AutoComplete 提供输入建议。

**基本用法**:
```tsx
import { AutoComplete } from '@arco-design/web-react';

const App = () => {
  const data = ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen'];
  return (
    <AutoComplete 
      style={{ width: 320 }} 
      placeholder='Input here' 
      data={data} 
    />
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| data | 自动完成的数据源 | (string \| number \| { value: any; label: ReactNode })[] | [] |
| defaultValue | 默认值 | string | - |
| value | 当前值 | string | - |
| disabled | 是否禁用 | boolean | - |
| placeholder | 输入框提示文字 | string | - |
| onChange | 输入变化回调 | (value: string) => void | - |
| onSearch | 搜索补全时的回调 | (value: string) => void | - |
| onSelect | 被选中时的回调 | (value: any) => void | - |
| onBlur | 失去焦点时的回调 | (e) => void | - |
| onFocus | 获得焦点时的回调 | (e) => void | - |
| onPressEnter | 按下回车时的回调 | (e) => void | - |
| renderItem | 自定义展示选项 | (value: any, index: number) => ReactNode | - |
| triggerProps | 下拉框的参数（继承 Trigger 组件） | Partial<TriggerProps> | - |
| getPopupContainer | 弹出框挂载的父节点 | (node: HTMLElement) => HTMLElement | - |
| inputProps | 传入 Input 组件的参数 | InputProps | - |
| strict | 是否严格匹配数据源，严格匹配时onSearch只会在未匹配时触发 | boolean | - |

**注意事项**:
- 不同于 Select 组件，AutoComplete 支持自由输入
- 数据项可以是字符串、数字或 { value, label } 对象
- 支持 `triggerProps` 控制下拉框位置等

---

## 6. Checkbox - 复选框

**简介**: 在一组数据中，用户可通过复选框选择一个或多个数据。

**基本用法**:
```tsx
import { Checkbox } from '@arco-design/web-react';
const CheckboxGroup = Checkbox.Group;

const App = () => {
  return (
    <div>
      <Checkbox>Checkbox</Checkbox>
      <CheckboxGroup options={['Option A', 'Option B', 'Option C']} />
    </div>
  );
};
export default App;
```

**Checkbox Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| checked | 是否选中 | boolean | - |
| defaultChecked | 初始是否选中 | boolean | - |
| disabled | 禁用 | boolean | - |
| indeterminate | 半选状态 | boolean | - |
| onChange | 值变化时的回调 | (checked: boolean, e: Event) => void | - |
| value | 复选框的值 | string \| number | - |

**Checkbox.Group Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| defaultValue | 默认选中的值 | string[] \| number[] | [] |
| value | 选中的值 | string[] \| number[] | - |
| disabled | 整组禁用 | boolean | - |
| direction | 方向 | 'horizontal' \| 'vertical' | 'horizontal' |
| options | 可选项数据源 | OptionType[] | - |
| onChange | 变化回调 | (value: any[]) => void | - |

**注意事项**:
- `indeterminate` 用于实现全选/半选效果
- Group 中可通过 `direction` 控制水平或垂直排列

---

## 7. Radio - 单选框

**简介**: 单选框。

**基本用法**:
```tsx
import { Radio } from '@arco-design/web-react';
const RadioGroup = Radio.Group;

const App = () => {
  return (
    <div>
      <Radio>Radio</Radio>
      <RadioGroup defaultValue='a'>
        <Radio value='a'>A</Radio>
        <Radio value='b'>B</Radio>
        <Radio value='c'>C</Radio>
        <Radio value='d'>D</Radio>
      </RadioGroup>
    </div>
  );
};
export default App;
```

**Radio Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| checked | 是否选中 | boolean | - |
| defaultChecked | 初始是否选中 | boolean | - |
| disabled | 禁用 | boolean | - |
| value | 根据 value 进行比较，判断是否选中 | any | - |
| onChange | 值变化时的回调 | (checked: boolean, e: Event) => void | - |

**Radio.Group Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| defaultValue | 默认选中的值 | any | - |
| value | 选中的值 | any | - |
| disabled | 整组禁用 | boolean | - |
| direction | 方向 | 'horizontal' \| 'vertical' | 'horizontal' |
| mode | 模式 | 'outline' \| 'fill' \| 'button' | - |
| name | 控件名称 | string | - |
| options | 以配置形式设置子元素 | OptionType[] | - |
| onChange | 变化回调 | (value: any) => void | - |
| type | 按钮类型 | 'default' \| 'primary' \| 'secondary' \| 'dashed' \| 'outline' \| 'text' | 'default' |
| size | 尺寸 | 'mini' \| 'small' \| 'default' \| 'large' | 'default' |

**注意事项**:
- `mode='button'` 时展示为按钮样式
- `options` 属性可以简化用法，无需手动写 Radio 子元素
- `type` 控制 Radio 按钮的样式类型

---

## 8. Rate - 评分

**简介**: 评分组件。

**基本用法**:
```tsx
import { Rate } from '@arco-design/web-react';

const App = () => {
  return (
    <Rate allowHalf defaultValue={2.5} />
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| count | 星星的总数 | number | 5 |
| defaultValue | 默认值 | number | 0 |
| value | 当前值 | number | - |
| allowHalf | 是否允许半选 | boolean | false |
| allowClear | 是否允许再次点击后清除 | boolean | true |
| disabled | 只读，无法进行交互 | boolean | false |
| character | 自定义字符 | ReactNode \| ((index: number) => ReactNode) | - |
| grading | 笑脸分级 | boolean | false |
| readonly | 是否为只读状态 | boolean | - |
| tooltips | 每项的提示信息 | string[] | - |
| onChange | 选择时的回调 | (value: number) => void | - |
| onHoverChange | 鼠标经过时数值变化的回调 | (value: number) => void | - |

**注意事项**:
- `allowHalf` 允许半星评分
- `character` 可以自定义图标（如笑脸、数字等）
- `grading` 为 true 时切换为笑脸分级模式

---

## 9. Switch - 开关

**简介**: 切换开关状态。

**基本用法**:
```tsx
import { Switch } from '@arco-design/web-react';

const App = () => {
  return (
    <div>
      <Switch defaultChecked />
      <Switch defaultChecked size='small' />
      <Switch />
      <Switch disabled />
    </div>
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| checked | 开关是否打开 | boolean | - |
| defaultChecked | 初始是否打开 | boolean | false |
| disabled | 禁用状态 | boolean | false |
| loading | 加载中状态 | boolean | false |
| size | 开关的尺寸 | 'small' \| 'default' | 'default' |
| type | 开关的类型 | 'circle' \| 'round' \| 'line' | 'circle' |
| checkedText | 选中时的文案 | ReactNode | - |
| uncheckedText | 非选中时的文案 | ReactNode | - |
| checkedIcon | 选中时的图标 | ReactNode | - |
| uncheckedIcon | 非选中时的图标 | ReactNode | - |
| onChange | 点击开关的回调 | (checked: boolean, e: Event) => void | - |

**注意事项**:
- `type` 支持 circle（圆形）、round（圆角）、line（线性）三种样式
- `checkedText` 和 `uncheckedText` 在 type='round' 时效果最佳
- `loading` 用于处理异步操作中的状态

---

## 10. Select - 选择器

**简介**: 当用户需要从一组同类数据中选择一个或多个时，可以使用下拉选择器。

**基本用法**:
```tsx
import { Select } from '@arco-design/web-react';
const Option = Select.Option;

const App = () => {
  return (
    <Select placeholder='Please select' style={{ width: 154 }}>
      <Option value='beijing'>Beijing</Option>
      <Option value='shanghai'>Shanghai</Option>
      <Option value='guangzhou'>Guangzhou</Option>
      <Option value='shenzhen'>Shenzhen</Option>
    </Select>
  );
};
export default App;
```

**Select Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| allowClear | 是否允许一键清除 | boolean | false |
| defaultValue | 选择器的默认值 | string \| string[] \| number \| number[] | - |
| value | 选择器的值（受控） | string \| string[] \| number \| number[] | - |
| disabled | 禁用组件 | boolean | - |
| loading | 下拉列表的加载状态 | boolean | - |
| mode | 是否多选 | 'multiple' \| 'tags' | - |
| placeholder | 选择框默认文字 | string | - |
| size | 尺寸 | 'mini' \| 'small' \| 'default' \| 'large' | 'default' |
| showSearch | 使单选模式可搜索 | boolean | false |
| onChange | 点击选择框时触发 | (value, option?) => void | - |
| onVisibleChange | 下拉框显示/隐藏时的回调 | (visible: boolean) => void | - |
| onSearch | 搜索时的回调 | (value: string) => void | - |
| onClear | 点击清除时触发 | () => void | - |
| filterOption | 根据输入筛选数据 | boolean \| ((inputValue, option) => boolean) | true |
| dropdownMenuStyle | 下拉列表的样式 | CSSProperties | - |
| options | 下拉菜单的选项 | (string \| number \| { label: ReactNode; value: string \| number; disabled?: boolean })[] | - |
| triggerProps | 可以接受所有 Trigger 组件的 Props | Partial<TriggerProps> | - |
| defaultActiveFirstOption | 是否默认高亮第一个选项 | boolean | true |
| getPopupContainer | 弹出框挂载的父节点 | (node: HTMLElement) => HTMLElement | - |

**注意事项**:
- `mode='multiple'` 支持多选，`mode='tags'` 支持可自由输入的标签模式
- `options` 属性可替代 Option 子元素写法
- `showSearch` 开启后可搜索选项

---

## 11. TreeSelect - 树选择

**简介**: 可以对树形结构数据进行选择。

**基本用法**:
```tsx
import { TreeSelect } from '@arco-design/web-react';

const App = () => {
  const treeData = [
    { title: 'Trunk 1', value: 'Trunk 1', children: [
      { title: 'Branch 1-1', value: 'Branch 1-1' }
    ]},
    { title: 'Trunk 2', value: 'Trunk 2' }
  ];
  return (
    <TreeSelect treeData={treeData} placeholder='请选择...' />
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| allowClear | 允许清除 | boolean | true |
| defaultValue | 默认值 | string \| string[] | - |
| value | 当前值 | string \| string[] | - |
| disabled | 禁用 | boolean | - |
| loading | 加载状态 | boolean | - |
| multiple | 多选 | boolean | - |
| treeCheckable | 显示 checkbox | boolean | - |
| treeCheckStrictly | 是否严格选中（父子节点选中状态不关联） | boolean | - |
| treeData | 树数据 | TreeDataType[] | [] |
| fieldNames | 自定义节点 key, title, disabled, children 的字段 | { key?: string; title?: string; disabled?: string; children?: string } | - |
| placeholder | 提示文案 | string | - |
| size | 尺寸 | 'mini' \| 'small' \| 'default' \| 'large' | 'default' |
| showSearch | 支持搜索 | boolean | false |
| onChange | 选中时的回调 | (value: any) => void | - |
| onVisibleChange | 下拉框显示/隐藏时的回调 | (visible: boolean) => void | - |
| onSearch | 搜索时的回调 | (value: string) => void | - |
| triggerProps | 可以接受所有 Trigger 组件的 Props | Partial<TriggerProps> | - |
| getPopupContainer | 弹出框挂载的父节点 | (node: HTMLElement) => HTMLElement | - |
| renderTitle | 自定义展示内容 | (props: NodeProps) => ReactNode | - |

**注意事项**:
- 支持多选、搜索、Checkable 等模式
- `fieldNames` 可自定义 treeData 中的字段名
- `renderTitle` 可自定义节点展示内容

---

## 12. Cascader - 级联选择

**简介**: 多层级数据的级联选择。

**基本用法**:
```tsx
import { Cascader } from '@arco-design/web-react';

const App = () => {
  const options = [
    { value: 'beijing', label: 'Beijing', children: [
      { value: 'chaoyang', label: 'Chaoyang' }
    ]},
    { value: 'shanghai', label: 'Shanghai' }
  ];
  return (
    <Cascader 
      placeholder='Please select ...' 
      style={{ width: 300 }} 
      options={options} 
    />
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| allowClear | 是否允许清除 | boolean | true |
| defaultValue | 默认值 | string[] \| string[][] | [] |
| value | 当前值 | string[] \| string[][] | - |
| disabled | 禁用 | boolean | - |
| options | 级联数据 | OptionType[] | [] |
| placeholder | 提示文案 | string | - |
| size | 尺寸 | 'mini' \| 'small' \| 'default' \| 'large' | 'default' |
| multiple | 是否多选 | boolean | - |
| showSearch | 支持搜索 | boolean | - |
| expandTrigger | 次级菜单的展开方式（click/hover） | 'click' \| 'hover' | 'click' |
| onChange | 选中时的回调 | (value: string[], option, extra?: { dropdownVisible?: boolean }) => void | - |
| onVisibleChange | 下拉框显示/隐藏时的回调 | (visible: boolean) => void | - |
| onSearch | 搜索时的回调 | (inputValue: string) => void | - |
| filterOption | 搜索时的过滤函数 | (inputValue: string, option: CascaderOptionType) => boolean | - |
| renderOption | 自定义展示选项 | (option: CascaderOptionType, level: number) => ReactNode | - |
| triggerProps | 可以接受所有 Trigger 组件的 Props | Partial<TriggerProps> | - |
| getPopupContainer | 弹出框挂载的父节点 | (node: HTMLElement) => HTMLElement | - |

**注意事项**:
- `multiple` 支持多选，选中结果以二维数组形式展示
- `expandTrigger='hover'` 支持鼠标悬停展开子菜单
- `showSearch` 开启后支持在所有层级中搜索

---

## 13. Slider - 滑动输入条

**简介**: 滑动型输入器，展示当前值和可选范围。

**基本用法**:
```tsx
import { Slider } from '@arco-design/web-react';

const App = () => {
  return (
    <div style={{ width: 200 }}>
      <Slider defaultValue={80} />
    </div>
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| defaultValue | 默认值 | number \| number[] | 0 |
| value | 当前值 | number \| number[] | - |
| disabled | 禁用 | boolean | - |
| min | 最小值 | number | 0 |
| max | 最大值 | number | 100 |
| step | 步长 | number | 1 |
| showTicks | 是否显示步长刻度 | boolean | false |
| showInput | 是否展示数字输入框 | boolean | false |
| range | 是否使用双滑块 | boolean | false |
| reverse | 反向坐标轴 | boolean | false |
| vertical | 竖向滑动条 | boolean | false |
| marks | 刻度标记 | { [key: number]: ReactNode } | - |
| tooltipVisible | 是否始终显示 tooltip | boolean | - |
| getTooltipContainer | tooltip 挂载的父节点 | (node: HTMLElement) => HTMLElement | - |
| onChange | 值变化时的回调 | (value: number \| number[]) => void | - |
| onAfterChange | 在 onmouseup 时触发的回调 | (value: number \| number[]) => void | - |
| formatTooltip | 格式化 tooltip 内容 | (value: number) => ReactNode | - |

**注意事项**:
- `range` 为 true 时支持范围选择（双滑块）
- `marks` 可用于在滑轨上显示特定刻度的标记
- `vertical` 为 true 时滑块竖向展示

---

## 14. Form - 表单

**简介**: 具有数据收集、校验和提交功能的表单，包含复选框、单选框、输入框、下拉选择框等元素。

**基本用法**:
```tsx
import { Form, Input, Button } from '@arco-design/web-react';

const FormItem = Form.Item;

const App = () => {
  return (
    <Form style={{ width: 600 }}>
      <FormItem label='Username'>
        <Input placeholder='please enter your username...' />
      </FormItem>
      <FormItem wrapperCol={{ offset: 5 }}>
        <Button type='primary'>Submit</Button>
      </FormItem>
    </Form>
  );
};
export default App;
```

**Form Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| layout | 表单的布局 | 'horizontal' \| 'vertical' \| 'inline' | 'horizontal' |
| size | 表单控件的尺寸 | 'mini' \| 'small' \| 'default' \| 'large' | 'default' |
| disabled | 禁用 | boolean | - |
| colon | 标签后是否显示冒号 | boolean | true |
| labelAlign | 标签对齐方式 | 'left' \| 'right' | 'right' |
| labelCol | 标签 <label> 布局 | { span?: number; offset?: number } | - |
| wrapperCol | 控件布局 | { span?: number; offset?: number } | - |
| requiredSymbol | 是否在 required 的时候显示加重的红色星号 | boolean \| { position: 'start' \| 'end' } | true |
| initialValues | 表单的默认值 | object | - |
| onValuesChange | 任意表单项值改变时触发的回调 | (value: Partial<FormData>, values: FormData) => void | - |
| onChange | 任意表单项值改变时触发的回调 | (value: Partial<FormData>, values: FormData) => void | - |
| scrollToFirstError | 验证失败时滚动到第一个错误字段 | boolean \| ScrollIntoViewOptions | - |
| onSubmit | 数据验证成功后回调事件 | (values: FormData) => void | - |
| onSubmitFailed | 数据验证失败后回调事件 | (errors: { [key: string]: FieldError }) => void | - |

**Form.Item Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| label | 标签的文本 | ReactNode | - |
| field | 控件对应的字段名 | string | - |
| required | 是否必填 | boolean | - |
| rules | 受控规则 | RulesProps[] | - |
| initialValue | 初始值 | any | - |
| noStyle | 不渲染任何样式，只进行字段绑定 | boolean | - |
| extra | 额外的提示信息 | ReactNode | - |
| validateStatus | 校验状态 | 'success' \| 'error' \| 'warning' \| 'validating' | - |
| hasFeedback | 展示验证成功/失败图标 | boolean | - |
| shouldUpdate | 自定义字段更新逻辑 | boolean \| (prevValues, curValues) => boolean | - |
| dependencies | 依赖的字段名 | string[] | - |

**Form.List Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| field | 对应字段名 | string | - |
| initialValue | 初始值 | any[] | - |

**注意事项**:
- `Form.useForm()` 创建表单实例，支持 `submit`, `reset`, `setFieldsValue`, `getFieldsValue` 等方法
- `rules` 支持必填、正则、自定义函数等多种校验方式
- `Form.List` 用于处理动态增减表单字段
- `shouldUpdate` 和 `dependencies` 用于处理字段联动

---

## 15. Upload - 上传

**简介**: 用户可传输文件或提交相应的内容。

**基本用法**:
```tsx
import { Upload } from '@arco-design/web-react';

const App = () => {
  return (
    <div>
      <Upload action='/' />
      <Upload action='/' disabled />
    </div>
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| action | 上传的地址 | string \| ((file: File) => string) | - |
| accept | 接受上传的文件类型 | string | - |
| autoUpload | 是否选中文件后自动上传 | boolean | true |
| disabled | 禁用 | boolean | - |
| drag | 是否拖拽上传 | boolean | - |
| multiple | 是否支持多文件上传 | boolean | - |
| limit | 限制上传数量 | number \| { maxCount: number; hideOnExceedLimit?: boolean } | - |
| defaultFileList | 默认已上传的文件列表 | UploadItem[] | [] |
| fileList | 已上传的文件列表（受控） | UploadItem[] | [] |
| listType | 列表样式 | 'text' \| 'picture-list' \| 'picture-card' | 'text' |
| showUploadList | 是否展示上传文件列表 | boolean \| CustomIconType | true |
| beforeUpload | 上传前的回调 | (file: File, filesList: File[]) => boolean \| Promise<any> | () => true |
| onChange | 文件状态改变时的回调 | (fileList: UploadItem[], file: UploadItem) => void | - |
| onProgress | 上传进度回调 | (file: UploadItem, e?: ProgressEvent) => void | - |
| onRemove | 点击删除时的回调 | (file: UploadItem, fileList: UploadItem[]) => void \| boolean \| Promise<void \| boolean> | - |
| onPreview | 点击预览的回调 | (file: UploadItem) => void | - |
| onReupload | 重新上传时的回调 | (file: UploadItem) => void | - |
| onExceedLimit | 超出上传数量限制时触发 | (files: File[], fileList: UploadItem[]) => void | - |
| customRequest | 自定义上传实现 | (options: RequestOptions) => UploadRequestReturn \| void | - |
| data | 上传时的 Body 参数 | object \| ((any: any) => object) | - |
| name | 文件内容的参数名 | string \| ((any: any) => string) | - |
| headers | 上传时使用的 headers | object | - |
| progressProps | 进度条属性 | Partial<ProgressProps> | - |
| tip | 提示文字 | string \| ReactNode | - |
| imagePreview | 内置图片预览（2.41.0 支持） | boolean | - |

**注意事项**:
- `autoUpload=false` 时可手动调用 `uploadRef.current.submit(file)` 上传
- `customRequest` 可覆盖默认上传行为，实现自定义上传逻辑
- `beforeUpload` 返回 false 或 Promise.reject 会取消上传
- `onRemove` 返回 false 或 Promise.reject 会终止删除

---

## 16. Transfer - 数据穿梭框

**简介**: 两栏布局的多选组件，将元素从一栏即时移到另一栏。

**基本用法**:
```tsx
import { Transfer } from '@arco-design/web-react';

function App() {
  const dataSource = new Array(8).fill(null).map((_, index) => ({
    key: `${index + 1}`,
    value: `Option ${index + 1}`,
  }));

  return (
    <Transfer 
      dataSource={dataSource} 
      defaultTargetKeys={['1', '2', '3']} 
      titleTexts={['To-do list', 'Selected list']} 
    />
  );
}
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| dataSource | 穿梭框数据源 | TransferItem[] | [] |
| defaultSelectedKeys | 默认选中的值 | string[] | [] |
| defaultTargetKeys | 默认在右侧栏的 key 集合 | string[] | [] |
| targetKeys | 右侧栏的 key 集合（受控） | string[] | - |
| selectedKeys | 当前选中的值 | string[] | - |
| disabled | 禁用穿梭框 | boolean | - |
| oneWay | 单向模式 | boolean | - |
| showSearch | 是否显示搜索框 | boolean \| InputProps \| Array<boolean \| InputProps> | - |
| searchPlaceholder | 搜索框默认提示文字 | string \| string[] | - |
| showFooter | 是否显示底部重置按钮 | boolean \| ReactNode \| Array<boolean \| ReactNode> | - |
| titleTexts | 左右栏标题 | Array<TransferListTitle> | ['Source', 'Target'] |
| operationTexts | 穿梭按钮的文案 | string[] \| ReactNode[] | - |
| pagination | 是否使用翻页 | boolean \| PaginationProps \| Array<boolean \| PaginationProps> | - |
| draggable | 列表内条目是否可拖拽 | boolean | - |
| simple | 简单模式 | boolean \| { retainSelectedItems?: boolean } | - |
| listStyle | 左右两栏的样式 | CSSProperties \| CSSProperties[] | - |
| onChange | 数据在两栏之间转移时的回调 | (newTargetKeys: string[], direction: 'source' \| 'target', moveKeys: string[]) => void | - |
| onSearch | 搜索时的回调 | (value: string, type?: 'source' \| 'target') => void | - |
| onSelectChange | 选中状态改变的回调 | (leftSelectedKeys: string[], rightSelectedKeys: string[]) => void | - |
| onDrop | 拖拽释放时的回调 | (info: { e, dragItem, dropItem, dropPosition }) => void | - |
| render | 每行数据渲染函数 | (item: TransferItem) => any | - |
| filterOption | 搜索框筛选算法 | (inputValue: string, item: TransferItem) => boolean | - |
| virtualListProps | 虚拟滚动属性 | AvailableVirtualListProps | - |
| children | 自定义列表渲染函数 | (props: TransferCustomListProps) => ReactNode | - |

**注意事项**:
- `oneWay` 单向模式下数据只能从左向右移动
- `simple` 简单模式下可以不显示穿梭按钮
- `children` 属性支持自定义列表渲染，可实现表格穿梭框、树穿梭框等

---

## 17. Mentions - 提及

**简介**: 用于在输入中提及某人或某事，常用于发布、聊天或评论功能。

**基本用法**:
```tsx
import { Mentions } from '@arco-design/web-react';

const App = () => {
  return (
    <Mentions 
      style={{ width: 154 }} 
      defaultValue='@Bytedance' 
      options={['Bytedance', 'Bytedesign', 'Bytenumner']} 
    />
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| defaultValue | 输入框默认值 | string | - |
| value | 输入框的值（受控） | string | - |
| placeholder | 输入框提示文字 | string | - |
| disabled | 是否禁用 | boolean | - |
| readOnly | 是否只读 | boolean | - |
| allowClear | 允许清空输入框 | boolean | - |
| prefix | 触发关键字 | string \| string[] | '@' |
| split | 选中项前后分隔符 | string | ' ' |
| options | 下拉框可选项 | (string \| number \| { label: ReactNode \| string; value: string \| number; disabled?: boolean })[] | [] |
| autoSize | 是否自动调整输入框高度 | boolean \| { minRows?: number; maxRows?: number } | - |
| alignTextarea | 弹出框是否与输入框对齐 | boolean | true |
| position | 下拉框的弹出位置 | 'top' \| 'tl' \| 'tr' \| 'bottom' \| 'bl' \| 'br' | 'bl' |
| notFoundContent | 没有数据时显示的内容 | ReactNode | - |
| filterOption | 是否根据输入的值筛选数据 | false \| ((inputValue: string, option) => boolean) | - |
| onChange | 输入改变时的回调 | (value: string) => void | - |
| onSearch | 搜索时的回调 | (text: string, prefix: string) => void | - |
| onSelect | 选中选项时的回调 | (value: any) => void | - |
| onFocus | 聚焦时的回调 | (e) => void | - |
| onBlur | 失焦时的回调 | (e) => void | - |
| onPressEnter | 按下回车键的回调 | (e) => void | - |
| onClear | 点击清除按钮的回调 | () => void | - |
| triggerProps | 可以接受所有 Trigger 组件的 Props | Partial<TriggerProps> | - |
| getPopupContainer | 弹出框挂载的父节点 | (node: HTMLElement) => HTMLElement | - |
| status | 状态 | 'error' \| 'warning' | - |
| error | 错误状态（已废弃） | boolean | - |

**注意事项**:
- `prefix` 默认为 '@'，可以自定义为任意字符（如 '#'、'*'、'${' 等）
- `split` 为选中项前后添加分隔符，默认空格
- `alignTextarea` 控制弹出框与 textarea 的对齐方式

---

> 文档结束。以上信息采集自 Arco Design React 官方文档网站。


## 反馈 (Feedback) 组件文档

---

### Alert (警告提示)

**简介**: 向用户显示警告的信息时，通过警告提示，展现需要关注的信息。适用于简短的警告提示。

**基本用法**:
```tsx
import { Alert } from '@arco-design/web-react';

const App = () => {
  return <Alert content='Here is an example text' />;
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| banner | 是否用作顶部公告 | boolean | - |
| closable | 是否可关闭 | boolean | - |
| showIcon | 是否显示图标 | boolean | true |
| type | 警告的类型 | 'info' \| 'success' \| 'warning' \| 'error' | info |
| action | 自定义操作项 | ReactNode | - |
| closeElement | 自定义关闭按钮 | ReactNode | - |
| content | 内容 | ReactNode | - |
| icon | 可以指定自定义图标，showIcon 为 true 时生效 | ReactNode | - |
| title | 标题 | ReactNode | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |
| afterClose | 关闭动画结束后执行的回调 | () => void | - |
| onClose | 关闭的回调 | (e) => void | - |

**注意事项**:
- 警告提示的类型有 info, success, warning, error 四种
- 指定 `closable = true` 可开启关闭按钮
- 设置 `showIcon = false` 来不显示图标
- 设置 `banner = true` 可以当作顶部公告使用

---

### Drawer (抽屉)

**简介**: 触发命令后，从屏幕一侧滑出的抽屉式的面板。

**基本用法**:
```tsx
import { useState } from 'react';
import { Drawer, Button } from '@arco-design/web-react';

function App() {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <Button onClick={() => setVisible(true)} type='primary'>Open Drawer</Button>
      <Drawer
        width={332}
        title={<span>Basic Information</span>}
        visible={visible}
        onOk={() => setVisible(false)}
        onCancel={() => setVisible(false)}
      >
        <div>Here is an example text.</div>
      </Drawer>
    </div>
  );
}
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| autoFocus | 是否默认聚焦第一个可聚焦元素，只在 focusLock 开启时生效 | boolean | true | 2.13.0 |
| closable | 是否显示右上角关闭按钮 | boolean | true | - |
| confirmLoading | 确认按钮是否为加载中状态 | boolean | - | - |
| escToExit | 按 ESC 键关闭 | boolean | true | 2.10.0 |
| focusLock | 是否将焦点锁定在弹出框内 | boolean | true | 2.13.0 |
| mask | 是否显示遮罩 | boolean | true | - |
| maskClosable | 点击蒙层是否可以关闭 | boolean | true | - |
| mountOnEnter | 是否在初次打开对话框时才渲染 dom | boolean | true | - |
| unmountOnExit | 是否在隐藏的时候销毁 DOM 结构 | boolean | - | - |
| visible | 是否显示弹出框 | boolean | - | - |
| zIndex | 设置抽屉的 zIndex | number | - | 2.42.0 |
| placement | 抽屉的方向 (top \| right \| bottom \| left) | string | right | - |
| cancelText | 取消按钮文案 | ReactNode | - | - |
| closeIcon | 自定义右上角关闭按钮 | ReactNode | - | 2.49.0 |
| footer | 自定义按钮确认和取消按钮，为 null 的话没有按钮组 | ReactNode | - | - |
| okText | 确认按钮文案 | ReactNode | - | - |
| title | 弹出框的标题（设置为 null 时，不显示标题栏） | ReactNode | - | - |
| bodyStyle | 内容区域的样式 | CSSProperties | - | 2.9.0 |
| cancelButtonProps | 取消按钮的 props | ButtonProps | - | 2.26.0 |
| headerStyle | 头部的样式 | CSSProperties | - | 2.9.0 |
| height | 抽屉的高度，placement 为 top/bottom 时生效 | string \| number | 250 | - |
| maskStyle | 设置遮罩层的样式 | CSSProperties | - | - |
| okButtonProps | 确认按钮的 props | ButtonProps | - | 2.26.0 |
| width | 抽屉的宽度，placement 为 left/right 时生效 | string \| number | 250 | - |
| wrapClassName | 设置外层容器的类名 | string \| string[] | - | - |
| afterClose | 抽屉关闭之后的回调 | () => void | - | - |
| afterOpen | 抽屉打开之后的回调 | () => void | - | - |
| getChildrenPopupContainer | 抽屉里的弹出框挂载的容器 | (node: HTMLElement) => Element | - | - |
| getPopupContainer | 指定弹出框挂载的父节点 | () => Element | () => document.body | - |
| onCancel | 关闭弹出框的回调 | (e: MouseEvent \| Event) => void | - | - |
| onOk | 点击确认按钮的回调 | (e: Event) => void | - | - |

**注意事项**:
- 支持 top, right, bottom, left 四个方向的抽屉滑出
- 可以通过 `getPopupContainer` 指定抽屉挂载的父级节点
- 在抽屉内打开新的抽屉（多层抽屉）是支持的
- 可以通过 `title` 和 `footer` 属性定制节点内容，设置为 `null` 时不渲染对应 DOM 节点

---

### Message (全局提示)

**简介**: 由用户的操作触发的轻量级全局反馈。

**基本用法**:
```tsx
import { Message, Button } from '@arco-design/web-react';

const App = () => {
  return (
    <Button onClick={() => Message.info('This is an info message!')} type='primary'>
      Open Message
    </Button>
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| closable | 是否显示关闭按钮 | boolean | true | - |
| showIcon | 是否显示图标 | boolean | true | - |
| duration | 自动关闭的时间，单位为 ms | number | 3000 | - |
| id | 当前消息的唯一标识，可以用来更新消息 | string | - | - |
| transitionClassNames | 消息弹出动画的类名 | string | - | - |
| position | 消息的位置 (top \| bottom) | string | - | - |
| closeIcon | 自定义右上角关闭按钮 | ReactNode | - | 2.50.0 |
| icon | 自定义图标 | ReactNode | - | - |
| className | 节点类名 | string \| string[] | - | - |
| content | 消息内容 | ReactNode \| string | (必填) | - |
| style | 节点样式 | CSSProperties | - | - |
| transitionTimeout | 动画持续时间 | { enter?: number; exit?: number } | { enter: 100, exit: 300 } | 2.43.0 |
| onClose | 关闭时的回调 | () => void | - | - |

**使用方法**:
- `Message.info(content: String)` / `Message.info(config: Object)`
- `Message.success(content: String)` / `Message.success(config: Object)`
- `Message.warning(content: String)` / `Message.warning(config: Object)`
- `Message.error(content: String)` / `Message.error(config: Object)`
- `Message.normal(content: String)` / `Message.normal(config: Object)`
- `Message.loading(content: String)` / `Message.loading(config: Object)`
- `Message.clear()`

**全局设置** `Message.config(options)`:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| maxCount | 最大通知数量 | number | - |
| getContainer | 放置通知的容器 | () => HTMLElement | () => document.body |
| duration | 通知自动关闭的时间 | number | 3000 |
| prefixCls | 类名前缀 | string | arco |

**注意事项**:
- 全局提示有 5 种类型：info, success, warning, error, normal
- 通过指定 `id` 可以更新已经存在的全局提示
- `Message.xxx()` 会返回一个函数，调用此函数能手动关闭通知
- 可以通过 `useMessage` (2.40.0) 创建可以读取 context 的对话框

---

### Notification (通知提醒框)

**简介**: 全局展示通知提醒，将信息及时有效的传达给用户。

**基本用法**:
```tsx
import { Notification, Button } from '@arco-design/web-react';

const App = () => {
  return (
    <Button
      onClick={() => Notification.info({
        closable: false,
        title: 'Notification',
        content: 'This is a notification!',
      })}
      type='primary'
    >
      Open Notification
    </Button>
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| closable | 是否显示关闭按钮 | boolean | true | - |
| showIcon | 是否显示图标 | boolean | true | - |
| duration | 自动关闭的时间，单位为 ms | number | 3000 | - |
| id | 当前通知的唯一标识，可以用来更新消息 | string | - | - |
| position | 消息的位置 (topLeft \| topRight \| bottomLeft \| bottomRight) | string | - | - |
| btn | 添加操作按钮 | ReactNode | - | - |
| closeIcon | 自定义右上角关闭按钮 | ReactNode | - | 2.50.0 |
| icon | 自定义图标 | ReactNode | - | - |
| className | 节点类名 | string \| string[] | - | - |
| content | 通知内容 | ReactNode \| string | (必填) | - |
| style | 节点样式 | CSSProperties | - | - |
| title | 通知标题 | ReactNode \| string | - | - |
| onClose | 关闭时的回调 | () => void | - | - |

**使用方法**:
- `Notification.info(config)`
- `Notification.success(config)`
- `Notification.warning(config)`
- `Notification.error(config)`
- `Notification.normal(config)`
- `Notification.remove(id)`
- `Notification.clear()`

**全局设置** `Notification.config(options)`:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| maxCount | 最大通知数量 | number | - |
| getContainer | 放置通知的容器 | () => HTMLElement | () => document.body |
| duration | 通知自动关闭的时间 | number | 3000 |
| prefixCls | 类名前缀 | string | arco |

**注意事项**:
- 通知提醒框有 5 种类型：info, success, warning, error, normal
- 通过指定 `id` 可以更新已经存在的通知提醒框
- 通知提醒框有 4 种弹出位置：topLeft, topRight, bottomLeft, bottomRight
- 可以通过 `useNotification` (2.40.0) 创建可以读取 context 的对话框

---

### Popconfirm (气泡确认框)

**简介**: 点击元素，弹出气泡式的确认框。

**基本用法**:
```tsx
import { Popconfirm, Message, Button } from '@arco-design/web-react';

const App = () => {
  return (
    <div>
      <Popconfirm
        focusLock
        title='Confirm'
        content='Are you sure you want to delete?'
        onOk={() => Message.info({ content: 'ok' })}
        onCancel={() => Message.error({ content: 'cancel' })}
      >
        <Button>Delete</Button>
      </Popconfirm>
    </div>
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| autoFocus | 是否自动聚焦弹出框内的可聚焦元素 | boolean | - | - |
| defaultPopupVisible | 默认弹出框是打开还是关闭 | boolean | - | - |
| disabled | 是否禁用 | boolean | - | 2.11.0 |
| focusLock | 是否将焦点锁定在弹出框内 | boolean | - | - |
| popupVisible | 弹出框是打开还是关闭 (受控) | boolean | - | - |
| unmountOnExit | 是否在隐藏的时候销毁 DOM 节点 | boolean | true | - |
| okType | 确认按钮的类型 | ButtonProps['type'] | primary | - |
| position | 弹出框的方位，有 12 个方位可供选择 | string | top | - |
| trigger | 触发方式 | string[] | ['click'] | - |
| cancelText | 取消按钮文字 | ReactNode | - | - |
| icon | 标题前的图标 | ReactNode | <IconExclamationCircleFill /> | - |
| okText | 确认按钮文字 | ReactNode | - | - |
| cancelButtonProps | 取消按钮的参数 | ButtonProps | - | - |
| okButtonProps | 确定按钮的参数 | ButtonProps | - | - |
| className | 节点类名 | string \| string[] | - | - |
| style | 节点样式 | CSSProperties | - | - |
| triggerProps | 可以接受所有 Trigger 的参数 | Partial<TriggerProps> | - | - |
| content | 内容 | ReactNode \| (() => ReactNode) | - | 2.44.0 |
| getPopupContainer | 弹出挂载的节点 | (node: HTMLElement) => Element | - | - |
| onCancel | 点击取消按钮的回调 | (e: React.MouseEvent) => void | - | - |
| onOk | 点击确认按钮的回调 | (e: React.MouseEvent) => Promise<any> \| void | - | - |
| onVisibleChange | 弹出打开和关闭触发的回调 | (visible: boolean) => void | - | - |
| title | 标题 | ReactNode \| (() => ReactNode) | - | - |

**注意事项**:
- 气泡确认框支持 12 个不同的方位
- 可以通过 `okButtonProps` 和 `cancelButtonProps` 自定义按钮
- 返回 Promise 可用于异步关闭
- 通过 `icon` 可以自定义标题前的图标，设置为 `null` 时不显示图标

---

### Progress (进度条)

**简介**: 给予用户当前系统执行中任务运行状态的反馈，多用于运行一段时间的场景，有效减轻用户在等待中产生的焦虑感。

**基本用法**:
```tsx
import { Progress } from '@arco-design/web-react';

const App = () => {
  return (
    <div>
      <Progress percent={30} width='40%' />
    </div>
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| animation | 动画效果，仅在 type=line 时可用 | boolean | - | - |
| buffer | 加载中的进度条是否显示缓冲区 | boolean | - | - |
| showText | 是否展示文本 | boolean | true | - |
| percent | 百分比 | number | (必填) | 0 |
| steps | 显示步骤进度条 | number | - | 2.10.0 |
| strokeWidth | 进度条线的宽度 | number | - | - |
| trailColor | 剩余进度条颜色 | string | - | - |
| size | 不同尺寸的进度条 (small \| default \| mini \| large) | string | default | - |
| status | 进度条状态 (success \| error \| normal \| warning) | string | - | 2.16.0 |
| type | 进度条类型 (line \| circle) | string | line | - |
| bufferColor | 缓冲区的颜色 | string \| object | - | - |
| className | 节点类名 | string \| string[] | - | - |
| color | 进度条颜色，优先级高于 status。传入对象时显示渐变色 | string \| { [key: string]: string } | - | 2.10.0 |
| style | 节点样式 | CSSProperties | - | - |
| width | 进度条的宽度。circle 类型仅支持数字类型的 width | string \| number | - | - |
| formatText | 进度条文本函数 | (percent: number) => ReactNode | - | - |

**注意事项**:
- 进度条状态有 success, error, warning, normal 四种
- 设置 `type = circle` 时展示环形进度条
- 设置 `size = mini` 时展示微型进度条
- `color` 传入对象时，会作为 linear-gradient 的属性值设置渐变色
- 可以通过 `steps` 展示步骤进度条

---

### Result (结果页)

**简介**: 用于反馈一系列操作任务的处理结果，当有重要操作需告知用户处理结果，且反馈内容较为复杂时使用。

**基本用法**:
```tsx
import { Result, Button } from '@arco-design/web-react';

const App = () => {
  return (
    <div>
      <Result
        status='success'
        title='Success message'
        subTitle='This is a success description.'
        extra={[
          <Button key='again' type='secondary' style={{ margin: '0 16px' }}>Again</Button>,
          <Button key='back' type='primary'>Back</Button>,
        ]}
      />
    </div>
  );
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| status | 不同状态，传入 null 时需通过 icon 属性设置图标 | 'success' \| 'error' \| 'info' \| 'warning' \| '404' \| '403' \| '500' \| null | info |
| extra | 额外内容 | ReactNode | - |
| icon | 自定义图标 | ReactNode | - |
| subTitle | 子标题文字 | ReactNode | - |
| title | 标题文字 | ReactNode | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**注意事项**:
- 内置状态包括：success, error, info, warning, 403, 404, 500
- 传入 `status = null` 时，需要通过 `icon` 属性设置图标，默认没有背景色以及图标颜色
- `extra` 属性用于添加额外操作按钮
- 适合展示处理结果、空状态、错误页面等场景

---

### Spin (加载中)

**简介**: 用于页面和区块的加载中状态 - 页面局部处于等待异步数据或正在渲染过程时，合适的加载动效会有效缓解用户的焦虑。

**基本用法**:
```tsx
import { Spin } from '@arco-design/web-react';

const App = () => {
  return <Spin />;
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| block | 是否为块级元素 | boolean | - | 2.29.0 |
| dot | 是否使用点类型的动画 | boolean | - | - |
| loading | 是否为加载状态（仅在 Spin 有子节点时生效） | boolean | - | - |
| delay | 延迟显示加载的时间 (ms) | number | - | - |
| size | 加载动画的尺寸 | number | - | - |
| element | 自定义元素，非图标，不附带旋转效果 | ReactNode | - | - |
| icon | 自定义图标，会自动旋转 | ReactNode | - | - |
| tip | 加载的文案 | string \| ReactNode | - | - |
| className | 节点类名 | string \| string[] | - | - |
| style | 节点样式 | CSSProperties | - | - |

**注意事项**:
- 可以给任意元素添加加载状态，将需要加载的内容作为子元素传入即可
- 通过 `delay` 延迟显示 loading，对状态切换进行防抖处理
- 设置 `dot` 属性可以展示点类型的指示符
- 通过 `element` 可以设置自定义元素（如 gif 图片）作为加载组件
- 容器默认是 inline-block 布局，需要撑满父级容器时可设置 `style={{ display: 'block' }}`

---

### Modal (对话框)

**简介**: 在当前页面打开一个浮层，承载相关操作。

**基本用法**:
```tsx
import React, { useState } from 'react';
import { Modal, Button } from '@arco-design/web-react';

function App() {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <Button onClick={() => setVisible(true)} type='primary'>Open Modal</Button>
      <Modal
        title='Modal Title'
        visible={visible}
        onOk={() => setVisible(false)}
        onCancel={() => setVisible(false)}
        autoFocus={false}
        focusLock={true}
      >
        <p>You can customize modal body text by the current situation.</p>
      </Modal>
    </div>
  );
}
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| escToExit | 按 ESC 键关闭 | boolean | true | - |
| focusLock | 是否将焦点锁定在弹出框内 | boolean | true | - |
| mask | 是否显示遮罩 | boolean | true | - |
| maskClosable | 点击蒙层是否可以关闭 | boolean | true | - |
| mountOnEnter | 是否在初次打开对话框时才渲染 dom | boolean | true | - |
| simple | 简洁模式的样式 | boolean | - | - |
| unmountOnExit | 是否在隐藏之后销毁DOM结构 | boolean | - | - |
| visible | 弹出框是否可见 | boolean | - | - |
| cancelText | 取消按钮文案 | ReactNode | - | - |
| closeIcon | 自定义右上角的关闭按钮节点 | ReactNode | - | 2.21.0 |
| okText | 确认按钮文案 | ReactNode | - | - |
| title | 弹出框的标题 | string \| ReactNode | - | - |
| cancelButtonProps | 取消按钮的 props | ButtonProps | - | - |
| maskStyle | 蒙层的样式 | CSSProperties | - | 2.6.0 |
| okButtonProps | 确认按钮的 props | ButtonProps | - | - |
| onOk | 点击确认按钮的回调 | (e?: MouseEvent) => Promise<any> \| void | - | - |
| style | 节点样式 | CSSProperties | - | - |
| wrapClassName | 弹出框外层 dom 类名 | string \| string[] | - | - |
| wrapStyle | 弹出框外层样式 | CSSProperties | - | 2.16.0 |
| afterClose | 弹框关闭之后的回调 | () => void | - | - |
| afterOpen | 弹框打开之后的回调 | () => void | - | - |
| footer | 自定义页脚，传入 null 则不显示 | ReactNode \| ((cancelButtonNode, okButtonNode) => ReactNode) | - | 2.12.0 |
| getChildrenPopupContainer | 对话框里的弹出框挂载的容器 | (node: HTMLElement) => Element | - | - |
| getPopupContainer | 指定弹出框挂载的父节点 | () => Element | () => document.body | - |
| modalRender | 自定义渲染对话框 | (modalNode: ReactNode) => ReactNode | - | 2.2.0 |
| onCancel | 关闭弹出框的回调 | () => void | - | - |
| alignCenter | 是否垂直居中 | boolean | - | - |

**Modal.method(config)**:
- `Modal.confirm(config)`
- `Modal.info(config)`
- `Modal.success(config)`
- `Modal.warning(config)`
- `Modal.error(config)`

以上函数都会返回一个对象，可用来更新或者关闭对话框：`info.update({...})` / `info.close()`

**Modal.config 方法**: 全局设置 Modal 的属性

**Modal.destroyAll 方法**: 关闭所有弹出的确认框

**Modal.useModal 方法**: 通过 hook 方法调用对话框，可以获取上下文 context

**注意事项**:
- 可以通过 `Modal.method()` 快捷调用确认对话框
- 通过 `useModal` 可以创建可以读取 context 的对话框
- 传入 `okButtonProps` 和 `cancelButtonProps` 可分别自定义按钮 props
- `modalRender` 可用于自定义渲染对话框（如实现拖拽功能）

---

### Skeleton (骨架屏)

**简介**: 将加载中的数据用灰色占位。

**基本用法**:
```tsx
import { Skeleton } from '@arco-design/web-react';

const App = () => {
  return <Skeleton></Skeleton>;
};
export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| animation | 是否显示动画效果 | boolean | - |
| loading | 是否显示子组件。为 true 时候显示占位符 | boolean | true |
| className | 节点类名 | string \| string[] | - |
| image | 是否显示图片占位 | SkeletonImageProps \| boolean | - |
| style | 节点样式 | CSSProperties | - |
| text | 是否显示文本占位 | SkeletonTextProps \| boolean | true |

**SkeletonImageProps**:
| 属性 | 说明 | 类型 |
|------|------|------|
| style | 样式 | CSSProperties |
| className | 类名 | string |
| shape | 图片形状 (circle \| square) | string |
| size | 图片尺寸 (small \| default \| large) | string |
| position | 图片位置 (left \| right) | string |

**SkeletonTextProps**:
| 属性 | 说明 | 类型 |
|------|------|------|
| style | 样式 | CSSProperties |
| className | 类名 | string |
| rows | 文本行数 | number |
| width | 文本行宽度 | number \| string \| (string \| number)[] |

**注意事项**:
- 设置 `loading = true` 显示占位符，为 false 时显示子组件内容
- 可以通过 `text` 设置文本行数和宽度
- 可以通过 `image` 设置图片占位
- 设置 `animation` 可以显示动画效果
- 适合在数据加载完成前展示占位效果

---

> 文档来源: [Arco Design React 组件库](https://arco.design/react/components/)


# Arco Design React - 导航 (Navigation) 组件文档

---

## 目录

1. [Breadcrumb 面包屑](#breadcrumb)
2. [Dropdown 下拉菜单](#dropdown)
3. [Menu 菜单](#menu)
4. [PageHeader 页头](#pageheader)
5. [Pagination 分页](#pagination)
6. [Steps 步骤条](#steps)

---

## Breadcrumb

**简介**: 面包屑是辅助导航模式，用于识别页面在层次结构内的位置，并根据需要向上返回。

**基本用法**:
```tsx
import { Breadcrumb } from '@arco-design/web-react';
const BreadcrumbItem = Breadcrumb.Item;

const App = () => {
  return (
    <div>
      <Breadcrumb>
        <BreadcrumbItem>Home</BreadcrumbItem>
        <BreadcrumbItem href='#'>Channel</BreadcrumbItem>
        <BreadcrumbItem>News</BreadcrumbItem>
      </Breadcrumb>
    </div>
  );
};

export default App;
```

**主要 Props (Breadcrumb)**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| maxCount | 最多渲染的面包屑数量 | number | - |
| separator | 指定分割符 | string \| ReactNode | `<IconObliqueLine />` |
| className | 节点类名 | string \| string[] | - |
| routes | 直接设置下拉菜单 | RouteProps[] | [] |
| style | 节点样式 | CSSProperties | - |
| itemRender | routes 时生效，自定义渲染面包屑 | (route: RouteProps, routes: RouteProps[], paths: string[]) => ReactNode | - |

**主要 Props (Breadcrumb.Item)**:
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| href | 超链接地址 | string | - | 2.40.0 |
| droplist | 下拉菜单的内容，等同于下拉菜单组件的 droplist 属性 | DropdownProps['droplist'] | - | - |
| className | 节点类名 | string \| string[] | - | - |
| dropdownProps | 下拉菜单的属性 | DropdownProps | - | - |
| style | 节点样式 | CSSProperties | - | - |
| tagName | 标签名，可以是 html 标签或是组件 | string \| React.FC<any> \| React.ComponentClass<any> | div | 2.40.0 |
| onClick | 点击回调 | (e: any) => void | - | 2.40.0 |

**RouteProps 接口**:
```ts
interface RouteProps {
  path: string;
  breadcrumbName: string;
  children?: Array<{ path: string; breadcrumbName: string; }>;
}
```

**注意事项**:
- 分隔方式分为图标分隔及斜线分隔两种方式，可通过 `separator` 属性自定义
- 可通过 `style` 中的 `fontSize` 来自定义面包屑的尺寸
- 可通过 `droplist` 或 `routes` 来指定下拉菜单
- 通过 `maxCount` 可指定最多渲染的面包屑数量，超出的部分将显示为省略号

---

## Dropdown

**简介**: 页面上的命令过多时，可将备选命令收纳到向下展开的浮层容器中。

**基本用法**:
```tsx
import { Dropdown, Menu, Button, Space } from '@arco-design/web-react';
import { IconDown } from '@arco-design/web-react/icon';

const dropList = (
  <Menu>
    <Menu.Item key='1'>Beijing</Menu.Item>
    <Menu.Item key='2'>Shanghai</Menu.Item>
    <Menu.Item key='3'>Guangzhou</Menu.Item>
  </Menu>
);

function App() {
  return (
    <Space className='dropdown-demo'>
      <Dropdown droplist={dropList} position='bl'>
        <Button type='text'>Hover me <IconDown /></Button>
      </Dropdown>
      <Dropdown droplist={dropList} position='bl' disabled>
        <Button type='text'>Hover me <IconDown /></Button>
      </Dropdown>
    </Space>
  );
}

export default App;
```

**主要 Props (Dropdown)**:
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| defaultPopupVisible | 控制下拉框是否默认打开 | boolean | - | - |
| disabled | 是否禁用弹出 | boolean | - | 2.16.0 |
| popupVisible | 控制下拉框是否打开（受控模式） | boolean | - | - |
| unmountOnExit | 隐藏后是否销毁 DOM 结构 | boolean | true | - |
| position | 下拉框的弹出位置 | 'top' \| 'tl' \| 'tr' \| 'bottom' \| 'bl' \| 'br' | bl | - |
| trigger | 触发下拉框弹出的方式 | TriggerProps['trigger'] | hover | - |
| droplist | 下拉框的内容 | ReactNode | - | - |
| triggerProps | 弹出框下可接受所有 Trigger 组件的 Props | Partial<TriggerProps> | - | - |
| getPopupContainer | 弹出框挂在的父级节点 | (node: HTMLElement) => Element | - | - |
| onVisibleChange | 弹出框打开/关闭时会触发 | (visible: boolean) => void | - | - |

**主要 Props (Dropdown.Button)**:
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| defaultPopupVisible | 控制下拉框是否默认打开 | boolean | - | - |
| disabled | 是否禁用弹出 | boolean | - | 2.16.0 |
| popupVisible | 控制下拉框是否打开（受控模式） | boolean | - | - |
| unmountOnExit | 隐藏后是否销毁 DOM 结构 | boolean | true | - |
| position | 下拉框的弹出位置 | 'top' \| 'tl' \| 'tr' \| 'bottom' \| 'bl' \| 'br' | br | - |
| size | 等同于 Button 的 size | 'mini' \| 'small' \| 'default' \| 'large' | - | - |
| trigger | 触发下拉框弹出的方式 | TriggerProps['trigger'] | hover | - |
| type | 等同于 Button 的 type | 'default' \| 'primary' \| 'secondary' \| 'dashed' \| 'outline' \| 'text' | default | - |
| droplist | 下拉框的内容 | ReactNode | - | - |
| icon | 右侧显示内容，可以是 icon 或者任意 dom 元素 | ReactNode | `<IconMore />` | - |
| buttonProps | 接收 button 按钮的所有 Props，应用于左侧按钮 | ButtonProps | - | - |
| className | 节点类名 | string \| string[] | - | - |
| style | 节点样式 | CSSProperties | - | - |
| triggerProps | 弹出框下可接受所有 Trigger 组件的 Props | Partial<TriggerProps> | - | - |
| buttonsRender | 自定义两个按钮的渲染 | (buttons: ReactNode[]) => ReactNode[] | - | - |

**注意事项**:
- 支持 6 种弹出方位：top(向上), tl(左上), tr(右上), bottom(下方), bl(左下/默认), br(右下)
- trigger 支持 hover 和 click 两种方式
- 支持右键菜单触发方式（`trigger='contextMenu'`）
- `Menu.onClickMenuItem` 可指定点击菜单项时的回调，返回 false 可阻止菜单关闭
- 可通过 `triggerProps` 配置 Trigger 组件的所有属性

---

## Menu

**简介**: 收纳、排列并展示一系列选项的列表。

**基本用法**:
```tsx
import { Menu } from '@arco-design/web-react';
const MenuItem = Menu.Item;
const SubMenu = Menu.SubMenu;

function App() {
  return (
    <div className='menu-demo'>
      <Menu mode='horizontal' defaultSelectedKeys={['1']}>
        <MenuItem key='0' style={{ padding: 0, marginRight: 38 }} disabled>
          <div style={{ width: 80, height: 30, borderRadius: 2, background: 'var(--color-fill-3)', cursor: 'text' }} />
        </MenuItem>
        <MenuItem key='1'>Home</MenuItem>
        <MenuItem key='2'>Solution</MenuItem>
        <MenuItem key='3'>Cloud Service</MenuItem>
        <MenuItem key='4'>Cooperation</MenuItem>
      </Menu>
    </div>
  );
}

export default App;
```

**主要 Props (Menu)**:
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| accordion | 开启手风琴效果 | boolean | - | - |
| autoOpen | 默认展开所有多级菜单 | boolean | - | - |
| autoScrollIntoView | 是否自动滚动选中项目到可见区域 | boolean | - | - |
| collapse | 是否水平折叠收起菜单 | boolean | - | - |
| hasCollapseButton | 是否内置折叠按钮 | boolean | - | - |
| selectable | 菜单选项是否可选 | boolean | true | - |
| levelIndent | 层级之间的缩进量 | number | - | - |
| mode | 菜单类型 | 'vertical' \| 'horizontal' \| 'pop' \| 'popButton' | vertical | - |
| theme | 菜单风格 | 'light' \| 'dark' | light | - |
| className | 节点类名 | string \| string[] | - | - |
| defaultOpenKeys | 初始展开的子菜单 key 数组 | string[] | - | - |
| defaultSelectedKeys | 初始选中的菜单项 key 数组 | string[] | - | - |
| ellipsis | 水平菜单是否自动溢出省略 | boolean \| { text?: ReactNode } | true | 2.24.0 |
| icons | 用于定制图标 | { horizontalArrowDown?: ReactNode \| null; popArrowRight?: ReactNode \| null; collapseDefault?: ReactNode \| null; collapseActive?: ReactNode \| null; } | - | - |
| openKeys | 展开的子菜单 key 数组（受控模式） | string[] | - | - |
| scrollConfig | 滚动到可见区域的配置项 | { [key: string]: any } | - | - |
| selectedKeys | 选中的菜单项 key 数组（受控模式） | string[] | - | - |
| style | 节点样式 | CSSProperties | - | - |
| tooltipProps | 弹出模式下可接受所有 ToolTip 的 Props | Partial<TooltipProps> | - | - |
| triggerProps | 弹出模式下可接受所有 Trigger 的 Props | Partial<TriggerProps> | - | - |
| onClickMenuItem | 点击菜单项的回调 | (key: string, event, keyPath: string[]) => any | - | event in 2.15.0, keyPath in 2.19.0 |
| onClickSubMenu | 点击子菜单标题的回调 | (key: string, openKeys: string[], keyPath: string[]) => void | - | keyPath in 2.19.0 |
| onCollapseChange | 折叠状态改变时的回调 | (collapse: boolean) => void | - | - |
| onEllipsisChange | 水平菜单自动超出省略发生变化时的回调 | (status: { lastVisibleIndex: number; overflowNodes: ReactNode[] }) => void | - | 2.57.0 |

**主要 Props (Menu.SubMenu)**:
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| selectable | 是否将多级菜单头也作为一个菜单项 | boolean | - | - |
| key | 唯一标志 | string (必填) | - | - |
| title | 子菜单的标题 | string \| ReactNode | - | - |
| className | 节点类名 | string \| string[] | - | - |
| style | 节点样式 | CSSProperties | - | - |
| triggerProps | 弹出模式下可接受所有 Trigger 的 Props | Partial<TriggerProps> | - | 2.19.0 |
| popup | 是否强制使用弹出模式 | boolean \| ((level: number) => boolean) | - | 2.8.0 |

**主要 Props (Menu.ItemGroup)**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| title | 菜单组的标题 | string \| ReactNode | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**主要 Props (Menu.Item)**:
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| disabled | 菜单项禁止选中 | boolean | - | - |
| key | 唯一标志 | string (必填) | - | - |
| className | 节点类名 | string \| string[] | - | - |

**注意事项**:
- mode 支持 vertical（垂直）、horizontal（水平）、pop（弹出）、popButton（按钮组样式的悬浮菜单）
- theme 支持 light 和 dark 两种风格
- 可通过 `collapse` 配合 `hasCollapseButton` 实现可折叠菜单
- `renderItemInTooltip` 可指定菜单收起时 Tooltip 中展示的菜单项内容
- `ellipsis` 属性可控制水平菜单是否自动溢出省略

---

## PageHeader

**简介**: 页头位于页容器中，页容器顶部，起到了内容概览和引导页级操作的作用。包括由面包屑、标题等内容。

**基本用法**:
```tsx
import { PageHeader, Message, Radio } from '@arco-design/web-react';

const App = () => {
  return (
    <div style={{ background: 'var(--color-fill-2)', padding: 40 }}>
      <PageHeader
        style={{ background: 'var(--color-bg-2)' }}
        title='ArcoDesign'
        subTitle='This is a description'
        extra={
          <div>
            <Radio.Group mode='fill' type='button' defaultValue='small'>
              <Radio value='large'>Large</Radio>
              <Radio value='medium'>Medium</Radio>
              <Radio value='small'>Small</Radio>
            </Radio.Group>
          </div>
        }
      />
    </div>
  );
};

export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| extra | 展示额外内容 | ReactNode | - |
| footer | 底部内容 | ReactNode | - |
| subTitle | 次级标题 | ReactNode | - |
| title | 主标题 | ReactNode | - |
| backIcon | 返回图标，设置为 false 时会隐藏图标 | ReactNode \| boolean | - |
| breadcrumb | 面包屑，接受面包屑的所有属性 | BreadcrumbProps | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |
| onBack | 点击返回图标的回调 | (e: MouseEvent) => void | - |

**注意事项**:
- 默认是没有底色的，可通过 `style` 或类名设置不同底色
- `backIcon` 可自定义返回图标，设置为 `false` 隐藏图标
- `breadcrumb` 属性接受面包屑组件的所有属性
- 适合使用在需要简单描述的场景

---

## Pagination

**简介**: 采用分页控制单页内的信息数量，也可进行页面跳转。

**基本用法**:
```tsx
import { Pagination } from '@arco-design/web-react';

const App = () => {
  return <Pagination total={200} />;
};

export default App;
```

**主要 Props**:
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| disabled | 是否禁用 | boolean | - | - |
| hideOnSinglePage | 是否在只有一页的情况下隐藏 | boolean | - | 2.6.0 |
| pageSizeChangeResetCurrent | pageSize 改变的时候重置当前页码为 1 | boolean | true | - |
| showJumper | 是否显示快速跳转到某页，在 simple 模式下默认为 true | boolean | - | - |
| showMore | 是否显示更多页码提示 | boolean | - | - |
| simple | 是否应用精简分页模式 | boolean | - | - |
| sizeCanChange | 是否可以改变每页条数 | boolean | - | - |
| bufferSize | current 页与 ... 之间的页码个数 | number | 2 | 2.32.0 |
| current | 当前页 | number | - | - |
| defaultCurrent | 当前页默认值 | number | - | - |
| defaultPageSize | 默认每页数据条数 | number | - | - |
| pageSize | 每页数据条数 | number | - | - |
| total | 数据总数 | number | - | - |
| itemRender | 定制分页按钮的结构 | (page: number, type: 'page' \| 'more' \| 'prev' \| 'next', originElement: ReactNode) => ReactNode | - | - |
| size | 分页器尺寸 | 'mini' \| 'small' \| 'default' \| 'large' | - | - |
| activePageItemStyle | 被选中的分页按钮样式 | CSSProperties | - | - |
| className | 节点类名 | string \| string[] | - | - |
| icons | 设置分页器的图标 | { prev?: ReactNode; next?: ReactNode; more?: ReactNode; } | - | - |
| pageItemStyle | 分页按钮样式 | CSSProperties | - | - |
| selectProps | 用于配置弹出框的属性 | Partial<SelectProps> | - | - |
| sizeOptions | 每页可以显示数据条数 | number[] | - | - |
| style | 节点样式 | CSSProperties | - | - |
| onChange | 变化时的回调 | (pageNumber: number, pageSize: number) => void | - | - |
| onPageSizeChange | pageSize 变化时的回调 | (size: number, current: number) => void | - | - |
| showTotal | 是否显示数据总数 | boolean \| ((total: number, range: number[]) => ReactNode) | - | - |

**注意事项**:
- 页码数较大时，会自动使用多页码的分页样式
- `bufferSize` 可设置当前页与 `...` 之间的页码个数，一个 `...` 至少代表省略 2 页
- `sizeCanChange` 允许用户改变每页展示条目数量
- `showJumper` 允许输入页码快速跳转到指定页
- `simple` 模式应用精简分页样式
- `itemRender` 可定制分页按钮的结构

---

## Steps

**简介**: 明示任务流程和当前完成程度，引导用户按照步骤完成任务。

**基本用法**:
```tsx
import { Steps, Divider } from '@arco-design/web-react';
const Step = Steps.Step;

const App = () => {
  return (
    <div>
      <Steps current={2} style={{ maxWidth: 780, margin: '0 auto' }}>
        <Step title='Succeeded' />
        <Step title='Processing' />
        <Step title='Pending' />
      </Steps>
      <Divider />
      <div style={{ lineHeight: '140px', textAlign: 'center', color: '#C9CDD4' }}>
        Step 2 Content
      </div>
    </div>
  );
};

export default App;
```

**主要 Props (Steps)**:
| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| lineless | 无连接线模式 | boolean | - |
| current | 当前步数 | number | 1 |
| direction | 显示方向 | 'vertical' \| 'horizontal' | horizontal |
| labelPlacement | 标签描述文字放置的位置 | 'horizontal' \| 'vertical' | horizontal |
| size | 步骤条的尺寸 | 'default' \| 'small' | default |
| status | 当前步数的节点状态 | 'wait' \| 'process' \| 'finish' \| 'error' | - |
| type | 节点样式类型 | 'default' \| 'arrow' \| 'dot' \| 'navigation' | default |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |
| customDot | 自定义步骤条节点，不支持箭头模式 | (IconDot: ReactNode, stepConfig: CustomDotRecord) => ReactNode | - |
| onChange | 点击步骤切换的回调，设置这个属性后，步骤条可点击切换 | (current: number, id: any) => void | - |

**主要 Props (Steps.Step)**:
| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| disabled | 当前步骤点击被禁用 | boolean | - | - |
| status | 节点状态 | 'wait' \| 'process' \| 'finish' \| 'error' | - | - |
| description | 节点描述 | string \| ReactNode | - | - |
| title | 节点标题 | string \| ReactNode | - | - |
| className | 节点类名 | string \| string[] | - | 2.11.0 |
| id | 指定节点的 ID，将在 onChange 回调中作为参数 | any | - | - |
| style | 节点样式 | CSSProperties | - | 2.11.0 |
| onClick | 点击回调 | (index: number, id: any, e) => void | - | e in 2.40.0 |

**CustomDotRecord 类型**:
```ts
type CustomDotRecord = {
  index: number;
  status: string;
  title: ReactNode;
  description: ReactNode;
};
```

**注意事项**:
- 支持 4 种节点样式类型：default（默认）、arrow（箭头）、dot（点状）、navigation（导航）
- 设置 `onChange` 后，步骤条可点击切换步骤
- `type='arrow'` 时支持小尺寸（mini arrow）
- `direction` 支持 vertical（竖直）和 horizontal（水平）
- `labelPlacement` 可控制标签放在图标右侧（horizontal）或图标下方（vertical）
- `lineless` 可隐藏连接线
- `customDot` 可自定义步骤条节点，但不支持箭头模式

---

*文档采集时间：Arco Design React 导航组件*
*来源：https://arco.design/react/components*


# Arco Design React - 其他 (Others) 类别组件文档

> 采集来源: https://arco.design/react/components/
> 组件类别: 其他 (Others)

---

## 目录

1. [ConfigProvider - 全局配置](#configprovider)
2. [Affix - 固钉](#affix)
3. [Anchor - 锚点](#anchor)
4. [BackTop - 返回顶部](#backtop)
5. [Trigger - 触发器](#trigger)
6. [ResizeBox - 伸缩框](#resizebox)

---

### ConfigProvider

**简介**: 在应用的最外层进行配置，一次设置，全局生效。一般用于设置国际化语言等功能。

**基本用法**:
```tsx
import { useState } from 'react';
import { ConfigProvider, Radio, Pagination, DatePicker, TimePicker, Popconfirm, Button, Modal } from '@arco-design/web-react';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import enUS from '@arco-design/web-react/es/locale/en-US';

function App() {
  const [locale, setLocale] = useState('zh-CN');
  
  function getLocale() {
    switch (locale) {
      case 'zh-CN': return zhCN;
      case 'en-US': return enUS;
      default: return zhCN;
    }
  }
  
  return (
    <ConfigProvider locale={getLocale()}>
      <Radio.Group
        value={locale}
        options={['zh-CN', 'en-US']}
        type="button"
        mode="fill"
        onChange={setLocale}
      />
      <Pagination total={200} showTotal sizeCanChange />
      <DatePicker.RangePicker />
      <TimePicker.RangePicker />
      <Popconfirm title="Click to confirm!">
        <Button type="primary">Popconfirm</Button>
      </Popconfirm>
    </ConfigProvider>
  );
}
```

**主要 Props**:

| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| prefixCls | 全局组件类名前缀 | string | `arco` | - |
| size | 配置组件的默认尺寸，只会对支持 size 属性的组件生效 | `'mini' \| 'small' \| 'default' \| 'large'` | `default` | - |
| loadingElement | 全局的加载中图标，作用于所有组件 | ReactNode | - | - |
| componentConfig | 用于全局配置所有组件的默认参数 | ComponentConfig | - | 2.23.0 |
| focusLock | 全局配置弹出框的 focusLock，作用于 Modal Drawer 组件 | `{ modal?: boolean \| { autoFocus?: boolean }; drawer?: boolean \| { autoFocus?: boolean } }` | `{ modal: { autoFocus: true }, drawer: { autoFocus: true } }` | 2.13.0 |
| locale | 设置语言包 | Locale | - | - |
| tablePagination | Table 全局的分页配置 | PaginationProps | - | 2.6.0 |
| theme | 主题配置 | ThemeConfig | - | - |
| getPopupContainer | 全局弹出框挂载的父级节点 | `(node: HTMLElement) => Element` | `() => document.body` | - |
| renderEmpty | 全局配置组件内的空组件 | `(componentName?: string) => ReactNode` | - | 2.10.0 |
| rtl | 是否从右向左阅读 | boolean | - | - |
| effectGlobalNotice | 是否全局生效 Message/Notification | boolean | true | - |
| effectGlobalModal | 是否全局生效 Modal | boolean | true | - |

**注意事项**:
- 通过 `ConfigProvider` 设置的 `prefixCls` 和 `rtl` 默认会作用在所有的 `Message` 和 `Notification` 上
- 如果希望只在 `ConfigProvider` 内部作用，需要结合 `useMessage` 或者 `useNotification` 使用，并且关闭 `effectGlobalNotice`
- `componentConfig` 支持配置几乎所有组件的默认参数，如 `Button` 的 `type`、`DatePicker` 的 `dayStartOfWeek` 等

---

### Affix

**简介**: 将页面元素钉在可视范围。当内容区域比较长，需要滚动页面时，固钉可以将内容固定在屏幕上。常用于侧边菜单和按钮组合。

**基本用法**:
```tsx
import { Affix, Button } from '@arco-design/web-react';

const App = () => {
  return (
    <Affix>
      <Button type="primary">Affix Top</Button>
    </Affix>
  );
};
export default App;
```

**主要 Props**:

| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| offsetBottom | 距离窗口底部达到指定偏移量后触发 | number | - | - |
| offsetTop | 距离窗口顶部达到指定偏移量后触发 | number | 0 | - |
| affixClassName | 给 fixed 的元素设置 className | string \| string[] | - | 2.8.0 |
| affixStyle | 给 fixed 的元素设置 style，注意不要设置 position/top/width/height | CSSProperties | - | 2.8.0 |
| className | 节点类名 | string \| string[] | - | - |
| style | 节点样式 | CSSProperties | - | - |
| onChange | 固定状态发生改变时触发 | `(affixed: boolean) => void` | - | - |
| target | 滚动容器 | `() => HTMLElement \| null \| Window` | `() => window` | - |
| targetContainer | target 的外层滚动元素，用于监听滚动事件更新固钉位置 | `() => HTMLElement \| null \| Window` | - | - |

**注意事项**:
- `target` 指定为非 window 容器时，可能会出现外层元素滚动导致固钉元素跑出滚动容器的问题
- 可以通过传入 `targetContainer` 设置外层滚动元素，或在业务代码中监听外层滚动元素的 scroll 事件并调用 `affixRef.updatePosition()` 更新位置
- 注意不要通过 `affixStyle` 设置 `position`、`top`、`width`、`height`，因为这几个属性在元素 fixed 时用于定位

---

### Anchor

**简介**: 通过锚点可快速找到信息内容在当前页面的位置。

**基本用法**:
```tsx
import { Anchor } from '@arco-design/web-react';

const AnchorLink = Anchor.Link;

const App = () => {
  return (
    <Anchor offsetTop={60}>
      <AnchorLink href="#Basic" title="Basic">
        <AnchorLink href="#Static" title="Static">
          <AnchorLink href="#Lineless-mode" title="Lineless mode" />
          <AnchorLink href="#Affix" title="Affix" />
        </AnchorLink>
      </AnchorLink>
      <AnchorLink href="#Scroll-boundary" title="Scroll boundary" />
      <AnchorLink href="#Hash-mode" title="Hash mode" />
    </Anchor>
  );
};
export default App;
```

**主要 Props (Anchor)**:

| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| affix | 是否固定。设置为 true 时嵌套在固钉组件内 | boolean | true | - |
| animation | 是否平滑滚动 | boolean | true | - |
| hash | 是否改变 hash，false 时点击锚点不会改变页面 hash | boolean | true | - |
| lineless | 没有左侧轴线的样式 | boolean | - | - |
| offsetBottom | 距离窗口底部达到指定偏移量后触发（Affix 属性） | number | - | - |
| offsetTop | 距离窗口顶部达到指定偏移量后触发（Affix 属性） | number | - | - |
| targetOffset | 容器中基准线位置相对容器顶部的偏移量 | number | - | 2.22.0 |
| boundary | 滚动边界值 | number \| 'end' \| 'start' \| 'center' \| 'nearest' | start | - |
| direction | 方向 | 'vertical' \| 'horizontal' | vertical | 2.51.0 |
| affixStyle | 设置 Affix 组件的样式 | CSSProperties | - | - |
| className | 节点类名 | string \| string[] | - | - |
| scrollContainer | 滚动容器 | string \| HTMLElement \| Window | - | - |
| style | 节点样式 | CSSProperties | - | - |
| onChange | 滚动时锚点改变或点击锚点时触发 | `(newLink: string, oldLink: string) => void` | - | - |
| onSelect | 点击锚点时触发 | `(newLink: string, oldLink: string) => void` | - | - |

**主要 Props (Anchor.Link)**:

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| href | 锚点链接 | string | `#` |
| title | 文本内容，可以是字符串或自定义节点 | string \| ReactNode | - |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |

**注意事项**:
- 横向 Anchor 不支持嵌套
- 设置 `affix={false}` 可使锚点不随页面滚动，处于固定位置
- 设置 `hash={false}` 可使点击锚点不改变浏览器历史记录
- 设置 `boundary` 可控制锚点滚动边界行为

---

### BackTop

**简介**: 可一键返回顶部的按钮。

**基本用法**:
```tsx
import { BackTop, Typography } from '@arco-design/web-react';

const App = () => {
  return (
    <div style={{ position: 'relative', padding: '8px 12px' }}>
      <BackTop
        visibleHeight={30}
        style={{ position: 'absolute' }}
        target={() => document.getElementById('custom_backtop')}
      />
      <div id="custom_backtop" style={{ height: 300, overflow: 'auto' }}>
        <Typography.Paragraph>This is the content</Typography.Paragraph>
        {/* ...more content */}
      </div>
    </div>
  );
};
export default App;
```

**主要 Props**:

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| duration | 滚动到顶部的时间 | number | 400 |
| visibleHeight | 当滚动到这个高度时，显示返回顶部按钮 | number | 400 |
| easing | 滚动到顶部的缓动方式类型 | string | `quartOut` |
| className | 节点类名 | string \| string[] | - |
| style | 节点样式 | CSSProperties | - |
| onClick | 点击返回顶部时的回调函数 | `() => void` | - |
| target | 设置需要监听其滚动事件的元素 | `() => HTMLElement \| Window` | `() => window` |

**注意事项**:
- 支持自定义按钮内容，通过 children 传入自定义节点
- 提供了丰富的缓动类型（easing）：`linear`, `quadIn`, `quadOut`, `quadInOut`, `cubicIn`, `cubicOut`, `cubicInOut`, `quartIn`, `quartOut`, `quartInOut`, `quintIn`, `quintOut`, `quintInOut`, `sineIn`, `sineOut`, `sineInOut`, `bounceIn`, `bounceOut`, `bounceInOut`
- 可以设置 `duration` 来控制滚动到顶部的过渡时间

---

### Trigger

**简介**: 用于对元素添加 hover, click, focus 等事件，并且弹出下拉框。Trigger 组件默认是没有弹出框的样式的。

**基本用法**:
```tsx
import { Trigger, Button, Input, Skeleton, Typography, Space } from '@arco-design/web-react';

function Popup() {
  return (
    <div className="demo-trigger-popup" style={{ width: 300 }}>
      <Skeleton />
    </div>
  );
}

function App() {
  return (
    <Space size={40}>
      <Trigger
        popup={() => <Popup />}
        mouseEnterDelay={400}
        mouseLeaveDelay={400}
        position="bottom"
      >
        <Typography.Text>Hover me</Typography.Text>
      </Trigger>
      <Trigger
        popup={() => <Popup />}
        trigger="click"
        position="bottom"
        classNames="zoomInTop"
      >
        <Button>Click me</Button>
      </Trigger>
      <Trigger
        popup={() => <Popup />}
        trigger="focus"
        position="top"
        classNames="zoomInBottom"
      >
        <Input style={{ width: 200 }} placeholder="Focus on me" />
      </Trigger>
    </Space>
  );
}
export default App;
```

**主要 Props**:

| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| alignPoint | 弹出层跟随鼠标位置 | boolean | - | - |
| autoAlignPopupMinWidth | 自动对齐子元素的宽度设置弹出框的最小宽度 | boolean | - | - |
| autoAlignPopupWidth | 自动对齐子元素的宽度设置弹出框的宽度 | boolean | - | - |
| autoFitPosition | 是否根据空间自动调整弹出框的位置 | boolean | true | - |
| autoFixPosition | 当内容发生变化导致内容区域尺寸发生变化，自动进行重新定位 | boolean | true | - |
| blurToHide | 是否在触发节点失去焦点的时候关闭弹出框 | boolean | true | - |
| clickToClose | 是否能通过点击触发节点来关闭弹出框 | boolean | - | - |
| containerScrollToClose | 是否在容器滚动时关闭弹出框 | boolean | - | 2.34.0 |
| defaultPopupVisible | 默认弹出框开启或关闭 | boolean | - | - |
| disabled | 是否禁用 | boolean | - | - |
| escToClose | 是否允许按 ESC 键关闭弹出框 | boolean | - | - |
| mouseLeaveToClose | 是否在鼠标移出触发节点和弹出层的时候关闭弹出层 | boolean | true | 2.22.0 |
| popupHoverStay | 是否在鼠标移出触发节点，移入弹出框时保留弹出框 | boolean | true | - |
| popupVisible | 设置弹出框开启或关闭（受控） | boolean | - | - |
| showArrow | 是否展示箭头元素 | boolean | - | - |
| unmountOnExit | 隐藏后是否销毁 DOM 结构 | boolean | true | - |
| updateOnScroll | 是否在容器滚动时更新弹出框的位置 | boolean | - | 2.32.0 |
| focusDelay | focus 触发延时的毫秒数 | number | - | - |
| mouseEnterDelay | mouseenter 触发延时的毫秒数 | number | 100 | - |
| mouseLeaveDelay | mouseleave 触发延时的毫秒数 | number | 100 | - |
| childrenPrefix | 打开弹出后 children 上会添加类名 | string | - | - |
| classNames | 动画类名 | string | `fadeIn` | - |
| position | 弹出位置，12 个方位 | `'top' \| 'tl' \| 'tr' \| 'bottom' \| 'bl' \| 'br' \| 'left' \| 'lt' \| 'lb' \| 'right' \| 'rt' \| 'rb'` | bottom | - |
| trigger | 触发方式 | `'hover' \| 'click' \| 'focus' \| 'contextMenu' \| Array<'hover' \| 'click' \| 'focus' \| 'contextMenu'>` | hover | - |
| arrowProps | 箭头元素的所有 html 参数 | `HTMLAttributes<HTMLDivElement>` | - | - |
| boundaryDistance | 到视口边界一定距离时进行定位调整 | object | - | 2.59.0 |
| className | 节点类名 | string \| string[] | - | - |
| clickOutsideToClose | 是否在点击空白处时关闭弹出层 | boolean \| `{ capture: boolean }` | true | - |
| duration | 动画过渡时间 | number \| `{ exit?: number; enter?: number; appear?: number }` | 200 | - |
| onClickOutside | 点击触发节点和弹出框以外的区域的回调 | Function | - | - |
| popupAlign | 调整弹出框的位置 | `{ left/right/top/bottom?: number \| [number, number] }` | `{}` | - |
| popupStyle | 弹出框（内部）的样式 | CSSProperties | - | - |
| style | 弹出框（外部）的样式 | CSSProperties | - | - |
| getDocument | 在该元素上执行 clickOutside | `() => Element` | `() => window.document` | - |
| getPopupContainer | 设置弹出内容所插入的父元素 | `(node: HTMLElement) => Element` | - | - |
| onClick | 按钮点击事件（trigger 包含 click 时生效） | `(e) => void` | - | - |
| onVisibleChange | 显示或隐藏时触发的回调 | `(visible: boolean) => void` | - | - |
| popup | 弹出框的内容 | `() => ReactNode` | - | - |

**注意事项**:
- `trigger` 支持传入数组设置多个触发方式
- `onVisibleChange` 的触发时机根据 trigger 类型不同而有所区别：
  - trigger 包含 click 时：鼠标点击空白处会触发；点击触发节点会触发隐藏/显示
  - trigger 包含 hover 时：鼠标从弹出层/触发节点移出且在 mouseLeaveDelay 时间内未移入时会触发
  - trigger 包含 focus 时：触发节点失去焦点会触发
- 如果设置了 `getPopupContainer`，弹出层的样式属性 left 最小为 0，避免超出父元素被遮挡
- 弹出层可以嵌套在另一个弹出层内，支持多层嵌套

---

### ResizeBox

**简介**: 伸缩框组件。通过设置 `directions`，可以指定四条边中的哪几条边可以进行伸缩。同时支持面板分割（Split）、多面板分割（SplitGroup）等高级用法。

**基本用法**:
```tsx
import { ResizeBox, Divider, Typography } from '@arco-design/web-react';

const { Paragraph } = Typography;

const App = () => {
  return (
    <ResizeBox
      directions={['right', 'bottom']}
      style={{
        width: 500,
        minWidth: 100,
        maxWidth: '100%',
        height: 200,
        textAlign: 'center',
      }}
    >
      <Paragraph>Content here...</Paragraph>
      <Divider />
      <Paragraph>More content...</Paragraph>
    </ResizeBox>
  );
};
export default App;
```

**主要 Props (ResizeBox)**:

| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| height | 高度，受控属性 | number | - | 2.7.0 |
| width | 宽度，受控属性 | number | - | 2.7.0 |
| component | 伸缩框的 html 标签 | string | div | - |
| directions | 可以进行伸缩的边 | `Array<'left' \| 'right' \| 'top' \| 'bottom'>` | `['right']` | - |
| className | 节点类名 | string \| string[] | - | - |
| resizeIcons | 定制伸缩杆的图标 | `{ top/bottom/left/right?: ReactNode }` | `{}` | - |
| resizeTriggers | 定制伸缩杆的内容 | `{ top/bottom/left/right?: ReactNode }` | `{}` | - |
| style | 节点样式 | CSSProperties | - | - |
| onMoving | 拖拽中的回调 | `(e: MouseEvent, size: { width: number; height: number }) => void` | - | 2.7.0 |
| onMovingEnd | 拖拽结束之后的回调 | `() => void` | - | - |
| onMovingStart | 开始拖拽之前的回调 | `() => void` | - | - |

**主要 Props (ResizeBox.Split)**:

| 属性 | 说明 | 类型 | 默认值 | 版本 |
|------|------|------|--------|------|
| disabled | 禁用 | boolean | - | - |
| component | 分割框的 html 标签 | string | div | - |
| direction | 分割方向 | `'horizontal' \| 'vertical' \| 'horizontal-reverse' \| 'vertical-reverse'` | horizontal | reverse in 2.35.0 |
| icon | 定制伸缩杆的图标 | ReactNode | - | - |
| trigger | 定制伸缩杆的内容 | ReactNode | - | - |
| className | 节点类名 | string \| string[] | - | - |
| max | 最大阈值 | number \| string | - | - |
| min | 最小阈值 | number \| string | - | - |
| panes | 面板，[firstPane, secondPane] | ReactNode[] | (必填) | - |
| size | 分割的大小 (0~1 百分比或具体像素) | number \| string | 0.5 | - |
| style | 节点样式 | CSSProperties | - | - |
| onMoving | 拖拽中的回调 | `(e: MouseEvent, size: number \| string) => void` | - | 2.14.0 |
| onMovingEnd | 拖拽结束之后的回调 | `() => void` | - | - |
| onMovingStart | 开始拖拽之前的回调 | `() => void` | - | - |
| onPaneResize | 面板大小变化的回调 | `(paneContainers: HTMLElement[]) => void` | - | 2.25.0 |

**主要 Props (ResizeBox.SplitGroup in 2.27.0)**:

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| component | 分割框的 html 标签 | string | div |
| direction | 分割方向 | 'horizontal' \| 'vertical' | horizontal |
| icon | 定制伸缩杆的图标 | ReactNode | - |
| className | 节点类名 | string \| string[] | - |
| panes | 面板 | SplitGroupPane[] | (必填) |
| style | 节点样式 | CSSProperties | - |
| onMoving | 拖拽中的回调 | `(e: MouseEvent, size: string[], activeIndex: number) => void` | - |
| onMovingEnd | 拖拽结束之后的回调 | `(activeIndex: number) => void` | - |
| onMovingStart | 开始拖拽之前的回调 | `(activeIndex: number) => void` | - |
| onPaneResize | 面板大小变化的回调 | `(paneContainers: HTMLElement[]) => void` | - |

**主要 Props (ResizeBox.SplitGroup.Pane)**:

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| disabled | 禁用，将不会展示伸缩杆 | boolean | - |
| resizable | 是否支持拖拽伸缩 | boolean | true |
| content | 当前面板的内容 | ReactNode | (必填) |
| collapsible | 是否支持快速折叠 | boolean \| `{ prev?: boolean \| CollapsedConfig; next?: boolean \| CollapsedConfig }` | - |
| max | 最大阈值 | number \| string | - |
| min | 最小阈值，优先级比 max 高 | number \| string | - |
| size | 分割的大小 | number \| string | - |
| trigger | 定制伸缩杆内容 | `(prevNode, resizeNode, nextNode) => ReactNode` | - |

**主要 Props (ResizeBox.SplitGroup.CollapsedConfig)**:

| 属性 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| onClick | 点击快速折叠的回调 | `(e, collapsed, activeIndex, direction) => void` | - |
| icon | 快速折叠按钮的 icon | ReactNode | - |

**注意事项**:
- ResizeBox 支持受控的 width 和 height，通过 onChange 获取拖动中的高宽值
- `directions` 可以指定 `['left', 'right', 'top', 'bottom']` 中的任意组合
- ResizeBox.Split 支持水平/垂直分割，可通过 `direction` 属性控制
- ResizeBox.SplitGroup 支持多面板分割，每个面板可配置 collapsible（快速折叠）功能
- 分割大小 `size` 可以是 0~1 代表百分比，或具体数值的像素（如 `300px`）

---

*文档采集完成。所有信息来源于 Arco Design React 官方文档。*
