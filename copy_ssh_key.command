#!/bin/bash
KEY_PATH="$HOME/.ssh/id_ed25519_github_skstock"

if [ ! -f "${KEY_PATH}.pub" ]; then
  echo "SSH 키가 없습니다. setup_github_ssh.command를 먼저 실행해주세요."
  read -n 1
  exit 1
fi

echo "=== SSH 공개키 ==="
echo ""
cat "${KEY_PATH}.pub"
echo ""
echo "=== 위 키를 클립보드에 복사합니다 ==="
pbcopy < "${KEY_PATH}.pub"
echo "✓ 복사 완료!"
echo ""
echo "GitHub 페이지의 Key 칸에 Cmd+V로 붙여넣으세요."
echo ""
echo "아무 키나 누르면 닫힙니다."
read -n 1
