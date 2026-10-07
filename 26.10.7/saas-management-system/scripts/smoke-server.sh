#!/usr/bin/env bash
# 后端接口冒烟测试：启动服务 -> 打接口 -> 关闭服务
set -u
cd /i/workbuddy/saas-admin/server
PW=$(node -e "console.log(require('./src/config').seed.defaultPassword)")
node src/index.js > /tmp/saas-server.log 2>&1 &
SRV=$!
for i in $(seq 1 30); do
  if curl -s --noproxy '*' -o /dev/null http://localhost:4000/api/health; then break; fi
  sleep 0.5
done

CURL="curl -s --noproxy *"
C="curl -s --noproxy '*'"

echo "=========== 1. health ==========="
$C http://localhost:4000/api/health; echo

echo "=========== 2. demo accounts ==========="
$C http://localhost:4000/api/auth/demo-accounts; echo

echo "=========== 3. login platform admin ==========="
ADMIN_JSON=$($C -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"account\":\"admin@platform.local\",\"password\":\"$PW\"}")
echo "$ADMIN_JSON" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('success=',j.success,'perms=',j.data.user.permissions.length,'isPlatform=',j.data.user.isPlatform)})"

echo "=========== 4. login tenant admin ==========="
TENANT_JSON=$($C -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"account\":\"chen.jiawei@acme.com\",\"password\":\"$PW\"}")
echo "$TENANT_JSON" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('success=',j.success,'tenant=',j.data.user.tenantName,'perms=',j.data.user.permissions.length,'isPlatform=',j.data.user.isPlatform)})"

AT=$(echo "$ADMIN_JSON" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.token))")
TT=$(echo "$TENANT_JSON" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.token))")

echo "=========== 5. 平台视角 租户列表 ==========="
$C -H "Authorization: Bearer $AT" "http://localhost:4000/api/tenants?pageSize=3" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('total=',j.data.total,'返回=',j.data.items.length, j.data.items.map(t=>t.name+'/'+t.planName).join(', '))})"

echo "=========== 6. 租户视角 租户列表（应只剩 1 个） ==========="
$C -H "Authorization: Bearer $TT" "http://localhost:4000/api/tenants?pageSize=10" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('total=',j.data.total,'items=',JSON.stringify(j.data.items.map(t=>t.name)))})"

echo "=========== 7. 租户越权访问他人租户（应 403） ==========="
OTHER=$(node -e "const s=require('./src/db/store');s.load();const t=s.collection('tenants').find(t=>t.slug==='globex');console.log(t.id)")
$C -H "Authorization: Bearer $TT" "http://localhost:4000/api/tenants/$OTHER"; echo

echo "=========== 8. 租户传 tenantId 越权（应 403） ==========="
$C -H "Authorization: Bearer $TT" "http://localhost:4000/api/users?tenantId=$OTHER"; echo

echo "=========== 9. 只读运营账号尝试建租户（应 403） ==========="
OPS_JSON=$($C -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"account\":\"ops@platform.local\",\"password\":\"$PW\"}")
OT=$(echo "$OPS_JSON" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.token))")
$C -X POST http://localhost:4000/api/tenants -H "Authorization: Bearer $OT" -H "Content-Type: application/json" -d '{"name":"测试","slug":"test"}'; echo

echo "=========== 10. 平台总览 ==========="
$C -H "Authorization: Bearer $AT" http://localhost:4000/api/dashboard/platform | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(JSON.stringify(j.data.stats));console.log('growth points=',j.data.growth.length,'plans=',JSON.stringify(j.data.planDistribution))})"

echo "=========== 11. 租户总览 ==========="
$C -H "Authorization: Bearer $TT" http://localhost:4000/api/dashboard/tenant | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(JSON.stringify(j.data.stats));console.log('usage points=',j.data.usage.length)})"

echo "=========== 12. 计费概览 ==========="
$C -H "Authorization: Bearer $AT" http://localhost:4000/api/billing/overview | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('mrr=',j.data.mrr,'arr=',j.data.arr,'arpu=',j.data.arpu,'counts=',JSON.stringify(j.data.counts))})"

echo "=========== 13. 套餐 / 角色 / 订阅 ==========="
$C -H "Authorization: Bearer $AT" http://localhost:4000/api/plans | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('plans=',j.data.map(p=>p.name+'('+p.tenantCount+')').join(', '))})"
$C -H "Authorization: Bearer $AT" http://localhost:4000/api/roles | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('roles=',j.data.length)})"
$C -H "Authorization: Bearer $AT" http://localhost:4000/api/subscriptions | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('subs=',j.data.length,'MRR合计=',j.data.reduce((a,b)=>a+b.mrr,0))})"

echo "=========== 14. 审计日志 ==========="
$C -H "Authorization: Bearer $AT" "http://localhost:4000/api/dashboard/audit-logs?pageSize=3" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('total=',j.data.total, JSON.stringify(j.data.items.map(l=>l.actionLabel)))})"

kill $SRV 2>/dev/null
echo ""
echo "=========== DONE ==========="
