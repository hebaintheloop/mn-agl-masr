import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
const parsed=stripTypeScriptTypes(await readFile('supabase/functions/app-backend/contact.ts','utf8')).replace('export function','function');
const parseContactUpdate=new Function(parsed+';return parseContactUpdate')();
const source=(await readFile('supabase/functions/app-backend/index.ts','utf8')).replace(/^import[^\n]*\n/gm,'');
const key='local-test-gateway';
const digest=async s=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))).toString('hex');
const gatewayHash=await digest(key);let handler;const writes=[];
const db={auth:{getUser:async token=>({data:{user:token==='valid-session'?{id:'authenticated-user'}:null},error:null})},from(table){
 const query={select(){return query},eq(field,value){query.owner=value;return query},update(value){writes.push({table,value,query});return query},async single(){
  if(table==='app_settings')return {data:{value:gatewayHash}};
  return {data:{id:'authenticated-user',role:'student',phone:'01012345678',email:null}};
 }};return query;
}};
new Function('createClient','Deno','parseContactUpdate',stripTypeScriptTypes(source))(()=>db,{env:{get:()=>''},serve:fn=>handler=fn},parseContactUpdate);
async function call(body,token='valid-session') {return handler(new Request('https://test.invalid',{method:'POST',headers:{'Content-Type':'application/json','X-App-Key':key,...(token?{'X-User-Token':token}:{})},body:JSON.stringify(body)}));}
assert.equal((await call({action:'identity',national_id:'12345678901234'})).status,403);assert.equal(writes.length,0);
for(const field of ['national_id','role','user_id','student_code'])assert.equal((await call({action:'profile',phone:'01012345678',email:'test@example.org',[field]:'forged'})).status,400);
assert.equal(writes.length,0);
assert.equal((await call({action:'profile',phone:'01012345678',email:'test@example.org'},null)).status,401);
assert.equal((await call({action:'profile',phone:'01012345678',email:'test@example.org'})).status,200);
assert.equal(writes.length,1);assert.equal(writes[0].table,'profiles');assert.equal(writes[0].query.owner,'authenticated-user');assert.deepEqual(writes[0].value,{phone:'01012345678',email:'test@example.org'});
console.log('PASS backend rejects ID/extra fields and missing login, writes only contact fields to authenticated owner');
