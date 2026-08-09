export const PHASE_B_AGENT_PROFILES = [
  ['trend-scout', 'Разведчик трендов', ['trend.scan','trend.rank']],
  ['competitor-analyst', 'Аналитик конкурентов', ['monitor.check','trend.report']],
  ['content-strategist', 'Контент-стратег', ['social.strategy','social.plan']],
  ['copywriter', 'Копирайтер', ['social.draft.create','video.script']],
  ['visual-producer', 'Визуальный продюсер', ['design.project.export','video.assets']],
  ['video-producer', 'Видеопродюсер', ['video.compose','video.preview']],
  ['brand-reviewer', 'Бренд-ревьюер', ['social.review','video.qa']],
  ['publisher', 'Публикатор', ['social.schedule','social.publish']],
  ['community-manager', 'Менеджер сообщества', ['message.whatsapp.conversation.list','message.whatsapp.draft','message.telegram.draft']],
  ['analytics-optimizer', 'Оптимизатор аналитики', ['social.analytics','trend.report']],
] as const;

export type PhaseBAgentProfile = {
  id: string;
  name: string;
  capabilities: readonly string[];
  providerPolicy: 'provider-router';
  isModel: false;
};

export const phaseBAgentProfiles: PhaseBAgentProfile[] = PHASE_B_AGENT_PROFILES.map(([id,name,capabilities]) => ({ id, name, capabilities, providerPolicy:'provider-router', isModel:false }));
