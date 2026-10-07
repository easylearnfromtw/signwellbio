export interface Candidate { id:string; topics:string[]; quality:number; publishedAt:string; sensitive?:boolean; }
export interface Interest { [topic:string]: {score:number;confidence:number}; }

export function rankNewsletter(candidates:Candidate[], interests:Interest, seen:Set<string>, options={exploration:0.12,maxItems:6}) {
  const scored = candidates.filter(c=>!seen.has(c.id) && !c.sensitive).map(c=>{
    const affinity = c.topics.reduce((s,t)=>{
      const x = interests[t];
      return s + (x ? x.score * x.confidence : 0);
    },0) / Math.max(1,c.topics.length);
    const ageDays = Math.max(0,(Date.now()-new Date(c.publishedAt).getTime())/86400000);
    const freshness = Math.exp(-Math.log(2)*ageDays/21);
    const score = 0.60*affinity + 0.25*c.quality + 0.15*freshness;
    return {...c,score};
  }).sort((a,b)=>b.score-a.score);

  const selected: typeof scored = [];
  const usedTopics = new Set<string>();
  for (const item of scored) {
    const overlap = item.topics.filter(t=>usedTopics.has(t)).length;
    const diversityPenalty = overlap * 0.08;
    if (item.score-diversityPenalty < 0.08 && selected.length>=2) continue;
    selected.push({...item,score:item.score-diversityPenalty});
    item.topics.forEach(t=>usedTopics.add(t));
    if (selected.length>=options.maxItems) break;
  }
  return selected;
}
