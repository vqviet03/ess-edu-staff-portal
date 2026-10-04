import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { BaseQueryApi } from '@reduxjs/toolkit/query';
import { createAppBaseQuery } from '../src/api/base-query';
import { resolveApiConfiguration } from '../src/api/config';
import { createStaffApi } from '../src/api/api';
import { makeStore } from '../src/store';
import { signedIn, signedOut } from '../src/store/auth';
import type { AuthSession } from '../src/types';

const session = (token = 'test-token'): AuthSession => ({accessToken:token, expiresAt:new Date(Date.now()+60000).toISOString(), teacher:{id:'teacher-id',name:'Giảng viên demo',teacherCode:'GV000001',roles:['TEACHER'],permissions:['results.write']}});
test('real mặc định; chuẩn hóa /v1, URL, mode và timeout; không fallback mock', () => {
  assert.equal(resolveApiConfiguration().mock,false); assert(resolveApiConfiguration().error);
  assert.equal(resolveApiConfiguration('false','https://api.test/').baseUrl,'https://api.test/v1');
  assert.equal(resolveApiConfiguration('false','https://api.test/v1/').baseUrl,'https://api.test/v1');
  for(const url of ['', 'http://api.test','https://user:pass@api.test','https://api.test/?token=x','https://api.test/#code=x']) assert(resolveApiConfiguration('false',url).error);
  for(const timeout of [0,-1,1.5,NaN,120001]) assert(resolveApiConfiguration('false','https://api.test',timeout).error);
  assert(resolveApiConfiguration('yes','https://api.test').error);
  assert.equal(resolveApiConfiguration('true').error,null);
});

test('login/exchange không gửi JWT cũ; 401 public không xóa phiên; 401 cũ không xóa phiên mới; expiry không gọi mạng', async () => {
  let auth = session(); const actions: unknown[] = []; let sent: Request | undefined; let pendingResolve: (value:Response)=>void = () => {};
  const runtime = {signal:new AbortController().signal, abort(){}, dispatch:(action:unknown)=>actions.push(action),getState:()=>({auth:{session:auth}}),endpoint:'test',type:'query',extra:undefined} as BaseQueryApi;
  const query = createAppBaseQuery({mock:false,url:'https://api.test/v1',fetchFn:async request=>{sent=request as Request;return new Response(JSON.stringify({error:{code:'INVALID_CREDENTIALS',message:'Sai thông tin'}}),{status:401,headers:{'Content-Type':'application/json'}});}});
  for(const url of ['/auth/login','/auth/link/exchange']){await query({url,method:'POST',body:{}},runtime,{});assert.equal(sent!.headers.get('Authorization'),null);}
  assert.equal(actions.length,0);
  let startedResolve:()=>void = ()=>{}; const started=new Promise<void>(resolve=>{startedResolve=resolve;});
  const delayed=createAppBaseQuery({mock:false,url:'https://api.test',fetchFn:()=>{startedResolve();return new Promise(resolve=>{pendingResolve=resolve;});}});
  const result=delayed('/auth/me',runtime,{}); await started; auth=session('new-token');
  pendingResolve(new Response(JSON.stringify({error:{code:'UNAUTHORIZED',message:'Hết phiên'}}),{status:401,headers:{'Content-Type':'application/json'}}));
  await result; assert.equal(actions.length,0);
  auth={...auth,expiresAt:'2000-01-01T00:00:00Z'};
  const expired=createAppBaseQuery({mock:false,url:'https://api.test',fetchFn:()=>{throw new Error('Expired requests must not reach network');}});
  assert.equal((await expired('/classes',runtime,{})).error?.status,401);
  assert.deepEqual(actions.map(a=>(a as {type:string}).type),['auth/signedOut','staffApi/resetApiState']);
  actions.length=0;auth=session('');
  assert.equal((await expired('/classes',runtime,{})).error?.status,401);
  assert.deepEqual(actions.map(a=>(a as {type:string}).type),['auth/signedOut','staffApi/resetApiState']);
});

