import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {parseContactUpdate} from './contact.ts';
import {normalizeStudentCode} from './student-code.ts';
import {issueImageUpload,imagePreview,eventImages} from './images.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const checked=(r:any)=>{if(r.error)throw new Error(r.error.message);return r.data;};
Deno.serve(async(req)=>{try{
const {data:setting}=await db.from('app_settings').select('value').eq('key','gateway_hash').single();
if(!setting||await digest(req.headers.get('X-App-Key')||'')!==setting.value)return Response.json({error:'Forbidden'},{status:403});
const b=await req.json();const a=b.action;if(a==='manual-code')b.student_code=normalizeStudentCode(b.student_code);const aliasCode=b.student_code;if(typeof b.student_code==='string'){if(!/^(?:\d{7}|\d{2}-\d{2}-\d{3})$/.test(b.student_code))throw new Error('Invalid student code');b.student_code=b.student_code.replaceAll('-','');}
if(a==='rate')return Response.json({allowed:checked(await db.rpc('take_rate_limit',{p_key:b.key,p_limit:b.limit,p_seconds:b.seconds}))});
if(a==='leaderboard')return Response.json({rows:checked(await db.rpc('leaderboard')).map((row:any)=>({full_name:row.full_name,points:row.points}))});
if(a==='public'){const [events,news]=await Promise.all([db.from('events').select('id,title,description,location,start_at,end_at,points,cover_url,dress_code').lt('end_at',new Date().toISOString()).order('start_at',{ascending:false}).limit(100),db.from('news').select('*').order('created_at',{ascending:false}).limit(10)]);const {data:home}=await db.from('app_settings').select('value').eq('key','home').maybeSingle();return Response.json({events:await eventImages(db,checked(events),Deno.env.get('SUPABASE_URL')!),news:checked(news),home:home?JSON.parse(home.value):{}});}
if(a==='signup'){
if(!/^\d{7}$/.test(b.student_code)||typeof b.password!=='string'||b.password.length<12||typeof b.ciphertext!=='string')throw new Error('Invalid registration');
const {data,error}=await db.auth.admin.createUser({email:aliasCode+'@members.mnagl.invalid',password:b.password,email_confirm:true});if(error)throw new Error('Unable to create account. This student code may already be registered.');
try {checked(await db.rpc('finish_registration',{p_id:data.user.id,p_code:b.student_code,p_name:b.full_name,p_phone:b.phone,p_recovery:b.recovery_hash,p_ciphertext:b.ciphertext}));}catch(e){await db.auth.admin.deleteUser(data.user.id);throw e;}return Response.json({created:true});}
if(a==='recover'){
const {data:p}=await db.from('profiles').select('id,recovery_hash').eq('student_code',b.student_code).maybeSingle();
if(!p||p.recovery_hash!==b.recovery_hash)throw new Error('Invalid recovery details');
const claim=crypto.randomUUID();const claimed=checked(await db.from('profiles').update({recovery_hash:claim}).eq('id',p.id).eq('recovery_hash',b.recovery_hash).select('id'));
if(!claimed.length)throw new Error('Recovery code already used');
const {error}=await db.auth.admin.updateUserById(p.id,{password:b.password});
if(error){await db.from('profiles').update({recovery_hash:b.recovery_hash}).eq('id',p.id).eq('recovery_hash',claim);throw new Error('Unable to reset password');}
checked(await db.from('profiles').update({recovery_hash:b.new_recovery_hash}).eq('id',p.id).eq('recovery_hash',claim));
return Response.json({saved:true});}
const token=req.headers.get('X-User-Token');if(!token)return Response.json({error:'Login required'},{status:401});
const {data:{user},error}=await db.auth.getUser(token);if(error||!user)return Response.json({error:'Login required'},{status:401});
if(b._rate){const allowed=checked(await db.rpc('take_rate_limit',{p_key:await digest(user.id+a),p_limit:a==='image-upload'?20:90,p_seconds:60}));if(!allowed)return Response.json({error:'Please wait'},{status:429});}
const profile=checked(await db.from('profiles').select('id,full_name,student_code,phone,email,role').eq('id',user.id).single());const leader=profile.role==='leader';
if(a==='me'){const [regs,points]=await Promise.all([db.from('registrations').select('*').eq('user_id',user.id),db.from('points_ledger').select('points,event_id').eq('user_id',user.id)]);return Response.json({profile,registrations:checked(regs),points:checked(points)});}
if(a==='events'){const rows=checked(await db.from('events').select('id,title,description,location,start_at,end_at,points,cover_url,dress_code').order('start_at').limit(1000));return Response.json({events:await eventImages(db,rows,Deno.env.get('SUPABASE_URL')!)});}
if(a==='event'){const row=checked(await db.from('events').select('id,title,description,location,start_at,end_at,points,cover_url,dress_code').eq('id',b.event_id).maybeSingle());if(!row)return Response.json({error:'الفعالية مش موجودة'},{status:404});return Response.json({event:(await eventImages(db,[row],Deno.env.get('SUPABASE_URL')!))[0]});}
if(a==='rsvp'){checked(await db.from('registrations').upsert({event_id:b.event_id,user_id:user.id,going:b.going!==false,...(b.accommodation!==undefined?{accommodation:String(b.accommodation).slice(0,2000)}:{}),...(b.excuse!==undefined?{excuse:String(b.excuse).slice(0,2000)}:{}),request_status:'accepted'}));return Response.json({saved:true,status:'accepted'});}
if(a==='scan'){const parts=String(b.code).split('.');if(parts.length!==3||parts[0]!=='MAM1')throw new Error('Invalid attendance code');return Response.json(checked(await db.rpc('check_in',{p_event:parts[1],p_user:user.id,p_actor:user.id,p_qr:await digest(parts[2])})));}
if(a==='identity')return Response.json({error:'National ID updates are not allowed'},{status:403});
if(a==='profile'){const {_rate,...input}=b;const details=parseContactUpdate(input);const updated=checked(await db.from('profiles').update(details).eq('id',user.id).select('phone,email').single());return Response.json({saved:true,profile:updated});}
if(!leader)return Response.json({error:'Forbidden'},{status:403});
if(a==='image-upload')return Response.json(await issueImageUpload(db,user.id,b.purpose));
if(a==='image-read')return Response.json(await imagePreview(db,b.url,Deno.env.get('SUPABASE_URL')!));
if(a==='create-event'){const dressCode=b.dress_code===undefined?'':b.dress_code;if(typeof dressCode!=='string'||dressCode.length>300)throw new Error('Dress code must be at most 300 characters');const raw=crypto.randomUUID()+crypto.randomUUID();const row=checked(await db.from('events').insert({title:b.title,description:b.description,location:b.location,dress_code:dressCode.trim(),start_at:b.start_at,end_at:b.end_at,points:b.points,cover_url:b.cover_url||null,qr_hash:await digest(raw),created_by:user.id}).select('id').single());return Response.json({id:row.id,code:'MAM1.'+row.id+'.'+raw});}
if(a==='event-stats')return Response.json({rows:checked(await db.rpc('leader_event_stats',{p_actor:user.id}))});
if(a==='attendees')return Response.json(checked(await db.rpc('leader_event_roster',{p_actor:user.id,p_event:b.event_id})));
if(a==='manual-code')return Response.json(checked(await db.rpc('record_attendance_by_code',{p_event:b.event_id,p_code:normalizeStudentCode(b.student_code),p_actor:user.id})));
if(a==='manual'){const target=checked(await db.from('profiles').select('student_code').eq('id',b.user_id).single());return Response.json(checked(await db.rpc('record_attendance_by_code',{p_event:b.event_id,p_code:target.student_code,p_actor:user.id})));}
if(a==='home'){checked(await db.from('app_settings').upsert({key:'home',value:JSON.stringify(b.home)}));return Response.json({saved:true});}
if(a==='news'){checked(await db.from('news').insert({title:b.title,body:b.body}));return Response.json({saved:true});}
throw new Error('Unknown action');
}catch(e){return Response.json({error:e instanceof Error?e.message:'Request failed'},{status:400});}});
