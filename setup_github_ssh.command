#!/bin/bash
# GitHub SSH 키 자동 세팅 + push

set -e
REPO_DIR="$(dirname "$0")"
KEY_PATH="$HOME/.ssh/id_ed25519_github_skstock"

echo "======================================"
echo "  GitHub SSH 자동 세팅"
echo "======================================"
echo ""

# 1. SSH 키 생성 (없으면)
if [ ! -f "$KEY_PATH" ]; then
  echo "[1/4] SSH 키 생성 중..."
  ssh-keygen -t ed25519 -C "jsk65070506@gmail.com" -f "$KEY_PATH" -N "" -q
  echo "      ✓ 키 생성 완료: $KEY_PATH"
else
  echo "[1/4] ✓ SSH 키 이미 존재 — 재사용"
fi
echo ""

# 2. ssh-agent 등록
echo "[2/4] ssh-agent 등록 중..."
eval "$(ssh-agent -s)" > /dev/null 2>&1
# macOS Keychain에 영구 등록
ssh-add --apple-use-keychain "$KEY_PATH" 2>/dev/null || ssh-add "$KEY_PATH" 2>/dev/null || true
echo "      ✓ 등록 완료"
echo ""

# 3. 공개키 클립보드 복사
echo "[3/4] 공개키를 클립보드에 복사합니다..."
pbcopy < "${KEY_PATH}.pub"
echo "      ✓ 복사 완료"
echo ""

# 4. GitHub SSH 설정 페이지 열기
echo "[4/4] GitHub SSH 설정 페이지를 엽니다..."
echo ""
echo "  ★ 브라우저에서:"
echo "     Title에 아무 이름 입력 (예: MacBook)"
echo "     Key 칸에 Cmd+V 붙여넣기"
echo "     'Add SSH key' 클릭"
echo ""
open "https://github.com/settings/ssh/new"
echo ""

# GitHub에 키 추가될 때까지 대기
echo "--------------------------------------"
echo "GitHub에 SSH 키를 추가하셨나요?"
echo "완료되면 아무 키나 눌러주세요..."
read -n 1
echo ""

# SSH 연결 테스트
echo "연결 테스트 중..."
SSH_TEST=$(ssh -o StrictHostKeyChecking=accept-new -T git@github.com 2>&1 || true)
if echo "$SSH_TEST" | grep -q "successfully authenticated"; then
  echo "✓ SSH 연결 성공!"
  echo ""

  # remote URL을 SSH로 변경
  cd "$REPO_DIR"
  git remote set-url origin git@github.com:jsk65070506-dotcom/skstock.git
  echo "✓ remote URL → SSH 방식으로 변경 완료"
  echo ""

  # Push 실행
  echo "======================================"
  echo "  배포 push 시작..."
  echo "======================================"
  git push origin chore/ux-review-2026-05-v2
  echo ""
  echo "🎉 배포 완료! Vercel이 자동으로 빌드를 시작합니다."
  echo "   https://vercel.com 에서 진행 상황 확인 가능"
else
  echo "⚠ SSH 연결 실패. GitHub에 키가 추가됐는지 확인해주세요."
  echo "  오류 내용: $SSH_TEST"
fi

echo ""
echo "아무 키나 누르면 닫힙니다."
read -n 1
