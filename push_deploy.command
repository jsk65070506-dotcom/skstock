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
echo "=== Remote URL SSH로 변경 ==="
git remote set-url origin git@github.com:jsk65070506-dotcom/skstock.git

echo "=== 배포 push ==="
GIT_SSH_COMMAND="ssh -i $KEY -o StrictHostKeyChecking=accept-new" git push origin chore/ux-review-2026-05-v2

echo ""
echo "아무 키나 누르면 닫힙니다."
read -n 1
