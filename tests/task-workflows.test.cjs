const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const planner=require('../docs/assets/task-workflows.js');
const page=fs.readFileSync(__dirname+'/../docs/index.html','utf8');
const app=fs.readFileSync(__dirname+'/../docs/assets/app.js','utf8');
test('five different tasks each produce five steps and useful Markdown',()=>{
 const ids=['audit','polish','build','research','release'];
 assert.deepEqual(Object.keys(planner.tasks),ids);
 const plans=ids.map(id=>planner.create(id,planner.tasks[id].sample));
 assert.equal(new Set(plans.map(x=>x.prompt)).size,5);
 for(const plan of plans){
  assert.equal(plan.steps.length,5);
  assert.match(plan.prompt,/JRHagents/);
  assert.match(plan.markdown,/## Checklist/);
  assert.match(plan.markdown,/- \[ \]/);
  assert.match(plan.markdown,/tanpa menjalankan AI/);
 }
});
test('inputs validated and credentials rejected before use',()=>{
 assert.throws(()=>planner.create('audit','x'),/10 karakter/);
 assert.throws(()=>planner.create('audit','x'.repeat(1201)),/1.200/);
 assert.throws(()=>planner.create('missing','Periksa dashboard penuh'),/lima pekerjaan/);
 assert.throws(()=>planner.create('audit','api_key=mysecretsuperlongvalue'),/API key/);
 assert.throws(()=>planner.create('audit','sk-abcdefghijklmnopqrstuvwxyz123456'),/API key/);
});
test('task workbench has controls for generated output, downloads, and real audit',()=>{
 for(const id of ['taskWorkbench','exampleTask','taskDetails','taskFillExample','taskGenerate','taskOutput','taskOutputSteps','downloadTaskPlan','runExampleAudit','copyPrompt'])
  assert.ok(page.includes('id="'+id+'"'),id);
 assert.match(page,/task-workflows\.js\?v=21/);
 assert.match(app,/JRHTaskWorkflows/);
 assert.match(app,/generatedTask\.markdown/);
 assert.match(app,/sampleAudit'\)\.click\(\)/);
});
