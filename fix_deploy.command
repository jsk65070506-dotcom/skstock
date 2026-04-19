#!/bin/bash
cd /Users/loui/Downloads/kkugi-market
rm -f .git/HEAD.lock .git/index.lock
git add -A
git commit -m "feat: top-level asset tabs (주식/부동산/가상자산/조각투자) + coming-soon screen"
npx vercel --prod
