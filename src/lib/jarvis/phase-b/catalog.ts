export const PHASE_B_LIFECYCLES = [
  'CORE_ENABLED',
  'ENABLED_ON_DEMAND',
  'DOCKER_ON_DEMAND',
  'OPTIONAL_DISABLED',
  'POC_ONLY',
  'REMOTE_VPS_PROFILE',
  'NOT_NEEDED_AFTER_INSPECTION',
] as const;

export type PhaseBLifecycle = (typeof PHASE_B_LIFECYCLES)[number];

export interface PhaseBComponent {
  id: string;
  name: string;
  repository: string;
  canonicalRepository: string;
  category: string;
  kind: string;
  purpose: string;
  lifecycle: PhaseBLifecycle;
  version: string | null;
  commitSha: string;
  license: string;
  mode: 'docker' | 'native' | 'api' | 'mcp' | 'reference' | 'remote';
  capabilities: string[];
  env: string[];
  endpoint: string | null;
  port: number | null;
  approvalActions: string[];
  securityVerdict: 'VERIFIED' | 'LIMITED' | 'QUARANTINED';
  adapterVersion: string;
  installDate: string;
  verifiedAt: string;
}

const c = (value: Omit<PhaseBComponent,'adapterVersion'|'installDate'|'verifiedAt'>): PhaseBComponent => ({
  ...value,
  adapterVersion:'jarvis-phase-b-v1',
  installDate:'2026-08-09',
  verifiedAt:'2026-08-09',
});

/**
 * Verified 2026-08-09 from the public GitHub API. Versions are release tags;
 * SHA is retained even when a project has no formal release.
 */
