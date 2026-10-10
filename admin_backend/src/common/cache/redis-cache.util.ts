import { instanceToPlain } from 'class-transformer';
import { RedisService } from '../../redis/redis.service';

const REMEMBER_LIST_KEY = `
local raw = redis.call('GET', KEYS[1])
local list = {}
if raw and raw ~= '' then
  local ok, decoded = pcall(cjson.decode, raw)
  if ok and type(decoded) == 'table' then
    list = decoded
  end
end
for i = 1, #list do
  if list[i] == ARGV[1] then
    return 0
  end
end
list[#list + 1] = ARGV[1]
redis.call('SET', KEYS[1], cjson.encode(list), 'EX', tonumber(ARGV[2]))
return 1
`;

export async function getCache<T>(
  redis: RedisService,
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  const cached = await readCached<T>(redis, key);

  if (cached) {
    return cached;
  }

  const value = await load();
  await writeCached(redis, key, value, ttlSeconds);
  return value;
}

export async function getCacheList<T>(
  redis: RedisService,
  listKeysKey: string,
  ttlSeconds: number,
  listKey: string,
  load: () => Promise<T>,
): Promise<T> {
  const client = redis.getClient();

  if (!client) {
    return load();
  }

  try {
    const results = await client
      .pipeline()
      .get(listKey)
      .get(listKeysKey)
      .exec();
    const pageRaw = pipelineValue(results?.[0]);
    const indexRaw = pipelineValue(results?.[1]);

    if (pageRaw) {
      const page = parseJson<T>(pageRaw);

      if (page.ok) {
        if (!readKeyList(indexRaw).includes(listKey)) {
          await rememberListKey(redis, listKeysKey, listKey, ttlSeconds);
        }

        return page.value;
      }
    }
  } catch {
    return readListAfterFailure(redis, listKeysKey, ttlSeconds, listKey, load);
  }

  const value = await load();
  await writeCached(redis, listKey, value, ttlSeconds);
  await rememberListKey(redis, listKeysKey, listKey, ttlSeconds);
  return value;
}

async function readListAfterFailure<T>(
  redis: RedisService,
  listKeysKey: string,
  ttlSeconds: number,
  listKey: string,
  load: () => Promise<T>,
): Promise<T> {
  const value = await getCache(redis, listKey, ttlSeconds, load);
  await rememberListKey(redis, listKeysKey, listKey, ttlSeconds);
  return value;
}

export async function clearCached(
  redis: RedisService,
  listKeysKey: string,
  ...itemKeys: string[]
): Promise<void> {
  try {
    const raw = await redis.get(listKeysKey);
    const legacyVersionKey = listKeysKey.endsWith(':keys')
      ? `${listKeysKey.slice(0, -'keys'.length)}version`
      : null;

    await redis.delete(
      ...readKeyList(raw),
      listKeysKey,
      ...(legacyVersionKey ? [legacyVersionKey] : []),
      ...itemKeys,
    );
  } catch {
    return;
  }
}

async function rememberListKey(
  redis: RedisService,
  listKeysKey: string,
  listKey: string,
  ttlSeconds: number,
): Promise<void> {
  const client = redis.getClient();

  if (!client) {
    return;
  }

  try {
    await client.eval(
      REMEMBER_LIST_KEY,
      1,
      listKeysKey,
      listKey,
      String(ttlSeconds),
    );
  } catch {
    await rememberListKeyFallback(redis, listKeysKey, listKey, ttlSeconds);
  }
}

async function rememberListKeyFallback(
  redis: RedisService,
  listKeysKey: string,
  listKey: string,
  ttlSeconds: number,
): Promise<void> {
  try {
    const keys = readKeyList(await redis.get(listKeysKey));

    if (keys.includes(listKey)) {
      return;
    }

    keys.push(listKey);
    await redis.post(listKeysKey, JSON.stringify(keys), ttlSeconds);
  } catch {
    return;
  }
}

function pipelineValue(
  result: [Error | null, unknown] | undefined,
): string | null {
  if (!result || result[0] || typeof result[1] !== 'string') {
    return null;
  }

  return result[1];
}

function parseJson<T>(raw: string): { ok: true; value: T } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false };
  }
}

function readKeyList(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((key): key is string => typeof key === 'string');
  } catch {
    return [];
  }
}

async function readCached<T>(
  redis: RedisService,
  key: string,
): Promise<T | null> {
  try {
    const raw = await redis.get(key);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeCached(
  redis: RedisService,
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  try {
    await redis.post(key, JSON.stringify(instanceToPlain(value)), ttlSeconds);
  } catch {
    return;
  }
}