test('typed RTK endpoints qua HTTP thật, meta, version, file XLSX/multipart/idempotency; 403 giữ phiên, 401 reset cache', async () => {
  const token=session(); const calls:string[]=[]; let status=200;
  const server=createServer(async(req,res)=>{
    const url=req.url!; calls.push(`${req.method} ${url}`);
    let bytes=Buffer.alloc(0); for await(const part of req) bytes=Buffer.concat([bytes,part]);
    const json=()=>JSON.parse(bytes.toString());
    const send=(data:unknown,code=200)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
    try{
      if(url==='/v1/auth/login'){assert.equal(req.headers.authorization,undefined);assert.deepEqual(json(),{teacherId:'GV000001',password:'TeacherDemo123!'});send({data:token});return;}
      assert.equal(req.headers.authorization,`Bearer ${token.accessToken}`);
      if(url==='/v1/auth/me'){send(status===200?{data:token.teacher}:{error:{code:status===403?'FORBIDDEN':'UNAUTHORIZED',message:'Lỗi test'}},status);return;}
      if(url.startsWith('/v1/classes?')){send({data:[{id:'class',code:'ess20-a1',name:'ess20-a1'}],meta:{page:1,pageSize:20,total:1}});return;}
      if(url==='/v1/assessments/a/excel-template'){res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});res.end(Buffer.from('PK-test-workbook'));return;}
      if(url==='/v1/assessments/a/import/preview'){assert.match(req.headers['content-type']!,/^multipart\/form-data; boundary=/);assert.match(bytes.toString(),/name="file"; filename="scores.xlsx"/);assert.match(bytes.toString(),/MERGE_NON_EMPTY/);send({data:{previewId:'p',changes:[],errors:[],mode:'MERGE_NON_EMPTY',expiresAt:new Date(Date.now()+60000).toISOString()}});return;}
      if(url==='/v1/assessments/a/import/commit'){assert.equal(req.headers['idempotency-key'],'import-key');assert.deepEqual(json(),{previewId:'p',mode:'MERGE_NON_EMPTY'});send({data:{updated:1}});return;}
      if(url==='/v1/assessments/a/results/student'){assert.equal(json().version,3);send({data:{...json(),version:4}});return;}
      if(url==='/v1/auth/logout'){send({data:{loggedOut:true}});return;}
      send({error:{code:'NOT_FOUND',message:'Not found'}},404);
    }catch{send({error:{code:'ASSERTION_FAILED',message:'Request violated contract'}},500);}
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address(); assert(address&&typeof address!=='string');
  const service=createStaffApi(createAppBaseQuery({mock:false,url:`http://127.0.0.1:${address.port}`}));
  const store=makeStore(service);
  try{
    store.dispatch(signedIn(await store.dispatch(service.endpoints.login.initiate({teacherId:'GV000001',password:'TeacherDemo123!'})).unwrap()));
    const classes=await store.dispatch(service.endpoints.classes.initiate({search:'ess',status:'',page:1,pageSize:20})).unwrap();assert.equal(classes.meta?.total,1);
    const template=await store.dispatch(service.endpoints.template.initiate('a')).unwrap();assert.match(await template.text(),/^PK/);
    const preview=await store.dispatch(service.endpoints.previewImport.initiate({assessmentId:'a',file:new File([template],'scores.xlsx'),mode:'MERGE_NON_EMPTY'})).unwrap();assert.equal(preview.previewId,'p');
    assert.equal((await store.dispatch(service.endpoints.commitImport.initiate({assessmentId:'a',previewId:'p',mode:'MERGE_NON_EMPTY',key:'import-key'})).unwrap()).updated,1);
    const saved=await store.dispatch(service.endpoints.saveResult.initiate({assessmentId:'a',result:{studentId:'student',attendance:'PRESENT',skillResults:[],overallComment:'Tiếng Việt\nxuống dòng',overallAdvice:'',version:3}})).unwrap();assert.equal(saved.version,4);
    assert(Object.keys(store.getState().staffApi.queries).length>0);
    store.dispatch(signedIn(token));assert.equal(Object.keys(store.getState().staffApi.queries).length,0);
    status=403;await assert.rejects(store.dispatch(service.endpoints.me.initiate(undefined,{forceRefetch:true})).unwrap());assert.equal(store.getState().auth.session?.accessToken,token.accessToken);
    status=401;await store.dispatch(service.endpoints.me.initiate(undefined,{forceRefetch:true})).unwrap().catch(()=>undefined);assert.equal(store.getState().auth.session,null);assert.equal(Object.keys(store.getState().staffApi.queries).length,0);
    store.dispatch(signedIn(token));assert.equal((await store.dispatch(service.endpoints.logout.initiate()).unwrap()).loggedOut,true);
    assert(calls.some(call=>call==='POST /v1/assessments/a/import/preview'));
  }finally{store.dispatch(signedOut());server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
