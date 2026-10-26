(function () {
  'use strict';

  const SAMPLE = {
    schema_version: 1,
    plan_id: 'plan_local_demo',
    goal: 'Tampilkan hasil lokal',
    steps: [{ id: 'preview', skill_id: 'echo', input: { message: 'Workflow tervalidasi.' } }]
  };
  const LOCAL_HANDLERS = {
    echo: (input) => ({ ...input })
  };
  const HOST = typeof window !== 'undefined' ? window.JRH_HOST_ADAPTER : null;
  const approvedSteps = new Set();
  let currentPlan = null;

  const $ = (id) => document.getElementById(id);
  const input = $('planInput');

  function validatePlan(value) {
    if (!value || value.schema_version !== 1) throw new Error('schema_version harus bernilai 1.');
    if (typeof value.goal !== 'string' || !value.goal.trim()) throw new Error('goal wajib diisi.');
    if (!Array.isArray(value.steps)) throw new Error('steps harus berupa array.');
    const ids = new Set();
    value.steps.forEach((step, index) => {
      if (!step || typeof step !== 'object') throw new Error(`steps[${index}] harus berupa object.`);
      if (!step.id || !step.skill_id) throw new Error(`steps[${index}] membutuhkan id dan skill_id.`);
      if (ids.has(step.id)) throw new Error(`ID langkah duplikat: ${step.id}`);
      ids.add(step.id);
      if (step.input !== undefined && (!step.input || typeof step.input !== 'object' || Array.isArray(step.input))) {
        throw new Error(`input pada ${step.id} harus berupa object.`);
      }
    });
    return value;
  }

  function showMessage(text, kind) {
    const el = $('message');
    el.textContent = text;
    el.className = `message ${kind || ''}`;
  }

  function renderPlan(plan) {
    $('planBadge').textContent = 'VALID';
    $('planMeta').classList.remove('hidden');
    $('planMeta').textContent = `${plan.plan_id || 'plan tanpa ID'} · ${plan.steps.length} langkah · lokal saja`;
    const list = $('steps');
    list.replaceChildren(...plan.steps.map((step) => {
      const item = document.createElement('li');
      const hostStatus = HOST && typeof HOST.statusFor === 'function' ? HOST.statusFor(step.skill_id) : null;
      const isLocal = Boolean(LOCAL_HANDLERS[step.skill_id]);
      const available = hostStatus ? hostStatus.available : isLocal;
      const requiresApproval = hostStatus ? hostStatus.requiresApproval : false;
      if (!available || requiresApproval) item.className = 'blocked';
      const name = document.createElement('strong');
      name.textContent = step.id;
      const state = document.createElement('span');
      state.textContent = !available ? `${step.skill_id} · host belum terhubung` : requiresApproval ? `${step.skill_id} · butuh ACC` : `${step.skill_id} · tersedia`;
      item.append(name, state);
      if (requiresApproval) {
        const approval = document.createElement('input');
        approval.type = 'checkbox';
        approval.checked = approvedSteps.has(step.id);
        approval.setAttribute('aria-label', `ACC untuk ${step.id}`);
        approval.addEventListener('change', () => { if (approval.checked) approvedSteps.add(step.id); else approvedSteps.delete(step.id); renderPlan(plan); });
        item.prepend(approval);
      }
      return item;
    }));
    $('runButton').disabled = plan.steps.some((step) => {
      const hostStatus = HOST && typeof HOST.statusFor === 'function' ? HOST.statusFor(step.skill_id) : null;
      const available = hostStatus ? hostStatus.available : Boolean(LOCAL_HANDLERS[step.skill_id]);
      return !available || (hostStatus && hostStatus.requiresApproval && !approvedSteps.has(step.id));
    });
    $('output').classList.add('hidden');
  }

  function validateFromInput() {
    try {
      const plan = validatePlan(JSON.parse(input.value));
      currentPlan = plan;
      renderPlan(plan);
      showMessage('Plan valid. Tidak ada skill eksternal yang boleh dieksekusi oleh adapter lokal.', 'success');
    } catch (error) {
      currentPlan = null;
      $('planBadge').textContent = 'INVALID';
      $('planMeta').classList.add('hidden');
      $('steps').replaceChildren();
      $('runButton').disabled = true;
      showMessage(error.message, 'error');
    }
  }

  async function runLocal() {
    if (!currentPlan) return;
    try {
      const result = HOST ? await HOST.execute(currentPlan, approvedSteps) : { status: 'completed', outputs: Object.fromEntries(currentPlan.steps.map((step) => [step.id, LOCAL_HANDLERS[step.skill_id](step.input || {})])) };
      const output = $('output');
      output.textContent = JSON.stringify(result, null, 2);
      output.classList.remove('hidden');
      showMessage(HOST ? 'Selesai melalui host adapter yang terdaftar.' : 'Selesai. Ini hanya eksekusi handler lokal yang terdaftar.', 'success');
    } catch (error) { showMessage(error.message, 'error'); }
  }

  $('sampleButton').addEventListener('click', () => { input.value = JSON.stringify(SAMPLE, null, 2); validateFromInput(); });
  $('validateButton').addEventListener('click', validateFromInput);
  $('runButton').addEventListener('click', runLocal);
  $('clearButton').addEventListener('click', () => { input.value = ''; currentPlan = null; $('steps').replaceChildren(); $('planMeta').classList.add('hidden'); $('planBadge').textContent = 'Belum divalidasi'; $('runButton').disabled = true; $('output').classList.add('hidden'); showMessage('Masukkan workflow JSON untuk memulai.'); });
  input.value = JSON.stringify(SAMPLE, null, 2);

  if (typeof window !== 'undefined') window.JRHWebAdapter = { validatePlan };
}());
