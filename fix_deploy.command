#!/bin/bash
cd /Users/loui/Downloads/kkugi-market
git add -A
git commit -m "Fix: increase max_tokens to 4096 to prevent JSON truncation"
npx vercel --prod
