#!/bin/bash
cd /Users/loui/Downloads/kkugi-market
rm -f .git/HEAD.lock .git/index.lock
git add -A
git commit -m "UX: weekend market-closed empty state"
npx vercel --prod
