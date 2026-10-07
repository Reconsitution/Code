#!/usr/bin/env bash
# 全链路冒烟：启动后端 + 前端 dev server，验证页面与代理可用
set -u
cd /i/workbuddy/saas-admin
PW=$(node -e "console.log(require('./server/src/config').seed.defaultPassword)")

node server/src/index.js > /tmp/nimbus-api.log 2>&1 &
API=$!
cd web && npx vite --port 5177 > /tmp/nimbus-web.log 2>&1 &
WEB=$!
cd ..

for i in $(seq 1 40); do
  if curl -s --noproxy '*' -o /dev/null http://localhost:5177/; then break; fi
  sleep 0.5
done

C="curl -s --noproxy '*'"

echo "=========== 前端 index.html ==========="
$C http://localhost:5177/ | head -c 300; echo

echo "=========== 前端主入口能否编译 ==========="
$C -o /dev/null -w "main.tsx HTTP %{http_code}\n" http://localhost:5177/src/main.tsx

echo "=========== vite 代理 -> 后端 health ==========="
$C http://localhost:5177/api/health; echo

echo "=========== vite 代理 -> 登录 ==========="
$C -X POST http://localhost:5177/api/auth/login -H "Content-Type: application/json" \
  -d "{\"account\":\"admin@platform.local\",\"password\":\"$PW\"}" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('success=',j.success,'user=',j.data.user.displayName)})"

echo "=========== SPA 路由回退（/dashboard 应返回 index.html） ==========="
$C -o /dev/null -w "/dashboard HTTP %{http_code}\n" http://localhost:5177/dashboard

echo "=========== 前端构建产物 ==========="
ls -la web/dist/assets 2>/dev/null | head -5

kill $API $WEB 2>/dev/null
echo ""
echo "=========== DONE ==========="
