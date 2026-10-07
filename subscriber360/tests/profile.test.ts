import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreTopic } from '../src/profile.js';

test('negative feedback lowers topic score', () => {
  const now = new Date().toISOString();
  const positive = scoreTopic([{source:'signwell',event_type:'save',topic:'healthy_aging',occurred_at:now,numeric_value:1}]);
  const mixed = scoreTopic([
    {source:'signwell',event_type:'save',topic:'healthy_aging',occurred_at:now,numeric_value:1},
    {source:'signwell',event_type:'dismiss',topic:'healthy_aging',occurred_at:now,numeric_value:1}
  ]);
  assert.ok((mixed[0]?.score ?? 0) < (positive[0]?.score ?? 0));
});
