/**
 * 窗景内容数据。
 * 每条记录关联一张照片和一句诗文。
 * TODO: 接入后端接口后，替换 fetchSceneryContent() 的实现。
 */

export type SceneryContent = {
  id: string;
  image: string;       // 图片路径，相对 /public
  poem: string;        // 诗句正文
  source?: string;     // 出处（可选）
};

// 本地静态数据
const localContent: SceneryContent[] = [
  {
    id: 'image',
    image: '/scenery/image.png',
    poem: '春未老，风细柳斜斜。试上超然台上望，半壕春水一城花，烟雨暗千家。寒食后，酒醒却咨嗟。休对故人思故国，且将新火试新茶，诗酒趁年华。',
    source: '[宋] 苏轼《望江南·超然台作》',
  },
];

/**
 * 获取当前窗景内容。
 * 有后端时替换为真实请求，无后端降级到本地数据。
 */
export async function fetchSceneryContent(): Promise<SceneryContent> {
  // TODO: 替换为后端接口
  // const res = await fetch('/api/scenery/today');
  // if (res.ok) return res.json();
  return localContent[0];
}