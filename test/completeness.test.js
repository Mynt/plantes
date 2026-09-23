import test from 'node:test';
import assert from 'node:assert/strict';
import { isSubmissionComplete } from '../lib/completeness.js';

test('false si faltan plantas por responder', () => {
  const required = ['p1', 'p2', 'p3'];
  const submitted = [
    { refPlantId: 'p1', proposedName: 'Romero' },
    { refPlantId: 'p2', proposedName: 'Tomillo' },
  ];
  assert.equal(isSubmissionComplete(required, submitted), false);
});

test('true si todas las plantas requeridas tienen respuesta no vacía', () => {
  const required = ['p1', 'p2'];
  const submitted = [
    { refPlantId: 'p1', proposedName: 'Romero' },
    { refPlantId: 'p2', proposedName: 'Tomillo' },
  ];
  assert.equal(isSubmissionComplete(required, submitted), true);
});

test('false si la respuesta está en blanco', () => {
  const required = ['p1', 'p2'];
  const submitted = [
    { refPlantId: 'p1', proposedName: 'Romero' },
    { refPlantId: 'p2', proposedName: '   ' },
  ];
  assert.equal(isSubmissionComplete(required, submitted), false);
});

test('false si no hay plantas requeridas (listado vacío no cuenta como completo)', () => {
  assert.equal(isSubmissionComplete([], []), false);
});

test('ignora entregas duplicadas o de otras plantas', () => {
  const required = ['p1'];
  const submitted = [
    { refPlantId: 'p1', proposedName: 'Romero' },
    { refPlantId: 'otra-no-requerida', proposedName: 'Lavanda' },
  ];
  assert.equal(isSubmissionComplete(required, submitted), true);
});
