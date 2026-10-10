import { check, type Category } from './recorder';

type Opts = Omit<Parameters<typeof check>[0], 'key' | 'evidence' | 'module'> & {
  module?: string;
  category?: Category;
};

/** Small wrapper: one `it` = one recorded check that must pass. */
export function suite(defaultModule: string, evidence: string) {
  return (key: string, title: string, opts: Opts) =>
    it(title, async () => {
      const { pass } = await check({ module: defaultModule, ...opts, key, evidence });
      expect(pass).toBe(true);
    });
}

export const longText = (n: number) => 'a'.repeat(n);
export const XSS = '<script>alert(1)</script><img src=x onerror=alert(1)>';
export const UNICODE = 'Ünïcødé 名前 مرحبا 😀';
