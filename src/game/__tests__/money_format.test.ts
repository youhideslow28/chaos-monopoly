import { describe, it, expect } from 'vitest';
import { formatMoney, localizeMoneyText } from '../../utils/money';

describe('money formatting', () => {
  it('formats integers with thousands separators', () => {
    expect(formatMoney(0)).toBe('$0');
    expect(formatMoney(200)).toBe('$200');
    expect(formatMoney(1500)).toBe('$1,500');
    expect(formatMoney(-2000)).toBe('-$2,000');
    expect(formatMoney(NaN)).toBe('$0');
  });

  it('rewrites legacy "$1500M" amounts inside log text', () => {
    expect(localizeMoneyText('Nhận được +$200M!')).toBe('Nhận được +$200!');
    expect(localizeMoneyText('Bị phạt trừ -$1500M!')).toBe('Bị phạt trừ -$1,500!');
    expect(localizeMoneyText('mua giá $60M và $350M')).toBe('mua giá $60 và $350');
    expect(localizeMoneyText('Không có số tiền')).toBe('Không có số tiền');
  });
});
