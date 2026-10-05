import { describe, it, expect } from 'vitest';
import { getSslOptions } from './prisma';

describe('getSslOptions', () => {
  it('CASE A — Local development: should not enable SSL for local URLs', () => {
    const url = new URL('mysql://root:@127.0.0.1:3306/uni-nexus_db');
    expect(getSslOptions(url)).toEqual({});
  });

  it('CASE B — Aiven production: should enable SSL with ssl-mode=REQUIRED', () => {
    const url = new URL('mysql://user:pass@host:3306/db?ssl-mode=REQUIRED');
    expect(getSslOptions(url)).toEqual({ ssl: { rejectUnauthorized: true } });
  });

  it('CASE C — Existing strict SSL compatibility: should enable SSL with sslaccept=strict', () => {
    const url = new URL('mysql://user:pass@host:3306/db?sslaccept=strict');
    expect(getSslOptions(url)).toEqual({ ssl: { rejectUnauthorized: true } });
  });

  it('CASE D — Existing ssl=true compatibility: should enable SSL with ssl=true', () => {
    const url = new URL('mysql://user:pass@host:3306/db?ssl=true');
    expect(getSslOptions(url)).toEqual({ ssl: { rejectUnauthorized: true } });
  });

  it('CASE E — Security regression: should NOT generate rejectUnauthorized: false', () => {
    const url = new URL('mysql://user:pass@host:3306/db?ssl-mode=REQUIRED');
    const options = getSslOptions(url);
    // @ts-ignore
    expect(options?.ssl?.rejectUnauthorized).not.toBe(false);
  });
});
