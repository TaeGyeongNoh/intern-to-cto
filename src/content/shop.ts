import { shopFlag } from '../engine/shop';
import type { ShopItem } from '../engine/types';

/**
 * 연말 상점. 가격은 만원 단위, 저축은 연봉의 25%라 10년차쯤 한 해 2천만원 남짓 모인다.
 * once(기본 true) 물건은 한 번 사면 다시 나오지 않는다.
 */
export const SHOP_ITEMS: ShopItem[] = [
  // 장비
  { id: 'keyboard', name: '기계식 키보드', category: 'gear', price: 30, text: '타건감이 좋아지면 코드도 좋아진다는 믿음. 옆자리 동료의 믿음은 다르다.', effects: { stats: { impl: 1 } } },
  { id: 'dual-monitor', name: '듀얼 모니터', category: 'gear', price: 80, text: '왼쪽엔 대시보드, 오른쪽엔 코드. 이제 슬랙은 어디에 띄우지?', effects: { stats: { debug: 1, design: 1 } } },
  { id: 'chair', name: '허먼밀러급 의자', category: 'gear', price: 250, text: '허리가 먼저 시니어가 됐다. 의자라도 프린시펄급으로.', effects: { burnout: -4, stats: { mental: 1 } } },

  // 자기계발
  { id: 'cloud-cert', name: '클라우드 자격증', category: 'growth', price: 150, text: '시험 범위의 절반은 처음 보는 서비스 이름이다.', effects: { stats: { infra: 3 } } },
  { id: 'conference', name: '해외 컨퍼런스', category: 'growth', price: 400, when: { minCareerYear: 2 }, text: '세션보다 복도에서 더 많이 배운다. 굿즈는 덤.', effects: { reputation: 1, stats: { ai: 1, design: 1 } } },
  { id: 'ai-course', name: 'AI 에이전트 실전 과정', category: 'growth', price: 600, when: { minCalendarYear: 2027 }, text: '주말 8주. 수료 프로젝트는 "회의록 써 주는 에이전트".', effects: { stats: { ai: 4 }, burnout: 3 } },
  { id: 'grad-school', name: '야간 대학원', category: 'growth', price: 3000, when: { minCareerYear: 3 }, text: '퇴근하고 논문, 주말엔 과제. 학위는 남고 저녁은 사라진다.', effects: { stats: { design: 4, ai: 2 }, reputation: 3, burnout: 12, story: '야간 대학원을 마쳤다. 졸업 논문 주제는 "장애 대응 시간 단축에 관한 연구".' } },

  // 휴식
  { id: 'cat', name: '반려묘 입양', category: 'rest', price: 300, text: '온콜 알람보다 먼저 깨우는 존재가 생겼다. 키보드 위 지분도 생겼다.', effects: { burnout: -6, stats: { mental: 1 }, story: '고양이를 입양했다. 커밋 메시지에 가끔 "ㅁㄴㅇㄹ"가 섞인다.' } },
  { id: 'sabbatical', name: '안식 휴가 한 달', category: 'rest', price: 1500, when: { minBurnout: 50 }, text: '노트북은 두고 간다. 정말이다. 아마도.', effects: { burnout: -20, reputation: -2 } },
  { id: 'jeju', name: '제주 한 달 살기', category: 'rest', price: 2000, when: { minBurnout: 40 }, text: '귤밭 옆 작업실. 슬랙 알림은 끄고, 파도 소리는 켠다.', effects: { burnout: -25, stats: { mental: 1 }, story: '제주에서 한 달을 살았다. 퇴사는 하지 않았다.' } },

  // 인생
  { id: 'ev', name: '전기차', category: 'life', price: 5000, when: { minCareerYear: 4 }, text: '출근길이 조용해졌다. 충전 앱 알림이 온콜 알림보다 많다.', effects: { story: '전기차를 샀다. 첫 주행은 회사 지하 충전소까지.' } },
  { id: 'jeonse', name: '전세 계약', category: 'life', price: 15000, when: { minCareerYear: 5 }, text: '등기부등본을 읽는 법을 배웠다. 장애 리포트보다 어렵다.', effects: { story: '전셋집을 얻었다. 집주인 문자에는 아직도 심장이 뛴다.' } },
  { id: 'house', name: '내 집 마련', category: 'life', price: 40000, when: { flags: [shopFlag('jeonse')] }, text: '대출 30년. 이제 진짜 은퇴할 수 없다. 그래도 벽에 못은 마음대로 박는다.', effects: { burnout: -5, stats: { mental: 2 }, story: '내 집을 마련했다. 서버실보다 조용한 방이 생겼다.' } },

  // 투자
  { id: 'coin', name: '코인', category: 'invest', price: 1000, once: false, gamble: { chance: 0.35, win: 3, lose: 0.15 }, text: '백서를 읽었다. 이해는 못 했다. 차트는 어제와 같은 모양이다.', effects: { burnout: 3 } },
  { id: 'dev-stock', name: '개발자 주식', category: 'invest', price: 3000, once: false, when: { minCareerYear: 3 }, gamble: { chance: 0.55, win: 1.7, lose: 0.6 }, text: '"내가 매일 쓰는 툴을 만드는 회사"라는 논리로 샀다.', effects: {} },
];
