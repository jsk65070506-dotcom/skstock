#!/bin/bash
cd /Users/loui/Downloads/kkugi-market
git add -A
git commit -m "UI: BETA badge, remove market subtitle, clean header layout"
npx vercel --prod
