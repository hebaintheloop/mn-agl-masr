import {request} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const origin='http://localhost:3000';const password=randomBytes(18).toString('base64url');const state={password};
for(const [role,code] of [['student','99-99-981'],['leader','99-99-982']]){const ctx=await request.newContext({baseURL:origin,extraHTTPHeaders:{Origin:origin}});const res=await ctx.post('/api/auth',{data:{action:'signup',student_code:code,password,full_name:'Integration Test '+role,phone:'00000000000',national_id:'00000000000000'}});const data=await res.json();if(!res.ok())throw new Error(role+': '+JSON.stringify(data));const me=await ctx.post('/api/action',{data:{action:'me'}});const profile=await me.json();if(!me.ok())throw new Error('Session not persisted: '+JSON.stringify(profile));state[role]={id:profile.profile.id,code,recovery:data.recovery,storage:await ctx.storageState()};await ctx.dispose();}
writeFileSync('.test-state.json',JSON.stringify(state),{mode:0o600});console.log('Created two isolated test accounts; signup and session persistence passed.');
