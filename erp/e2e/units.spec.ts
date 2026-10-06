import { expect, test } from '@playwright/test';
import { convert, formatMoney, parseMoney, toMinor } from '../lib/money';
import { normalizePhone, isValidPhone } from '../lib/phone';
import { can } from '../lib/rbac';
import { addDays, isISODate } from '../lib/dates';

test('money parsing and conversion stay exact', () => {
  expect(parseMoney('1,250,000', 'IQD')).toBe(1250000);
  expect(parseMoney('١٢٥٠٠٠', 'IQD')).toBe(125000);
  expect(parseMoney('350.55', 'USD')).toBe(35055);
  expect(parseMoney('abc', 'IQD')).toBeNull();
  expect(convert(toMinor(500, 'USD'), 'USD', 'IQD', 1310)).toBe(655000);
  expect(convert(655000, 'IQD', 'USD', 1310)).toBe(50000);
  expect(formatMoney(1750000, 'IQD', 'en')).toBe('IQD 1,750,000');
  expect(formatMoney(12345, 'USD')).toBe('$123.45');
});

test('Iraqi phone numbers normalise to international format', () => {
  expect(normalizePhone('0770 123 4567')).toBe('+9647701234567');
  expect(normalizePhone('٠٧٧٠١٢٣٤٥٦٧')).toBe('+9647701234567');
  expect(normalizePhone('00964 780 000 1111')).toBe('+9647800001111');
  expect(isValidPhone('123')).toBe(false);
});

test('roles grant only their permissions', () => {
  expect(can('owner', 'users.manage')).toBe(true);
  expect(can('manager', 'users.manage')).toBe(false);
  expect(can('sales', 'leads.write')).toBe(true);
  expect(can('sales', 'reports.read')).toBe(false);
  expect(can('accountant', 'finance.write')).toBe(true);
  expect(can('accountant', 'leads.read')).toBe(false);
  expect(can('viewer', 'bookings.write')).toBe(false);
  expect(can('sales', 'data.export')).toBe(false);
  expect(can('viewer', 'data.export')).toBe(false);
  expect(can('accountant', 'data.export')).toBe(true);
});

test('business dates reject impossible days', () => {
  expect(isISODate('2026-02-30')).toBe(false);
  expect(isISODate('2026-12-31')).toBe(true);
  expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
});
