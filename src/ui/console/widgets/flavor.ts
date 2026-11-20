/**
 * 장애별 위젯 가짜 데이터의 "맛". 위젯 키 `k`는 `${incidentId}:${view}`라서
 * 앞부분으로 장애를 찾고, 그 장애의 단서(src/content/incidents.ts)와 어긋나지 않는
 * 서비스·엔드포인트·SQL·로그·노드 이름을 고른다. 모르는 장애는 GENERIC으로 그린다.
 */

export type StepType = 'method' | 'sql' | 'httpc' | 'dbc';
export type Team = { lead: string; sub: string; tool: string };
export type QualityMetric = 'hallucination' | 'faithfulness' | 'toxicity' | 'relevance' | 'PII' | 'prompt_injection';

export type Flavor = {
  /** 로그·트레이스에 찍히는 서비스 이름 */
  service: string;
  trace: {
    endpoint: string;
    texts: Record<StepType, string[]>;
    /** anomaly일 때 경고가 붙는 스텝 */
    slow: { type: StepType; text: string; ms: [number, number] };
  };
  logs: {
    info: string[];
    warn: string[];
    error: string[];
    /** anomaly일 때 반드시 한 줄 끼워 넣는 결정적 로그 (단서) */
    key?: { level: 'WARN' | 'ERROR' | 'INFO'; msg: string };
    query: string;
  };
  locks: {
    db: string;
    /** lock: 락 보유 1 + 대기 N, scan: 풀스캔 세션이 커넥션을 전부 잡음 */
    mode: 'lock' | 'scan';
    holder: string;
    waiting: string[];
    busy: string[];
  };
  topology: {
    app: { abbr: string; label: string };
    db: { abbr: string; label: string };
    ext: { abbr: string; label: string }[];
    /** anomaly일 때 빨갛게 칠할 노드 */
    bad: 'db' | 'ext';
  };
  pods: { apps: string[]; limits: number[] };
  agents: {
    teams: Team[];
    /** 토큰·비용 위젯의 행 이름 */
    usage: string[];
    /** 토큰·비용 anomaly에서 튀는 행. 없으면 무작위 */
    hot?: string;
    /** 없으면 루프(×40) 연출, 있으면 한 갈래가 틀어지는 연출 */
    broken?: { tool: string; toolMeta: string; llm: string; next?: string; end: string };
  };
  /** 응답 품질 anomaly에서 튀는 지표. 없으면 무작위(대개 hallucination) */
  quality?: QualityMetric;
  rum: { pages: string[]; hot: string[]; note?: string };
};

const GENERIC: Flavor = {
  service: 'api-server',
  trace: {
    endpoint: 'POST /api/v1/requests',
    texts: {
      method: ['ApiController.handle()', 'RequestService.process()', 'AuthService.verify()', 'CacheService.get()', 'ResponseMapper.map()'],
      dbc: ['jdbc:mysql://main-db:3306/app', 'jdbc:mysql://main-db-ro:3306/app'],
      sql: [
        'SELECT * FROM item WHERE id = ?',
        'SELECT id, status FROM request WHERE user_id = ?',
        'UPDATE request SET status = ? WHERE id = ?',
        'INSERT INTO audit_log (actor, action) VALUES (?, ?)',
      ],
      httpc: ['GET http://user-api/v1/users/{id}', 'POST http://notify-api/push', 'GET http://config-api/v1/flags'],
    },
    slow: { type: 'httpc', text: 'GET http://user-api/v1/users/{id}', ms: [3200, 8400] },
  },
  logs: {
    info: ['GET /api/v1/items 200 31ms', 'POST /api/v1/requests 200 48ms', 'request handled id=%d', 'cache hit ratio=0.93', 'scheduler tick: idle'],
    warn: ['HikariPool-1 - Connection is not available, request timed out after 3000ms', 'slow request took %dms', 'retrying upstream call (attempt 2/3)'],
    error: ['java.net.SocketTimeoutException: Read timed out', 'upstream 503 Service Unavailable', 'Transaction rolled back id=%d'],
    query: 'level:(ERROR OR WARN)',
  },
  locks: {
    db: 'main-db (MySQL)',
    mode: 'lock',
    holder: 'UPDATE account_balance SET amount = amount - ? WHERE id = ?',
    waiting: ['UPDATE account_balance SET amount = amount + ? WHERE id = ?'],
    busy: [
      'SELECT id, name FROM item WHERE category_id = ?',
      'SELECT COUNT(*) FROM request WHERE created_at > ?',
      'INSERT INTO access_log (uri, ms) VALUES (?, ?)',
      'SELECT * FROM member WHERE email = ?',
    ],
  },
  topology: {
    app: { abbr: 'APP', label: 'core-api' },
    db: { abbr: 'DB', label: 'main-db' },
    ext: [{ abbr: 'EXT', label: '외부 API' }, { abbr: 'AUTH', label: '인증 서버' }],
    bad: 'ext',
  },
  pods: { apps: ['core-api', 'user-api', 'worker'], limits: [512, 768, 1024] },
  agents: {
    teams: [
      { lead: 'cs-supervisor', sub: 'order-agent', tool: 'search_orders' },
      { lead: 'shop-assistant', sub: 'refund-agent', tool: 'get_refund_status' },
      { lead: 'ops-copilot', sub: 'runbook-agent', tool: 'query_metrics' },
    ],
    usage: ['cs-supervisor', 'order-agent', 'refund-agent', 'search-agent', 'summary-agent'],
  },
  rum: { pages: ['/', '/products', '/products/:id', '/cart', '/checkout', '/mypage'], hot: ['/checkout', '/cart', '/products/:id'] },
};

