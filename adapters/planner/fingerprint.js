'use strict';

const crypto = require('node:crypto');

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function planFingerprint(plan) {
  if (!plan || typeof plan !== 'object') throw new Error('Plan is required for fingerprinting.');
  const canonical = { plan_id: plan.plan_id || null, goal: plan.goal, steps: plan.steps };
  return crypto.createHash('sha256').update(stableSerialize(canonical)).digest('hex');
}

module.exports = { planFingerprint, stableSerialize };
