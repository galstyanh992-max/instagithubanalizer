import { classifyMessageRisk, type MessagingMode } from './policies';

export const CENTER_PIPELINES = {
  automation:['определить повторяемую задачу','собрать детерминированный workflow','проверить','запустить','наблюдать'],
  social:['исследование трендов','анализ конкурентов','стратегия','черновик','бренд-ревью','предпросмотр','подтверждение','очередь'],
  video:['идея','сценарий','раскадровка','ассеты','клипы','голос','музыка','субтитры','монтаж','QA','предпросмотр','подтверждение','социальная очередь'],
  calls:['комната','голосовая сессия','распознавание','ответ','протокол'],
} as const;

export const VIDEO_PROFILES = ['tiktok-9:16','reels-9:16','shorts-9:16','landscape-16:9'] as const;

export function aggregateTrendSignals(signals:Array<{source:string;topic:string;score:number}>) {
  const merged=new Map<string,{topic:string;score:number;sources:Set<string>}>();
  for(const signal of signals) {
    const key=signal.topic.trim().toLocaleLowerCase('ru-RU');
    if(!key) continue;
    const current=merged.get(key) ?? {topic:signal.topic.trim(),score:0,sources:new Set<string>()};
    current.score+=Math.max(0,signal.score);
    current.sources.add(signal.source);
    merged.set(key,current);
  }
  return [...merged.values()].map((item)=>({...item,sources:[...item.sources]})).sort((a,b)=>b.score-a.score || a.topic.localeCompare(b.topic));
}

export function createSocialDraft(input: { topic:string; platform:string; objective?:string }) {
  const id=`draft-${crypto.randomUUID()}`;
  return {
    id,
    status:'draft',
    title:input.topic,
    platform:input.platform,
    objective:input.objective ?? 'информирование',
    pipeline:['research','idea','copy','optional_asset','draft','preview','approval_required'],
    preview:{ title:input.topic, platform:input.platform, publishable:false },
    approvalRequired:true,
    approvalType:'SOCIAL_PUBLISH',
    published:false,
    createdAt:new Date().toISOString(),
  };
}

export function createSocialApprovalPreview(draft: ReturnType<typeof createSocialDraft>) {
  return {
    id:`phase-b-approval-${crypto.randomUUID()}`,
    status:'pending',
    approvalType:'SOCIAL_PUBLISH',
    title:`Публикация черновика «${draft.title}»`,
    description:'Черновик готов к проверке. Одобрение не публикует его автоматически.',
    target:draft.platform,
    agent:'publisher',
    reason:'Публичная публикация является внешним действием высокого риска.',
    preview:draft.preview,
    risk:'high',
    service:'Postiz',
    account:null,
    draftId:draft.id,
    sideEffectExecuted:false,
  };
}

export function createVideoPlan(input: { topic:string; profile:(typeof VIDEO_PROFILES)[number] }) {
  return { id:`video-${crypto.randomUUID()}`, status:'planned', topic:input.topic, profile:input.profile, pipeline:[...CENTER_PIPELINES.video], preview:{kind:'local_storyboard_fixture',frames:3,cost:'none'}, externalPublish:false, createdAt:new Date().toISOString() };
}

export function prepareMessage(input: { text:string; mode:MessagingMode; attachmentKnown?:boolean; massSend?:boolean }) {
  const risk = classifyMessageRisk(input);
  const canAutoSend = input.mode === 'AUTO_SAFE' && !risk.requiresEscalation && !input.massSend;
  return {
    mode:input.mode,
    risk,
    action:canAutoSend ? 'AUTO_SAFE_SEND_ALLOWED':'DRAFT_ONLY',
    draft:{redacted:true,characterCount:input.text.length},
    sent:false,
  };
}

export function createLocalCallSession(input: { room:string; external?:boolean }) {
  return { id:`call-${crypto.randomUUID()}`, room:input.room, transport:'livekit', external:Boolean(input.external), status:input.external ? 'approval_required':'simulated', approvalType:input.external ? 'CALL_EXTERNAL':null };
}
