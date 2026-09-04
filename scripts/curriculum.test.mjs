import assert from 'node:assert/strict';
import test from 'node:test';
import { plannedCurriculum, referenceEquipment, currentLearningObjectives } from '../lib/curriculum.ts';

test('new curriculum is explicitly a seven-stage design, not active progress', () => {
  assert.equal(plannedCurriculum.status, 'design-only');
  assert.equal(plannedCurriculum.stages.length, 7);
  assert.equal(plannedCurriculum.equipmentId, referenceEquipment.id);
});

test('stage dependencies refer only to defined earlier stages and IDs are unique', () => {
  const seen = new Set();
  for (const stage of plannedCurriculum.stages) {
    assert(!seen.has(stage.id));
    for (const required of stage.requires) assert(seen.has(required), `${stage.id}: ${required}`);
    assert(stage.evidence.length > 0);
    assert(stage.objective.length > 0);
    seen.add(stage.id);
  }
});

test('full observing configuration precedes balance and alignment precedes observation', () => {
  const byId = Object.fromEntries(plannedCurriculum.stages.map(stage => [stage.id, stage]));
  assert(byId.balance.requires.includes('accessories'));
  assert.deepEqual(byId.accessories.evidence, ['finder-secured', 'diagonal-secured', 'eyepiece-secured']);
  assert(byId.observation.requires.includes('alignment'));
  assert(byId.alignment.evidence.includes('finder-aligned'));
  assert(byId.alignment.evidence.includes('polar-alignment-checked'));
  assert(byId.alignment.evidence.includes('target-in-view'));
});

test('intro uses the generic reference and does not promise unimplemented activities', () => {
  assert(referenceEquipment.qualification.includes('특정 제조사'));
  assert.equal(currentLearningObjectives.length, 4);
  for (const text of currentLearningObjectives) assert(!/극축|탐색|리포트/.test(text));
});
