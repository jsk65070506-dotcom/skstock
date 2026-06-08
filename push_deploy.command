#!/bin/bash
cd "$(dirname "$0")"

KEY="$HOME/.ssh/id_ed25519_github_skstock"
chmod 600 "$KEY" 2>/dev/null
chmod 644 "${KEY}.pub" 2>/dev/null

# 공개키를 파일로 저장 (Claude가 읽을 수 있도록)
cp "${KEY}.pub" "$(dirname "$0")/_pubkey_export.txt"
echo "공개키 저장됨: _pubkey_export.txt"
cat "${KEY}.pub"

echo ""
echo "=== lock 파일 정리 ==="
rm -f .git/HEAD.lock .git/index.lock

echo "=== Remote URL SSH로 변경 ==="
git remote set-url origin git@github.com:jsk65070506-dotcom/skstock.git

echo "=== 변경사항 커밋 ==="
git add components/BriefingCard.jsx pages/api/stock-price.js
git diff --cached --quiet || git commit -m "fix: Yahoo Finance v8 API + 실시간 시세 우선 적용"

echo "=== 배포 push ==="
GIT_SSH_COMMAND="ssh -i $KEY -o StrictHostKeyChecking=accept-new" git push origin chore/ux-review-2026-05-v2

echo ""
echo "=== Vercel Production 배포 ==="
npx vercel --prod --yes

echo ""
echo "아무 키나 누르면 닫힙니다."
read -n 1
