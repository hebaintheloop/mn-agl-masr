import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
const parsed=stripTypeScriptTypes(await readFile('supabase/functions/app-backend/contact.ts','utf8')).replace('export function','function');
const parseContactUpdate=new Function(parsed+';return parseContactUpdate')();
const source=(await readFile('supabase/functions/app-backend/index.ts','utf8')).replace(/^import[^\n]*\n/gm,'');
const codeSource=stripTypeScriptTypes(await readFile('supabase/functions/app-backend/student-code.ts','utf8')).replace('export function','function');
const normalizeStudentCode=new Function(codeSource+';return normalizeStudentCode')();
let role='student';const rpcCalls=[];
const key='local-test-gateway';
const digest=async s=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))).toString('hex');
const gatewayHash=await digest(key);let handler;const writes=[];
const db={rpc:async(name,params)=>{rpcCalls.push({name,params});return {data:name==='leader_event_stats'?[]:{saved:true,rows:[],attendance:[]}}},auth:{getUser:async token=>({data:{user:token==='valid-session'?{id:'authenticated-user'}:null},error:null})},from(table){
 const query={select(){return query},eq(field,value){query.owner=value;return query},update(value){writes.push({table,value,query});return query},async single(){
  if(table==='app_settings')return {data:{value:gatewayHash}};
  return {data:{id:'authenticated-user',role,phone:'01012345678',email:null}};
 }};return query;
}};
new Function('createClient','Deno','parseContactUpdate','normalizeStudentCode',stripTypeScriptTypes(source))(()=>db,{env:{get:()=>''},serve:fn=>handler=fn},parseContactUpdate,normalizeStudentCode);
async function call(body,token='valid-session') {return handler(new Request('https://test.invalid',{method:'POST',headers:{'Content-Type':'application/json','X-App-Key':key,...(token?{'X-User-Token':token}:{})},body:JSON.stringify(body)}));}
assert.equal((await call({action:'identity',national_id:'12345678901234'})).status,403);assert.equal(writes.length,0);
for(const field of ['national_id','role','user_id','student_code'])assert.equal((await call({action:'profile',phone:'01012345678',email:'test@example.org',[field]:'forged'})).status,400);
assert.equal(writes.length,0);
assert.equal((await call({action:'profile',phone:'01012345678',email:'test@example.org'},null)).status,401);
assert.equal((await call({action:'profile',phone:'01012345678',email:'test@example.org'})).status,200);
assert.equal(writes.length,1);assert.equal(writes[0].table,'profiles');assert.equal(writes[0].query.owner,'authenticated-user');assert.deepEqual(writes[0].value,{phone:'01012345678',email:'test@example.org'});
console.log('PASS backend rejects ID/extra fields and missing login, writes only contact fields to authenticated owner');

for(const action of ['event-stats','attendees','manual-code'])assert.equal((await call({action,event_id:'event-id',student_code:'2527646'})).status,403);
assert.equal(rpcCalls.length,0);
role='leader';
assert.equal((await call({action:'manual-code',event_id:'event-id',student_code:'٢٥٢٧٦٤٦',p_actor:'forged-user'})).status,200);
assert.deepEqual(rpcCalls.at(-1),{name:'record_attendance_by_code',params:{p_event:'event-id',p_code:'2527646',p_actor:'authenticated-user'}});
assert.equal((await call({action:'event-stats',p_actor:'forged-user'})).status,200);
assert.deepEqual(rpcCalls.at(-1),{name:'leader_event_stats',params:{p_actor:'authenticated-user'}});
assert.equal((await call({action:'attendees',event_id:'event-id',p_actor:'forged-user'})).status,200);
assert.deepEqual(rpcCalls.at(-1),{name:'leader_event_roster',params:{p_actor:'authenticated-user',p_event:'event-id'}});
console.log('PASS stats, roster and code attendance deny students and use the authenticated leader identity');
