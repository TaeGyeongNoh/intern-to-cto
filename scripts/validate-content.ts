import { CONTENT } from '../src/content';
import { validateContent } from '../src/engine/validate';

const errs = validateContent(CONTENT);
if (errs.length > 0) {
  console.error(`콘텐츠 오류 ${errs.length}건`);
  for (const e of errs) console.error(` - ${e}`);
  process.exit(1);
}
console.log(`콘텐츠 OK — 이벤트 ${Object.keys(CONTENT.events).length}, 장애 ${Object.keys(CONTENT.incidents).length}, 회사 ${Object.keys(CONTENT.companies).length}, 엔딩 ${CONTENT.endings.length}, 상점 ${Object.keys(CONTENT.shop).length}`);
