import { describe, expect, it } from 'vitest';
import { tintable } from './ranks.ts';

describe('tintable', () => {
  it('maps three fills to dark, mid and light by lightness', () => {
    const svg = '<path fill="#2C2C2C"/><path fill="#171717"/><path fill="#1e1e1e"/><path fill="#2c2c2c"/>';
    expect(tintable(svg)).toBe(
      '<path fill="var(--rank-light)"/><path fill="var(--rank-dark)"/><path fill="var(--rank-mid)"/>' +
        '<path fill="var(--rank-light)"/>',
    );
  });

  it('handles style fills and short hex', () => {
    expect(tintable('<path style="fill:#fff;fill-rule:nonzero"/><path style="fill: #000000"/>')).toBe(
      '<path style="fill:var(--rank-light);fill-rule:nonzero"/><path style="fill: var(--rank-dark)"/>',
    );
  });

  it('handles rgb() fills as Affinity exports them, matching the same colour in hex', () => {
    const svg = '<path style="fill:rgb(23,23,23);"/><path fill="#2c2c2c"/><path style="fill:rgb(44, 44, 44)"/>';
    expect(tintable(svg)).toBe(
      '<path style="fill:var(--rank-dark);"/><path fill="var(--rank-light)"/><path style="fill:var(--rank-light)"/>',
    );
  });

  it('uses mid for a single fill and leaves other colours alone', () => {
    expect(tintable('<path fill="#123456" stroke="#fff"/><path fill="none"/>')).toBe(
      '<path fill="var(--rank-mid)" stroke="#fff"/><path fill="none"/>',
    );
  });

  it('spreads more than three fills over the three roles', () => {
    const out = tintable('<a fill="#000"/><b fill="#444"/><c fill="#888"/><d fill="#ccc"/><e fill="#fff"/>');
    expect(out).toBe(
      '<a fill="var(--rank-dark)"/><b fill="var(--rank-mid)"/><c fill="var(--rank-mid)"/>' +
        '<d fill="var(--rank-light)"/><e fill="var(--rank-light)"/>',
    );
  });
});
