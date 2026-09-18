/**
 * 业务数据访问层
 *
 * 存储结构（列表只存 ID，实体单独存，避免快照过期）：
 *   live_codes          -> [codeId, ...]
 *   live_code:<codeId>  -> LiveCode
 *   targets:<codeId>    -> [targetId, ...]
 *   target:<targetId>   -> Target
 */

import { kvGet, kvSet, kvDel, kvLpush, kvLrange } from "./store";
import { delBlob } from "./blob";
import type { LiveCode, Target } from "./types";

/* ------------------------------ 列表工具 ------------------------------ */

/** 重写整个列表：LPUSH 是前插，所以要倒序写入，保证读出顺序不变 */
async function writeList(key: string, items: string[]): Promise<void> {
  await kvDel(key);
  for (const item of [...items].reverse()) {
    await kvLpush(key, item);
  }
}

async function removeFromList(key: string, value: string): Promise<void> {
  const items = await kvLrange(key);
  await writeList(
    key,
    items.filter((item) => item !== value)
  );
}

/* ------------------------------ 活码 ------------------------------ */

export async function listLiveCodes(): Promise<LiveCode[]> {
  const ids = await kvLrange("live_codes");
  const codes: LiveCode[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const code = await kvGet<LiveCode>(`live_code:${id}`);
    if (code) codes.push(code);
  }
  return codes;
}

export async function getLiveCode(id: string): Promise<LiveCode | null> {
  return kvGet<LiveCode>(`live_code:${id}`);
}

export async function findLiveCodeByName(
  name: string,
  excludeId?: string
): Promise<LiveCode | null> {
  const codes = await listLiveCodes();
  const target = name.trim();
  return (
    codes.find((c) => c.name.trim() === target && c.id !== excludeId) ?? null
  );
}

export async function createLiveCode(code: LiveCode): Promise<void> {
  await kvSet(`live_code:${code.id}`, code);
  await kvLpush("live_codes", code.id);
}

export async function updateLiveCode(code: LiveCode): Promise<void> {
  await kvSet(`live_code:${code.id}`, code);
}

export async function deleteLiveCode(id: string): Promise<void> {
  const targets = await listTargets(id);
  for (const target of targets) {
    if (target.image) await delBlob(target.image);
    await kvDel(`target:${target.id}`);
  }
  await kvDel(`targets:${id}`);
  await kvDel(`live_code:${id}`);
  await removeFromList("live_codes", id);
}

/* ------------------------------ 目标 ------------------------------ */

export async function listTargets(codeId: string): Promise<Target[]> {
  const ids = await kvLrange(`targets:${codeId}`);
  const targets: Target[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const target = await kvGet<Target>(`target:${id}`);
    if (target) targets.push(target);
  }
  return targets;
}

export async function getTarget(targetId: string): Promise<Target | null> {
  return kvGet<Target>(`target:${targetId}`);
}

export async function addTarget(target: Target): Promise<void> {
  await kvSet(`target:${target.id}`, target);
  await kvLpush(`targets:${target.live_code_id}`, target.id);
}

export async function updateTarget(target: Target): Promise<void> {
  await kvSet(`target:${target.id}`, target);
}

export async function deleteTarget(
  codeId: string,
  targetId: string
): Promise<void> {
  const target = await getTarget(targetId);
  if (target?.image) await delBlob(target.image);
  await kvDel(`target:${targetId}`);
  await removeFromList(`targets:${codeId}`, targetId);
}

/** 把某个目标设为当前活跃目标（其余全部置为不活跃） */
export async function activateTarget(
  codeId: string,
  targetId: string
): Promise<void> {
  const targets = await listTargets(codeId);
  for (const target of targets) {
    const next = target.id === targetId ? 1 : 0;
    if (target.is_active !== next) {
      target.is_active = next;
      await kvSet(`target:${target.id}`, target);
    }
  }
}

/** 取当前活跃目标；若没有标记活跃则退回第一个 */
export async function getActiveTarget(
  codeId: string
): Promise<Target | null> {
  const targets = await listTargets(codeId);
  if (targets.length === 0) return null;
  return targets.find((t) => t.is_active === 1) ?? targets[0];
}
