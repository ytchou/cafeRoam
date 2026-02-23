import { describe, it, expect } from 'vitest';
import { detectChain, decomposeBrandBranch } from './chain-dictionary';

describe('detectChain', () => {
  it('detects 路易莎 by canonical name prefix', () => {
    const result = detectChain('路易莎咖啡 中山店');
    expect(result).not.toBeNull();
    expect(result!.brand).toBe('路易莎咖啡');
    expect(result!.storeCount).toBe(524);
  });

  it('detects 路易莎 by alias (Louisa)', () => {
    const result = detectChain('Louisa Coffee 信義店');
    expect(result).not.toBeNull();
    expect(result!.brand).toBe('路易莎咖啡');
  });

  it('detects 星巴克 by canonical name', () => {
    const result = detectChain('星巴克 南京店');
    expect(result).not.toBeNull();
    expect(result!.brand).toBe('星巴克');
  });

  it('detects 85度C by alias (85°C)', () => {
    const result = detectChain('85°C 板橋店');
    expect(result).not.toBeNull();
    expect(result!.brand).toBe('85度C');
  });

  it('detects cama by alias (cama cafe)', () => {
    const result = detectChain('cama cafe 大安店');
    expect(result).not.toBeNull();
    expect(result!.brand).toBe('cama咖啡');
  });

  it('returns null for non-chain shop', () => {
    expect(detectChain('好咖啡')).toBeNull();
    expect(detectChain('山頂小屋')).toBeNull();
  });

  it('returns null for partial name collision (non-prefix)', () => {
    // "我愛路易莎" does not START with 路易莎 or any alias
    expect(detectChain('我愛路易莎咖啡')).toBeNull();
  });
});

describe('decomposeBrandBranch', () => {
  it('decomposes brand + branch for known chain', () => {
    const result = decomposeBrandBranch('路易莎咖啡 中山店');
    expect(result).not.toBeNull();
    expect(result!.brand).toBe('路易莎咖啡');
    expect(result!.branch).toBe('中山店');
  });

  it('decomposes brand with empty branch (just brand name)', () => {
    const result = decomposeBrandBranch('路易莎咖啡');
    expect(result).not.toBeNull();
    expect(result!.brand).toBe('路易莎咖啡');
    expect(result!.branch).toBe('');
  });

  it('returns null for non-chain shop', () => {
    expect(decomposeBrandBranch('好咖啡')).toBeNull();
  });

  it('decomposes Starbucks by alias', () => {
    const result = decomposeBrandBranch('Starbucks 信義新光店');
    expect(result).not.toBeNull();
    expect(result!.brand).toBe('星巴克');
    expect(result!.branch).toBe('信義新光店');
  });
});
