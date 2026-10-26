'use strict';

function createGoalPlanner({ propose, host } = {}) {
  if (typeof propose !== 'function') throw new Error('Goal planner requires an injected propose function.');
  if (!host || typeof host.statusFor !== 'function' || typeof host.listSkills !== 'function') throw new Error('Goal planner requires a JRH host runtime.');

  const normalizeProposal = (proposal) => {
    let plan = proposal;
    if (typeof plan === 'string') {
      try { plan = JSON.parse(plan); } catch { throw new Error('Planner returned invalid JSON.'); }
    }
    if (!plan || typeof plan.goal !== 'string' || !plan.goal.trim()) throw new Error('Planner proposal requires a non-empty goal.');
    if (!Array.isArray(plan.steps) || plan.steps.length === 0) throw new Error('Planner proposal requires at least one step.');
    const seen = new Set();
    const steps = plan.steps.map((step, index) => {
      if (!step || typeof step.id !== 'string' || typeof step.skill_id !== 'string') throw new Error(`Invalid planner step at index ${index}.`);
      if (seen.has(step.id)) throw new Error(`Duplicate planner step ID: ${step.id}`);
      seen.add(step.id);
      const status = host.statusFor(step.skill_id);
      if (!status.available) throw new Error(`Planner proposed unavailable skill: ${step.skill_id}`);
      return { id: step.id, skill_id: step.skill_id, input: step.input && typeof step.input === 'object' && !Array.isArray(step.input) ? step.input : {} };
    });
    return { schema_version: 1, plan_id: plan.plan_id || `plan_${Date.now().toString(36)}`, goal: plan.goal.trim(), steps };
  };

  const prepareExecution = (plan, approvedSteps = []) => {
    if (!plan || typeof plan.goal !== 'string' || !Array.isArray(plan.steps)) throw new Error('Execution preparation requires a validated plan.');
    if (!Array.isArray(approvedSteps)) throw new Error('approvedSteps must be an array.');
    const stepIds = new Set(plan.steps.map((step) => step.id));
    for (const stepId of approvedSteps) {
      if (typeof stepId !== 'string' || !stepIds.has(stepId)) throw new Error(`Approval references unknown step: ${stepId}`);
    }
    const approvals = new Set(approvedSteps);
    for (const step of plan.steps) {
      const status = host.statusFor(step.skill_id);
      if (status.requiresApproval && !approvals.has(step.id)) throw new Error(`Approval required before execution: ${step.id}`);
    }
    return { plan, execution: { plan_id: plan.plan_id, approvedSteps: [...approvals] } };
  };

  return {
    availableSkills() { return host.listSkills().map(({ id, description, risk, requiresApproval }) => ({ id, description, risk, requiresApproval })); },
    async propose(goal, context = {}) {
      if (typeof goal !== 'string' || !goal.trim()) throw new Error('Goal must be a non-empty string.');
      const proposal = await propose({ goal: goal.trim(), context, availableSkills: this.availableSkills() });
      const plan = normalizeProposal(proposal);
      return { plan, review: plan.steps.map((step) => ({ ...step, ...host.statusFor(step.skill_id) })) };
    },
    prepareExecution(plan, approvedSteps = []) { return prepareExecution(plan, approvedSteps); }
  };
}

module.exports = { createGoalPlanner };
