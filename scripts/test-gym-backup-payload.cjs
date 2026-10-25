const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../netlify/functions/gym-state.ts'), 'utf8');

function handlerFixture() {
  const writes=[]; const mod={exports:{}};
  const requireStub = name => name==='@netlify/blobs' ? {getStore:()=>({setJSON:async(...args)=>writes.push(args)})} : {
    allowedCorsOrigin:()=>null,createRateLimiter:()=>()=>true,getClientIp:()=> 'test',
    PayloadTooLargeError:class extends Error{},readLimitedText:async req=>req.text(),
  };
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports','process',js)(requireStub,mod,mod.exports,{env:{GYM_TRACKER_PASSCODE:'synthetic-test-only'}});
  return {handler:mod.exports.default,writes};
}
function request(payload) {return new Request('https://example.test/.netlify/functions/gym-state',{method:'PUT',headers:{'x-gym-tracker-passcode':'synthetic-test-only','content-type':'application/json'},body:JSON.stringify({payload:JSON.stringify(payload)})});}
test('incomplete cloud backups cannot overwrite stored history',async()=>{
  for(const payload of [null,[],{version:1},{version:1,workoutPlans:[]}]) {
    const f=handlerFixture();const response=await f.handler(request(payload));assert.equal(response.status,400);assert.equal(f.writes.length,0);
  }
});
test('complete version-1 cloud backups remain accepted',async()=>{
  const f=handlerFixture();const payload={version:1,workoutPlans:[],exerciseTemplates:[],workoutSessions:[],exerciseSessions:[],setEntries:[],personalRecords:[]};
  const response=await f.handler(request(payload));assert.equal(response.status,200);assert.equal(f.writes.length,1);
});
