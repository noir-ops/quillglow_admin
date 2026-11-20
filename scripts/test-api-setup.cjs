// Run: node scripts/test-api-setup.cjs after installing dependencies. All network calls mocked.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');let admin=true,user={id:'admin1',email:'admin@example.net',email_confirmed_at:'yes'},saved,calls=[];
const service={from(){return {upsert(p){saved=p;return this},select(){return this},single:async()=>({data:saved,error:null})}}};
function load(file){const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function req(id){if(id==='next/server')return{NextResponse:{json:(p,o)=>new Response(JSON.stringify(p),{status:o?.status||200})}};
if(id==='@/lib/supabase/server')return{createClient:async()=>({auth:{getUser:async()=>({data:{user}})}})};
if(id==='@/lib/auth/admin')return{isAdminUser:async()=>admin};if(id==='@/lib/supabase/admin')return{createAdminClient:()=>service};
if(id.startsWith('@/'))return load(path.join(root,id.slice(2)+'.ts'));return require(id)};
vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:file})(req,mod,mod.exports);return mod.exports}
async function run(){const settings=load(path.join(root,'app/api/ai-settings/route.ts'));const body={active_provider:'opensource',openai_model:'existing-openai',gemini_model:'existing-gemini',opensource_model:' llama-test ',opensource_base_url:' https://models.example/v1/// '};
const request=p=>new Request('https://admin.example/api/ai-settings',{method:'POST',body:JSON.stringify(p)});
admin=false;assert.equal((await settings.POST(request(body))).status,401);assert.equal(saved,undefined);admin=true;
assert.equal((await settings.POST(request(body))).status,200);assert.equal(saved.opensource_base_url,'https://models.example/v1');assert.equal(saved.opensource_model,'llama-test');
assert.equal((await settings.POST(request({...body,opensource_base_url:'file:///etc/passwd'}))).status,400);
assert.equal((await settings.POST(request({...body,opensource_model:null}))).status,400);
assert.equal((await settings.POST(new Request('https://x',{method:'POST',body:'invalid'}))).status,400);
const test=load(path.join(root,'app/api/ai-settings/test/route.ts'));
global.fetch=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({choices:[{message:{content:'OK'}}]}))};
let res=await test.POST(request({provider:'opensource',model:'llama-test',baseUrl:'https://models.example/v1/'}));assert.equal((await res.json()).ok,true);assert.equal(calls.at(-1).url,'https://models.example/v1/chat/completions');
global.fetch=async()=>new Response(JSON.stringify({choices:[]}));assert.equal((await (await test.POST(request({provider:'opensource',model:'llama-test',baseUrl:'https://models.example/v1'}))).json()).ok,false);
const email=load(path.join(root,'app/api/email-status/route.ts'));admin=false;assert.equal((await email.POST()).status,401);admin=true;
process.env.MAILERSEND_API_KEY='test';process.env.MAILERSEND_FROM_EMAIL='updates@example.org';global.fetch=async(url,options)=>{calls.push({url,options});return new Response(null,{status:202})};
assert.equal((await email.POST()).status,200);assert.equal(JSON.parse(calls.at(-1).options.body).to[0].email,user.email);user.email_confirmed_at=null;assert.equal((await email.POST()).status,400);
console.log('PASS: admin-only AI settings/test/email APIs, normalized endpoint/model persistence, invalid JSON/URL rejection, empty response failure, verified self-addressed email test.');}
run().catch(e=>{console.error(e);process.exit(1)});
