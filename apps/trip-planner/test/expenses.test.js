import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foodChainOf, learnFromExpenses, merchantColumn, normalizeMerchant, parseDelimited } from '../js/expenses.js';

test('parseDelimited handles quotes, doubled quotes, embedded commas/newlines, CRLF, BOM and TSV', () => {
  assert.deepEqual(parseDelimited('﻿a,b\r\n"c, d","e ""x"""\r\n'), [
    ['a', 'b'],
    ['c, d', 'e "x"'],
  ]);
  assert.deepEqual(parseDelimited('a,"multi\nline"\nb,c'), [
    ['a', 'multi\nline'],
    ['b', 'c'],
  ]);
  assert.deepEqual(parseDelimited('Merchant\tAmount\nCHIPOTLE 2451\t12.40\n'), [
    ['Merchant', 'Amount'],
    ['CHIPOTLE 2451', '12.40'],
  ]);
  assert.deepEqual(parseDelimited('\n\nx\n\n'), [['x']]);
});

test('merchantColumn prefers merchant over description', () => {
  assert.equal(merchantColumn(['Date', 'Description', 'Merchant Name', 'Amount']), 2);
  assert.equal(merchantColumn(['Transaction Date', 'Description', 'Amount']), 1);
  assert.equal(merchantColumn(['2026-09-15', 'CHIPOTLE 2451', '12.40']), -1);
});

test('foodChainOf reads statement-style merchant strings', () => {
  assert.equal(foodChainOf('CHIPOTLE 2451')?.key, 'chipotle');
  assert.equal(foodChainOf('CHIPOTLE ONLINE')?.key, 'chipotle');
  assert.equal(foodChainOf('TST* PENN STATION #112')?.key, 'penn-station');
  assert.equal(foodChainOf("MCDONALD'S F12345")?.key, 'mcdonalds');
  assert.equal(foodChainOf('CHICK-FIL-A #01234')?.key, 'chick-fil-a');
  assert.equal(foodChainOf('SQ *SWENSONS DRIVE-IN')?.key, 'swensons');
  assert.equal(foodChainOf('COURTYARD COVINGTON'), null);
});

test('normalizeMerchant strips processor prefixes, store numbers and state codes', () => {
  assert.equal(normalizeMerchant('TST* JOES DINER #44 COLUMBUS OH'), 'Joes Diner Columbus');
  assert.equal(normalizeMerchant('SQ *BLUE DOOR BAKERY'), 'Blue Door Bakery');
  assert.equal(normalizeMerchant('12345'), '');
});

test('learnFromExpenses counts chains, fuel brands and repeat unknowns from a card export', () => {
  const csv = [
    'Transaction Date,Description,Merchant,Amount',
    '09/15/2026,Meals,CHIPOTLE 2451,12.40',
    '09/15/2026,Fuel,SPEEDWAY 0123,48.10',
    '09/15/2026,Lodging,COURTYARD COVINGTON,159.00',
    '09/16/2026,Meals,CHIPOTLE 1880,11.95',
    '09/16/2026,Meals,"PANERA BREAD #601234",10.25',
    '09/16/2026,Fuel,SPEEDWAY 0456,51.00',
    '09/17/2026,Meals,CHIPOTLE ONLINE,13.10',
    '09/17/2026,Meals,TST* JOES DINER #44 COLUMBUS OH,9.00',
    '09/18/2026,Meals,TST* JOES DINER #44 COLUMBUS OH,9.00',
    '09/19/2026,Meals,TST* JOES DINER #44 COLUMBUS OH,9.00',
    '09/19/2026,Parking,PARK MOBILE CINCINNATI,6.00',
    '09/19/2026,Parking,PARK MOBILE CINCINNATI,6.00',
    '09/19/2026,Parking,PARK MOBILE CINCINNATI,6.00',
  ].join('\n');
  const out = learnFromExpenses(csv);
  assert.equal(out.rowsRead, 13);
  assert.deepEqual(out.food, [
    { key: 'chipotle', label: 'Chipotle', count: 3 },
    { key: 'panera', label: 'Panera Bread', count: 1 },
  ]);
  assert.deepEqual(out.fuel, [{ key: 'speedway', label: 'Speedway', count: 2 }]);
  // Parking is travel overhead, not a habit; the diner is a 3-visit repeat.
  assert.deepEqual(out.other, [{ label: 'Joes Diner Columbus', count: 3 }]);
});

test('learnFromExpenses works on pasted statement lines with no header', () => {
  const out = learnFromExpenses('CHIPOTLE 2451 CLEVELAND OH  12.40\nSHELL OIL 57444  40.00\n\nchipotle 1880 12.00');
  assert.equal(out.rowsRead, 3);
  assert.deepEqual(out.food.map((f) => [f.key, f.count]), [['chipotle', 2]]);
  assert.deepEqual(out.fuel.map((f) => [f.key, f.count]), [['shell', 1]]);
});

test('learnFromExpenses on empty input', () => {
  assert.deepEqual(learnFromExpenses(''), { rowsRead: 0, food: [], fuel: [], other: [] });
});
