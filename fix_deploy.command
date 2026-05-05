#!/bin/bash
cd /Users/loui/Downloads/kkugi-market
rm -f .git/HEAD.lock .git/index.lock

echo "=== 변경 파일 스테이징 ==="
git add -A

echo ""
echo "=== 커밋 ==="
git commit -m "feat: 데일리 4줄 브리핑 이메일 시스템 추가" --allow-empty

echo ""
echo "=== 현재 커밋 ==="
git log --oneline -3

echo ""
echo "=== Vercel 배포 시작 ==="
npx --yes vercel --prod --yes

echo ""
echo "=== 배포 완료 ==="
read -p "아무 키나 누르면 닫힙니다..."
