#!/bin/bash
cd /Users/loui/Downloads/kkugi-market
rm -f .git/HEAD.lock .git/index.lock
git add -A
git commit -m "feat: OG meta tags + dynamic og image for KakaoTalk preview"
npx vercel --prod
