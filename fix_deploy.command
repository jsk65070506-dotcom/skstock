#!/bin/bash
cd /Users/loui/Downloads/kkugi-market
rm -f .git/HEAD.lock
git add -A
git commit -m "Fix: image compression + model name for Vercel"
git push
npx vercel --prod
