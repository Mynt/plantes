import test from 'node:test';
import assert from 'node:assert/strict';
import { generateListCode } from '../lib/codegen.js';

test('genera un código de la longitud pedida', () => {
  const code = generateListCode(6);
  assert.equal(code.length, 6);
});

test('usa solo el alfabeto permitido (sin 0/O/1/I ambiguos)', () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 50; i++) {
    const code = generateListCode(8);
    for (const char of code) {
      assert.ok(alphabet.includes(char), `carácter inesperado: ${char}`);
    }
  }
});

test('longitud por defecto es 6', () => {
  assert.equal(generateListCode().length, 6);
});
