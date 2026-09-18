/**
 * 统一存储层
 *
 * - 线上（Vercel）：检测到 KV 环境变量时，自动使用 Vercel KV / Upstash Redis
 * - 本地开发：未配置 KV 环境变量时，自动降级为本地 JSON 文件（.data/store.json）
 *
 * 这样本地 `npm run dev` 零配置即可跑通，部署到 Vercel 后无需改一行代码。
 */

import { promises as fs } from "fs";
import path from "path";

const KV_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const KV_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

/** 是否使用远端 KV（线上模式） */
export const useRemoteKV = Boolean(KV_URL && KV_TOKEN);

/* ------------------------------------------------------------------ */
/* 远端 KV：动态导入，避免本地无环境变量时在 import 阶段直接抛错          */
/* ------------------------------------------------------------------ */

interface KVLike {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  lpush(key: string, ...values: string[]): Promise<number>;
  lrange<T = string>(key: string, start: number, stop: number): Promise<T[]>;
}

let clientPromise: Promise<KVLike> | null = null;

function getRemoteClient(): Promise<KVLike> {
  if (!clientPromise) {
    clientPromise = import("@vercel/kv").then(
      (mod) => mod.kv as unknown as KVLike
    );
  }
  return clientPromise;
}

/* ------------------------------------------------------------------ */
/* 本地文件兜底                                                          */
/* ------------------------------------------------------------------ */

interface LocalStore {
  lists: Record<string, string[]>;
  values: Record<string, unknown>;
}

const LOCAL_DIR = path.join(process.cwd(), ".data");
const LOCAL_FILE = path.join(LOCAL_DIR, "store.json");

let cache: LocalStore | null = null;

async function loadLocal(): Promise<LocalStore> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<LocalStore>;
    cache = {
      lists: parsed.lists ?? {},
      values: parsed.values ?? {},
    };
  } catch {
    cache = { lists: {}, values: {} };
  }
  return cache;
}

async function saveLocal(store: LocalStore): Promise<void> {
  cache = store;
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(store, null, 2), "utf-8");
}

/* ------------------------------------------------------------------ */
/* 对外统一 API                                                          */
/* ------------------------------------------------------------------ */

export async function kvGet<T>(key: string): Promise<T | null> {
  if (useRemoteKV) {
    const client = await getRemoteClient();
    return client.get<T>(key);
  }
  const store = await loadLocal();
  return (store.values[key] as T) ?? null;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  if (useRemoteKV) {
    const client = await getRemoteClient();
    await client.set(key, value);
    return;
  }
  const store = await loadLocal();
  store.values[key] = value;
  await saveLocal(store);
}

export async function kvDel(key: string): Promise<void> {
  if (useRemoteKV) {
    const client = await getRemoteClient();
    await client.del(key);
    return;
  }
  const store = await loadLocal();
  delete store.values[key];
  delete store.lists[key];
  await saveLocal(store);
}

/** 前插一个元素（语义与 Redis LPUSH 一致：后写入的排在前面） */
export async function kvLpush(key: string, value: string): Promise<void> {
  if (useRemoteKV) {
    const client = await getRemoteClient();
    await client.lpush(key, value);
    return;
  }
  const store = await loadLocal();
  if (!store.lists[key]) store.lists[key] = [];
  store.lists[key].unshift(value);
  await saveLocal(store);
}

/** 读取整个列表（语义与 Redis LRANGE key 0 -1 一致） */
export async function kvLrange(key: string): Promise<string[]> {
  if (useRemoteKV) {
    const client = await getRemoteClient();
    const res = await client.lrange<string>(key, 0, -1);
    if (!res) return [];
    return res.map((item) =>
      typeof item === "string" ? item : JSON.stringify(item)
    );
  }
  const store = await loadLocal();
  return store.lists[key] ? [...store.lists[key]] : [];
}
