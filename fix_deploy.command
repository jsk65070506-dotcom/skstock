#!/bin/bash
cd /Users/loui/Downloads/kkugi-market
rm -f .git/HEAD.lock .git/index.lock
git add -A
git commit -m "brand: rename to 꾸기 Daily Morning, update OG image"
npx vercel --prod
