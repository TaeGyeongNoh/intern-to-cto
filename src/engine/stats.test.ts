import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from '../content/archetypes';
import { CONTENT } from '../content';
import { generateCandidates, ovr, POSITION_WEIGHTS, START_OVR, START_SUM } from './stats';
import { STAT_IDS, type PositionId } from './types';

const positions: PositionId[] = ['backend', 'frontend', 'sre', 'ai'];
const sum = (s: Record<string, number>) => Object.values(s).reduce((a, b) => a + b, 0);
const archs = CONTENT.archetypes;

describe('stats', () => {
  it('포지션 가중치 합은 1', () => {
    for (const p of positions) expect(sum(POSITION_WEIGHTS[p])).toBeCloseTo(1, 10);
  });
  it('ovr은 가중평균 반올림', () => {
    const flat = Object.fromEntries(STAT_IDS.map((id) => [id, 50])) as never;
    expect(ovr(flat, 'backend')).toBe(50);
  });
  it('후보 3명은 모두 OVR 45, 합 240, 능력치 20~75', () => {
    for (const p of positions) {
      for (let seed = 1; seed <= 300; seed++) {
        const cs = generateCandidates(p, seed, archs);
        expect(cs).toHaveLength(3);
        for (const { stats } of cs) {
          expect(sum(stats)).toBe(START_SUM);
          expect(ovr(stats, p)).toBe(START_OVR);
          for (const id of STAT_IDS) {
            expect(stats[id]).toBeGreaterThanOrEqual(20);
            expect(stats[id]).toBeLessThanOrEqual(75);
          }
        }
      }
    }
  });
  it('같은 시드면 같은 후보', () => {
    expect(generateCandidates('sre', 11, archs)).toEqual(generateCandidates('sre', 11, archs));
  });
  it('세 후보는 서로 다른, 그 포지션에 맞는 유형이다', () => {
    for (const p of positions) {
      for (let seed = 1; seed <= 300; seed++) {
        const ids = generateCandidates(p, seed, archs).map((c) => c.archetypeId);
        expect(new Set(ids).size).toBe(3);
        for (const id of ids) expect(archs[id].positions).toContain(p);
      }
    }
  });
  it('유형 모양을 지킨다: 강점이 가장 높고 약점이 가장 낮으며, 최고-최저 30 이상', () => {
    for (const p of positions) {
      for (let seed = 1; seed <= 300; seed++) {
        for (const { archetypeId, stats } of generateCandidates(p, seed, archs)) {
          const a = archs[archetypeId];
          const others = STAT_IDS.filter((id) => !a.spikes.includes(id));
          const notDumps = STAT_IDS.filter((id) => !a.dumps.includes(id));
          for (const sp of a.spikes) {
            expect(stats[sp]).toBeGreaterThanOrEqual(60);
            for (const o of others) expect(stats[sp]).toBeGreaterThan(stats[o]);
          }
          for (const d of a.dumps) {
            expect(stats[d]).toBeLessThanOrEqual(28);
            for (const o of notDumps) expect(stats[d]).toBeLessThan(stats[o]);
          }
          const vals = Object.values(stats);
          expect(Math.max(...vals) - Math.min(...vals)).toBeGreaterThanOrEqual(30);
        }
      }
    }
  });
  it('다시 뽑으면 유형 조합이나 수치가 달라진다', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) seen.add(JSON.stringify(generateCandidates('backend', seed, archs)));
    expect(seen.size).toBe(20);
  });
  it('모든 유형이 어떤 시드에서든 등장한다', () => {
    const seen = new Set<string>();
    for (const p of positions) for (let seed = 1; seed <= 100; seed++) for (const c of generateCandidates(p, seed, archs)) seen.add(c.archetypeId);
    expect([...seen].sort()).toEqual(ARCHETYPES.map((a) => a.id).sort());
  });
});
