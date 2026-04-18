#!/bin/bash
cd /Users/loui/Downloads/kkugi-market
git add -A
git commit -m "UX improvements + fix admin parse error + model claude-sonnet-4-6"
npx vercel --prod