type Patch = { service?: string } & { [K in Exclude<keyof Flavor, 'service' | 'quality'>]?: Partial<Flavor[K]> } & { quality?: QualityMetric };

const CHATBOT_TEAMS: Team[] = [{ lead: 'cs-supervisor', sub: 'policy-agent', tool: 'retrieve_policy' }];

const PATCHES: Record<string, Patch> = {
  'payment-latency': {
    service: 'payment-api',
    trace: {
      endpoint: 'POST /api/order/checkout',
      texts: {
        method: ['OrderController.checkout()', 'OrderService.place()', 'CouponService.apply()', 'CartService.load()', 'PaymentFacade.approve()'],
        dbc: ['jdbc:mysql://order-db:3306/shop', 'jdbc:mysql://order-db-ro:3306/shop'],
        sql: [
          'SELECT * FROM cart_item WHERE user_id = ?',
          'SELECT price, stock FROM product WHERE id IN (?)',
          'UPDATE inventory SET qty = qty - ? WHERE sku = ?',
          'INSERT INTO orders (user_id, amount) VALUES (?, ?)',
        ],
        httpc: ['POST https://pg-gateway/v1/approve', 'GET http://coupon-api/v2/coupons/{id}', 'POST http://notify-api/push'],
      },
      slow: { type: 'httpc', text: 'POST https://pg-gateway/v1/approve', ms: [3700, 3900] },
    },
    logs: {
      info: ['GET /api/products 200 34ms', 'POST /api/cart 200 51ms', 'order created orderId=%d', 'GET /api/order/%d 200 22ms'],
      warn: ['slow request POST /api/order/checkout took %dms', 'retrying pg-gateway call (attempt 2/3)'],
      error: ['PaymentException: pg-gateway read timeout (5000ms)', 'java.net.SocketTimeoutException: Read timed out', 'Transaction rolled back orderId=%d'],
      query: 'service:payment-api AND level:(ERROR OR WARN)',
    },
    locks: { db: 'order-db (MySQL)', holder: 'UPDATE inventory SET qty = qty - 1 WHERE sku = ?', waiting: ['UPDATE inventory SET qty = qty - ? WHERE sku = ?'] },
    topology: {
      app: { abbr: 'PAY', label: 'payment-api' },
      db: { abbr: 'DB', label: 'order-db' },
      ext: [{ abbr: 'PG', label: '외부 PG' }],
      bad: 'ext',
    },
    pods: { apps: ['payment-api', 'order-api'] },
  },

  'db-lock': {
    service: 'order-api',
    trace: {
      endpoint: 'GET /api/orders',
      texts: {
        method: ['OrderController.list()', 'OrderQueryService.find()', 'MemberService.load()', 'OrderMapper.toDto()'],
        dbc: ['jdbc:mysql://order-db:3306/shop'],
        sql: [
          'SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 20',
          'SELECT * FROM order_item WHERE order_id IN (?)',
          'SELECT grade FROM member WHERE id = ?',
        ],
        httpc: ['GET http://member-api/v1/members/{id}', 'GET http://delivery-api/v1/status'],
      },
      slow: { type: 'sql', text: 'UPDATE orders SET status = ? WHERE id = ? -- lock wait', ms: [27800, 28400] },
    },
    logs: {
      info: ['GET /api/orders 200 41ms', 'settlement-batch: chunk 12/80 committed', 'GET /api/order/%d 200 25ms', 'scheduler tick: settlement-batch running'],
      warn: ['HikariPool-1 - Connection is not available, request timed out after 3000ms', 'slow request GET /api/orders took %dms', 'Lock wait on table orders (%dms)'],
      error: ['Lock wait timeout exceeded; try restarting transaction', 'Transaction rolled back orderId=%d'],
      key: { level: 'WARN', msg: 'settlement-batch schedule changed: cron "0 0 3 * * *" → "0 0 9 * * *" (deploy #482)' },
      query: 'settlement-batch OR "Lock wait"',
    },
    locks: {
      db: 'order-db (MySQL)',
      mode: 'lock',
      holder: "UPDATE orders SET settle_status = 'DONE' WHERE settle_date = ? /* settlement-batch */",
      waiting: ['UPDATE orders SET status = ? WHERE id = ?', 'SELECT * FROM orders WHERE id = ? FOR UPDATE'],
    },
    topology: {
      app: { abbr: 'ORD', label: 'order-api' },
      db: { abbr: 'DB', label: 'order-db' },
      ext: [{ abbr: 'BAT', label: 'settlement-batch' }],
      bad: 'db',
    },
    pods: { apps: ['order-api', 'settlement-batch'] },
  },

  'oom-kill': {
    service: 'order-api',
    trace: {
      endpoint: 'GET /api/admin/orders/export.xlsx',
      texts: {
        method: ['AdminOrderController.export()', 'OrderExportService.collect()', 'AuthService.verify()', 'ExcelWriter.flush()'],
        dbc: ['jdbc:mysql://order-db-ro:3306/shop'],
        sql: ['SELECT * FROM orders WHERE created_at BETWEEN ? AND ?', 'SELECT * FROM order_item WHERE order_id IN (?)'],
        httpc: ['GET http://member-api/v1/members/bulk', 'PUT http://file-store/exports/{id}'],
      },
      slow: { type: 'method', text: 'ExcelExportService.writeAll() — rows=1,240,000 · heap +410Mi', ms: [6200, 8800] },
    },
    logs: {
      info: ['GET /api/orders 200 38ms', 'export requested user=admin%d', 'Started OrderApiApplication in 7.4 seconds', 'GET /actuator/health 200 3ms'],
      warn: ['GC overhead: old gen 97% after full GC', 'slow request GET /api/admin/orders/export.xlsx took %dms'],
      error: ['java.lang.OutOfMemoryError: Java heap space', 'Container killed: OOMKilled (exit 137)'],
      key: { level: 'INFO', msg: 'deploy order-api v2.31.0 rolled out (excel export: in-memory workbook)' },
      query: 'OutOfMemoryError OR OOMKilled',
    },
    topology: { app: { abbr: 'ORD', label: 'order-api' }, db: { abbr: 'DB', label: 'order-db' }, ext: [{ abbr: 'FILE', label: 'file-store' }] },
    pods: { apps: ['order-api'], limits: [512] },
  },

  'token-bomb': {
    service: 'agent-gateway',
    trace: {
      endpoint: 'POST /v1/agent/run',
      texts: {
        method: ['AgentRunner.run()', 'Planner.next()', 'ToolRouter.dispatch()', 'ResultMerger.merge()'],
        dbc: ['postgresql://agent-db:5432/agent'],
        sql: ['SELECT * FROM conversation WHERE id = ?', 'INSERT INTO agent_step (run_id, kind) VALUES (?, ?)'],
        httpc: ['POST https://llm-api/v1/chat/completions', 'GET http://search-api/v1/search?q={q}'],
      },
      slow: { type: 'httpc', text: 'GET http://search-api/v1/search?q={q} — 40번째 재시도', ms: [3200, 5200] },
    },
    logs: {
      info: ['run completed agent=summary-agent steps=6', 'POST /v1/agent/run 200 4.1s', 'tool web_search returned 8 results', 'run started id=%d'],
      warn: ['tool web_search returned empty result → retry (policy: always)', 'run %d exceeded 100 steps'],
      error: ['TokenLimitExceeded: run %d used 412,330 tokens', 'run aborted: max_tokens budget'],
      key: { level: 'WARN', msg: 'search-agent prompt: "도구 응답이 비면 결과가 나올 때까지 다시 호출하라"' },
      query: 'agent:search-agent AND retry',
    },
    topology: { app: { abbr: 'AGT', label: 'agent-gateway' }, db: { abbr: 'DB', label: 'agent-db' }, ext: [{ abbr: 'LLM', label: 'LLM API' }] },
    pods: { apps: ['agent-gateway', 'search-agent'] },
    agents: {
      teams: [{ lead: 'cs-supervisor', sub: 'search-agent', tool: 'web_search' }],
      usage: ['cs-supervisor', 'order-agent', 'refund-agent', 'search-agent', 'summary-agent'],
      hot: 'search-agent',
    },
    quality: 'relevance',
  },

  hallucination: {
    service: 'chatbot-api',
    trace: {
      endpoint: 'POST /v1/chat',
      texts: {
        method: ['ChatController.reply()', 'RagPipeline.run()', 'PromptBuilder.build()', 'AnswerGuard.check()'],
        dbc: ['postgresql://chat-db:5432/chat'],
        sql: ['SELECT * FROM conversation WHERE id = ?', 'INSERT INTO message (conv_id, role, body) VALUES (?, ?, ?)'],
        httpc: ['POST https://llm-api/v1/chat/completions', 'POST http://embedding-api/v1/embed'],
      },
      slow: { type: 'httpc', text: 'POST http://vector-db:6333/collections/refund-policy/points/search — timeout, 빈 컨텍스트로 진행', ms: [5000, 5020] },
    },
    logs: {
      info: ['POST /v1/chat 200 2.8s', 'retrieved 5 chunks collection=refund-policy', 'conversation started id=%d'],
      warn: ['vector-db search timeout (5000ms) → context=[]', 'answer generated with empty context conv=%d'],
      error: ['QdrantTimeoutError: deadline exceeded', 'guardrail skipped: no context to verify conv=%d'],
      query: 'context=[] OR vector-db',
    },
    topology: {
      app: { abbr: 'BOT', label: 'chatbot-api' },
      db: { abbr: 'VEC', label: 'vector-db' },
      ext: [{ abbr: 'LLM', label: 'LLM API' }],
      bad: 'db',
    },
    pods: { apps: ['chatbot-api', 'vector-db'] },
    agents: {
      teams: CHATBOT_TEAMS,
      usage: ['cs-supervisor', 'policy-agent', 'order-agent', 'refund-agent', 'summary-agent'],
      broken: { tool: 'retrieve_policy()', toolMeta: '0 docs', llm: 'LLM · 컨텍스트 없이 답변', end: '근거 없는 답변 전송' },
    },
    quality: 'hallucination',
    rum: { pages: ['/', '/chat', '/faq', '/orders', '/refund', '/mypage'], hot: ['/chat'] },
  },

  'frontend-js-error': {
    service: 'web-frontend',
    trace: {
      endpoint: 'POST /api/payment/approve',
      texts: {
        method: ['PaymentController.approve()', 'PaymentService.request()', 'OrderService.load()'],
        dbc: ['jdbc:mysql://order-db:3306/shop'],
        sql: ['SELECT * FROM orders WHERE id = ?', 'UPDATE orders SET status = ? WHERE id = ?'],
        httpc: ['POST https://pg-gateway/v1/approve', 'POST http://notify-api/push'],
      },
      slow: { type: 'method', text: 'PaymentController.approve() — 유입 급감: 최근 10분 3건 (평소 1,200건)', ms: [2, 9] },
    },
    logs: {
      info: ['GET /checkout 200 12ms', 'GET /static/js/main.%d.js 200 4ms', 'POST /api/cart 200 46ms'],
      warn: ['RUM: TypeError spike on /checkout (Samsung Internet 14, iOS Safari 13)', 'payment approve requests dropped -97%'],
      error: ["TypeError: undefined is not a function (evaluating 'items.at(-1)')", 'Uncaught SyntaxError: Unexpected token "?."'],
      key: { level: 'INFO', msg: 'web-frontend deploy: main.8f3a1c.js released (browserslist: "last 1 chrome version")' },
      query: 'service:web-frontend deploy OR TypeError',
    },
    topology: { app: { abbr: 'WEB', label: 'web-frontend' }, db: { abbr: 'API', label: 'payment-api' }, ext: [{ abbr: 'CDN', label: 'CDN' }] },
    pods: { apps: ['web-frontend', 'payment-api'] },
    rum: { pages: ['/', '/products', '/products/:id', '/cart', '/checkout', '/mypage'], hot: ['/checkout'], note: 'Samsung Internet 14 · iOS Safari 13' },
  },

  'gpu-oom': {
    service: 'inference-api',
    trace: {
      endpoint: 'POST /v1/generate',
      texts: {
        method: ['InferenceController.generate()', 'Tokenizer.encode()', 'BatchScheduler.enqueue()', 'Detokenizer.decode()'],
        dbc: ['redis://kv-meta:6379'],
        sql: ['GET session:{id}', 'SET session:{id}'],
        httpc: ['POST http://vllm-0:8000/v1/completions', 'POST http://vllm-1:8000/v1/completions'],
      },
      slow: { type: 'httpc', text: 'POST http://vllm-1:8000/v1/completions — 500 CUDA out of memory', ms: [3200, 6400] },
    },
    logs: {
      info: ['POST /v1/generate 200 1.9s', 'batch size=8 prompt_tokens=%d', 'model loaded: llama-70b-awq'],
      warn: ['KV cache usage 98.7%, preempting requests', 'avg context length %d tokens (+300% wow)'],
      error: ['torch.cuda.OutOfMemoryError: CUDA out of memory. Tried to allocate 2.00 GiB', 'POST /v1/generate 500'],
      query: 'CUDA OR "KV cache"',
    },
    locks: { db: 'demo-db (PostgreSQL)' },
    topology: { app: { abbr: 'INF', label: 'inference-api' }, db: { abbr: 'GPU', label: 'vllm (gpu-node-01)' }, ext: [{ abbr: 'S3', label: 'model-store' }], bad: 'db' },
    pods: { apps: ['vllm-server'], limits: [24576] },
    agents: {
      teams: [{ lead: 'demo-assistant', sub: 'rag-agent', tool: 'search_docs' }],
      usage: ['chat', 'summarize', 'rag-search', 'demo-bot', 'eval'],
      hot: 'rag-search',
    },
  },

  'slow-query': {
    service: 'history-api',
    trace: {
      endpoint: 'GET /api/history',
      texts: {
        method: ['HistoryController.list()', 'HistoryService.search()', 'MemberService.load()', 'HistoryMapper.toDto()'],
        dbc: ['jdbc:mysql://history-db:3306/ledger'],
        sql: ['SELECT grade FROM member WHERE id = ?', 'SELECT COUNT(*) FROM transaction_history WHERE member_id = ?'],
        httpc: ['GET http://member-api/v1/members/{id}', 'GET http://config-api/v1/flags'],
      },
      slow: {
        type: 'sql',
        text: 'SELECT * FROM transaction_history WHERE member_id = ? AND created_at BETWEEN ? AND ? ORDER BY created_at DESC',
        ms: [26000, 29000],
      },
    },
    logs: {
      info: ['GET /api/history 200 28.4s', 'flyway: schema up to date', 'GET /api/member/%d 200 19ms'],
      warn: ['slow query (28,112ms): SELECT * FROM transaction_history ...', 'HikariPool-1 - Connection is not available, request timed out after 30000ms'],
      error: ['Query execution was interrupted, maximum statement execution time exceeded', 'GET /api/history 504'],
      key: { level: 'INFO', msg: 'flyway: V2026_11_16__history_partition.sql applied (DROP INDEX idx_history_member_created)' },
      query: 'flyway OR "slow query"',
    },
    locks: {
      db: 'history-db (MySQL)',
      mode: 'scan',
      holder: 'SELECT * FROM transaction_history WHERE member_id = ? AND created_at BETWEEN ? AND ? -- type=ALL',
      waiting: [],
    },
    topology: { app: { abbr: 'HIS', label: 'history-api' }, db: { abbr: 'DB', label: 'history-db' }, ext: [{ abbr: 'MEM', label: 'member-api' }], bad: 'db' },
    pods: { apps: ['history-api'] },
  },

  'prompt-injection': {
    service: 'chatbot-api',
    trace: {
      endpoint: 'POST /v1/chat',
      texts: {
        method: ['ChatController.reply()', 'AgentRunner.run()', 'UploadReader.extract()', 'AnswerGuard.check()'],
        dbc: ['postgresql://chat-db:5432/chat'],
        sql: ['SELECT * FROM conversation WHERE id = ?', 'INSERT INTO message (conv_id, role, body) VALUES (?, ?, ?)'],
        httpc: ['POST https://llm-api/v1/chat/completions', 'GET http://upload-store/files/{id}.pdf'],
      },
      slow: { type: 'httpc', text: 'POST http://admin-api/v1/config/export — 챗봇 세션에서 관리자 도구 호출', ms: [1800, 2600] },
    },
    logs: {
      info: ['POST /v1/chat 200 3.1s', 'upload received file=%d.pdf', 'conversation started id=%d'],
      warn: ['upload contains instruction-like text: "이전 지시를 모두 무시하라"', 'tool admin_export_config called from chat session %d'],
      error: ['policy violation: system prompt disclosed conv=%d', 'guardrail: prompt_injection score 0.91'],
      key: { level: 'WARN', msg: 'pattern "이전 지시를 모두 무시하라" found in 12 uploads since last week' },
      query: '"이전 지시를 모두 무시하라"',
    },
    topology: { app: { abbr: 'BOT', label: 'chatbot-api' }, db: { abbr: 'ADM', label: 'admin-api' }, ext: [{ abbr: 'LLM', label: 'LLM API' }], bad: 'db' },
    pods: { apps: ['chatbot-api'] },
    agents: {
      teams: [{ lead: 'cs-supervisor', sub: 'doc-agent', tool: 'read_upload' }],
      usage: ['cs-supervisor', 'doc-agent', 'order-agent', 'refund-agent', 'summary-agent'],
      broken: {
        tool: 'read_upload(pdf)',
        toolMeta: '"이전 지시를 모두 무시하라"',
        llm: 'LLM · 문서 속 지시를 따름',
        next: 'admin_export_config()',
        end: '시스템 프롬프트 노출',
      },
    },
    quality: 'prompt_injection',
    rum: { pages: ['/', '/chat', '/faq', '/orders', '/refund', '/mypage'], hot: ['/chat'] },
  },
};

function merge(p: Patch): Flavor {
  return {
    service: p.service ?? GENERIC.service,
    trace: { ...GENERIC.trace, ...p.trace },
    logs: { ...GENERIC.logs, ...p.logs },
    locks: { ...GENERIC.locks, ...p.locks },
    topology: { ...GENERIC.topology, ...p.topology },
    pods: { ...GENERIC.pods, ...p.pods },
    agents: { ...GENERIC.agents, ...p.agents },
    quality: p.quality,
    rum: { ...GENERIC.rum, ...p.rum },
  };
}

const FLAVORS: Record<string, Flavor> = Object.fromEntries(Object.entries(PATCHES).map(([id, p]) => [id, merge(p)]));

/** 위젯 키 `${incidentId}:${view}`에서 장애 id */
export const incidentOf = (k: string): string => k.split(':')[0];

/** 키에 맞는 장애 flavor. 모르는 장애면 GENERIC */
export function flavorOf(k: string): Flavor {
  return FLAVORS[incidentOf(k)] ?? GENERIC;
}

export const FLAVOR_IDS = Object.keys(PATCHES);
