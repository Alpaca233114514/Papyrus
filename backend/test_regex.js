const p = /```\s*(\{[^{}]*"tool"[^{}]*\})\s*```/gs;
const str = '```\n{"a":"b","tool":"x"}\n```';
const m = [...str.matchAll(p)];
console.log('matches:', m.length);
for (const x of m) console.log(x[1]);