export const PHASE_B_COMPONENTS: PhaseBComponent[] = [
  c({ id:'n8n', name:'n8n', repository:'n8n-io/n8n', canonicalRepository:'n8n-io/n8n', category:'AUTOMATION', kind:'automation', purpose:'Детерминированные рабочие процессы', lifecycle:'DOCKER_ON_DEMAND', version:'n8n@2.33.7', commitSha:'40dfa42ced26ba6fe01e511ec685f01ea77c0a83', license:'Sustainable Use License / Enterprise License', mode:'docker', capabilities:['automation.workflow.list','automation.workflow.get','automation.workflow.create','automation.workflow.update','automation.workflow.run','automation.workflow.stop','automation.workflow.status','automation.execution.list','automation.execution.inspect'], env:[], endpoint:'http://127.0.0.1:15678', port:15678, approvalActions:[], securityVerdict:'LIMITED' }),
  c({ id:'n8n-mcp', name:'n8n MCP', repository:'czlonkowski/n8n-mcp', canonicalRepository:'czlonkowski/n8n-mcp', category:'AUTOMATION', kind:'automation', purpose:'MCP-каталог узлов и операций n8n', lifecycle:'OPTIONAL_DISABLED', version:'v2.68.4', commitSha:'5e3c425faaf0823b320c67ed8936903b00c55267', license:'MIT', mode:'mcp', capabilities:['automation.nodes.search','automation.workflow.validate'], env:['N8N_API_URL','N8N_API_KEY'], endpoint:null, port:null, approvalActions:['automation.workflow.create','automation.workflow.update'], securityVerdict:'LIMITED' }),
  c({ id:'postiz', name:'Postiz', repository:'gitroomhq/postiz-app', canonicalRepository:'gitroomhq/postiz-app', category:'SOCIAL', kind:'social', purpose:'Планирование публикаций и аналитика', lifecycle:'DOCKER_ON_DEMAND', version:'v2.23.0', commitSha:'7d08f5b6fcac604ffb42420f82ee506407371fc7', license:'AGPL-3.0', mode:'docker', capabilities:['social.accounts.list','social.draft.create','social.schedule','social.publish','social.analytics'], env:['POSTIZ_API_URL','POSTIZ_API_KEY'], endpoint:null, port:null, approvalActions:['social.schedule','social.publish'], securityVerdict:'LIMITED' }),
  c({ id:'postiz-agent', name:'Postiz Agent', repository:'gitroomhq/postiz-agent', canonicalRepository:'gitroomhq/postiz-agent', category:'SOCIAL', kind:'social', purpose:'Подчинённый агент подготовки контента', lifecycle:'OPTIONAL_DISABLED', version:null, commitSha:'41c5a9dbd6b2776863e7c05c22e7a385c208321c', license:'NOASSERTION', mode:'api', capabilities:['social.content.prepare'], env:['POSTIZ_API_URL','POSTIZ_API_KEY'], endpoint:null, port:null, approvalActions:['social.publish'], securityVerdict:'LIMITED' }),
  c({ id:'trend-radar', name:'TrendRadar', repository:'sansan0/TrendRadar', canonicalRepository:'sansan0/TrendRadar', category:'MONITORING', kind:'monitoring', purpose:'Сбор и ранжирование трендов', lifecycle:'DOCKER_ON_DEMAND', version:null, commitSha:'8ee26026ba6c11dec41a95fb3895a7162876caa1', license:'GPL-3.0', mode:'docker', capabilities:['trend.sources.list','trend.scan','trend.rank','trend.report'], env:[], endpoint:null, port:null, approvalActions:[], securityVerdict:'VERIFIED' }),
  c({ id:'changedetection', name:'changedetection.io', repository:'dgtlmoon/changedetection.io', canonicalRepository:'dgtlmoon/changedetection.io', category:'MONITORING', kind:'monitoring', purpose:'Контроль изменений страниц', lifecycle:'DOCKER_ON_DEMAND', version:'0.55.8', commitSha:'aac6fcfa594f17511b8ff73e5eaa4f6c33899de0', license:'Apache-2.0', mode:'docker', capabilities:['monitor.create','monitor.list','monitor.check','monitor.history'], env:['CHANGEDETECTION_API_KEY'], endpoint:null, port:null, approvalActions:[], securityVerdict:'LIMITED' }),
  c({ id:'evolution-api', name:'Evolution API', repository:'EvolutionAPI/evolution-api', canonicalRepository:'evolution-foundation/evolution-api', category:'MESSAGING', kind:'messaging', purpose:'Адаптер WhatsApp; неофициальный режим экспериментален', lifecycle:'OPTIONAL_DISABLED', version:'2.3.7', commitSha:'fa09d37892cdbb1d65a250155d293d92230c5b30', license:'NOASSERTION', mode:'docker', capabilities:['message.whatsapp.conversation.list','message.whatsapp.read','message.whatsapp.draft','message.whatsapp.send'], env:['EVOLUTION_API_URL','EVOLUTION_API_KEY','EVOLUTION_INSTANCE_NAME'], endpoint:null, port:null, approvalActions:['message.whatsapp.send','message.whatsapp.mass_send'], securityVerdict:'LIMITED' }),
  c({ id:'telegram-grammy', name:'Telegram grammY', repository:'grammyjs/grammY', canonicalRepository:'grammyjs/grammY', category:'MESSAGING', kind:'messaging', purpose:'Безопасный Telegram-транспорт', lifecycle:'ENABLED_ON_DEMAND', version:'v1.45.1', commitSha:'7b2cacd2b0a646d868c6e97a3eeceb23858700b1', license:'MIT', mode:'api', capabilities:['message.telegram.read','message.telegram.draft','message.telegram.send'], env:['TELEGRAM_BOT_TOKEN'], endpoint:'https://api.telegram.org', port:null, approvalActions:['message.telegram.send'], securityVerdict:'LIMITED' }),
  c({ id:'livekit-agents', name:'LiveKit Agents', repository:'livekit/agents', canonicalRepository:'livekit/agents', category:'CALLS', kind:'calls', purpose:'Транспорт локальных голосовых сессий', lifecycle:'OPTIONAL_DISABLED', version:'livekit-agents@1.6.9', commitSha:'02569a40794645195bd92003431e5197ea413922', license:'Apache-2.0', mode:'api', capabilities:['voice.session.create','voice.session.start','voice.session.stop','voice.session.transcript'], env:['LIVEKIT_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET'], endpoint:null, port:null, approvalActions:['call.external'], securityVerdict:'LIMITED' }),
  c({ id:'openmontage', name:'OpenMontage', repository:'calesthio/OpenMontage', canonicalRepository:'calesthio/OpenMontage', category:'VIDEO', kind:'video', purpose:'Монтаж видео', lifecycle:'OPTIONAL_DISABLED', version:null, commitSha:'4eab34c5cfcccaa4f1970554928feccce73ee930', license:'AGPL-3.0', mode:'native', capabilities:['video.edit','video.compose','video.preview'], env:[], endpoint:null, port:null, approvalActions:[], securityVerdict:'LIMITED' }),
  c({ id:'video-starter-kit', name:'Video Starter Kit', repository:'fal-ai-community/video-starter-kit', canonicalRepository:'fal-ai-community/video-starter-kit', category:'VIDEO', kind:'video', purpose:'Генерация клипов через провайдер', lifecycle:'OPTIONAL_DISABLED', version:null, commitSha:'f72ddee32092d2ce78576844f51e98db521fdfc8', license:'MIT', mode:'api', capabilities:['video.generate','video.status'], env:['FAL_KEY'], endpoint:null, port:null, approvalActions:[], securityVerdict:'LIMITED' }),
  c({ id:'money-printer-turbo', name:'MoneyPrinterTurbo', repository:'harry0703/MoneyPrinterTurbo', canonicalRepository:'harry0703/MoneyPrinterTurbo', category:'VIDEO', kind:'video', purpose:'Сборка коротких видео', lifecycle:'OPTIONAL_DISABLED', version:'v1.3.3', commitSha:'e14dea5578bb2154480b6bc436009eaa9987f0e3', license:'MIT', mode:'native', capabilities:['video.script','video.assets','video.render'], env:[], endpoint:null, port:null, approvalActions:[], securityVerdict:'VERIFIED' }),
  c({ id:'penpot', name:'Penpot', repository:'penpot/penpot', canonicalRepository:'penpot/penpot', category:'DESIGN', kind:'design', purpose:'Дизайн-центр по запросу', lifecycle:'DOCKER_ON_DEMAND', version:'2.17.0', commitSha:'b5bec4f983b5540a3ed7969121badf08a14f384e', license:'MPL-2.0', mode:'docker', capabilities:['design.project.open','design.project.list','design.project.export'], env:[], endpoint:null, port:null, approvalActions:[], securityVerdict:'LIMITED' }),
  c({ id:'paperless', name:'Paperless-ngx', repository:'paperless-ngx/paperless-ngx', canonicalRepository:'paperless-ngx/paperless-ngx', category:'DOCUMENT ARCHIVE', kind:'document_archive', purpose:'Опциональный архив документов', lifecycle:'DOCKER_ON_DEMAND', version:'v3.0.5', commitSha:'1d61f7fc620e1741fb9715973c56443954e73da4', license:'GPL-3.0', mode:'docker', capabilities:['archive.documents.list','archive.document.get','archive.search','archive.import'], env:[], endpoint:null, port:null, approvalActions:['archive.import'], securityVerdict:'LIMITED' }),
  c({ id:'sipp', name:'Sipp', repository:'noumena-labs/Sipp', canonicalRepository:'noumena-labs/Sipp', category:'EDGE AI', kind:'edge_ai', purpose:'WebGPU POC и benchmark', lifecycle:'POC_ONLY', version:'sipp-v0.1.3', commitSha:'4447b0e46612a8eec421cbf3994c5e10b4efd9c0', license:'Apache-2.0', mode:'reference', capabilities:['edge.benchmark'], env:[], endpoint:null, port:null, approvalActions:[], securityVerdict:'VERIFIED' }),
  c({ id:'cam2ip', name:'cam2ip', repository:'gen2brain/cam2ip', canonicalRepository:'gen2brain/cam2ip', category:'MEDIA', kind:'media', purpose:'Опциональный видеопоток; камера по умолчанию выключена', lifecycle:'OPTIONAL_DISABLED', version:'v1.7.0', commitSha:'799ff27b74c8952cbe81e6d186db20ceb9b18133', license:'GPL-3.0', mode:'native', capabilities:['camera.health','camera.list','camera.start','camera.stop','camera.stream','camera.snapshot'], env:[], endpoint:null, port:null, approvalActions:['camera.start','camera.snapshot'], securityVerdict:'VERIFIED' }),
  c({ id:'phoneclaw', name:'PhoneClaw', repository:'rohanarun/phoneclaw', canonicalRepository:'rohanarun/phoneclaw', category:'MOBILE', kind:'mobile', purpose:'Экспериментальный worker для запасного Android', lifecycle:'OPTIONAL_DISABLED', version:null, commitSha:'c59995b726a127da16275d2d8e0760408b988542', license:'MIT', mode:'reference', capabilities:['mobile.screen.inspect','mobile.app.open','mobile.tap','mobile.type','mobile.workflow'], env:[], endpoint:null, port:null, approvalActions:['mobile.app.open','mobile.tap','mobile.type','mobile.workflow'], securityVerdict:'VERIFIED' }),
  c({ id:'vespasian', name:'Vespasian', repository:'praetorian-inc/vespasian', canonicalRepository:'praetorian-inc/vespasian', category:'SECURITY TOOLS', kind:'security_tool', purpose:'Авторизованное тестирование API', lifecycle:'OPTIONAL_DISABLED', version:'v1.0.0', commitSha:'942a2a58bc388ea5e8dc1f828b07ad4bae5087c4', license:'Apache-2.0', mode:'native', capabilities:['api.discover','api.observe','api.openapi.generate','api.graphql.inspect','api.runtime.compare'], env:[], endpoint:null, port:null, approvalActions:['api.discover','api.observe','api.openapi.generate','api.graphql.inspect','api.runtime.compare'], securityVerdict:'VERIFIED' }),
  c({ id:'coolify', name:'Coolify', repository:'coollabsio/coolify', canonicalRepository:'coollabsio/coolify', category:'DEPLOYMENT', kind:'deployment', purpose:'Только удалённый VPS-профиль', lifecycle:'REMOTE_VPS_PROFILE', version:'v4.1.2', commitSha:'940571e16f5a0e6c73cf56b4bb1184bed3d60623', license:'Apache-2.0', mode:'remote', capabilities:['deployment.status','deployment.preview','deployment.request'], env:['COOLIFY_API_URL','COOLIFY_API_TOKEN'], endpoint:null, port:null, approvalActions:['deployment.request'], securityVerdict:'VERIFIED' }),
  c({ id:'certimate', name:'Certimate', repository:'certimate-go/certimate', canonicalRepository:'certimate-go/certimate', category:'DEPLOYMENT', kind:'deployment', purpose:'Опциональное управление сертификатами', lifecycle:'OPTIONAL_DISABLED', version:'v0.4.29', commitSha:'1f5832386b4cd7fa3c1be449277fb5602958b3ea', license:'MIT', mode:'api', capabilities:['certificate.status','certificate.change.request'], env:['CERTIMATE_API_URL','CERTIMATE_API_TOKEN'], endpoint:null, port:null, approvalActions:['certificate.change.request'], securityVerdict:'VERIFIED' }),
  c({ id:'meetily', name:'Meetily', repository:'Zackriya-Solutions/meetily', canonicalRepository:'Zackriya-Solutions/meetily', category:'CALLS', kind:'calls', purpose:'Опциональный захват заметок встречи', lifecycle:'OPTIONAL_DISABLED', version:'v0.4.0', commitSha:'0281737d87d26352fb0adc78c8c0975f691b23d1', license:'MIT', mode:'native', capabilities:['meeting.capture','meeting.notes'], env:[], endpoint:null, port:null, approvalActions:['meeting.capture'], securityVerdict:'VERIFIED' }),
  c({ id:'nautilus-trader', name:'NautilusTrader', repository:'nautechsystems/nautilus_trader', canonicalRepository:'nautechsystems/nautilus_trader', category:'TRADING RESEARCH', kind:'trading_research', purpose:'Только исследования и backtesting; LIVE_TRADING=false', lifecycle:'OPTIONAL_DISABLED', version:'v1.231.0', commitSha:'c7b7f6c4236b6e8bb0bebc20999e4c93db64e56b', license:'LGPL-3.0', mode:'native', capabilities:['market.backtest','market.strategy.test','market.simulate','market.metrics'], env:[], endpoint:null, port:null, approvalActions:['financial.action'], securityVerdict:'VERIFIED' }),
];

export function validatePhaseBCatalog() {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const entry of PHASE_B_COMPONENTS) {
    if (ids.has(entry.id)) errors.push(`Дублирующий id: ${entry.id}`);
    if (!/^[a-f0-9]{40}$/.test(entry.commitSha)) errors.push(`Некорректный SHA: ${entry.id}`);
    if (entry.endpoint && !entry.endpoint.startsWith('http://127.0.0.1') && entry.mode === 'docker') errors.push(`Docker endpoint не loopback: ${entry.id}`);
    ids.add(entry.id);
  }
  return { valid: errors.length === 0, errors };
}
