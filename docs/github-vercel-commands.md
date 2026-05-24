# GitHub And Vercel Commands

Run these from the `somniacos` directory after loading secrets locally:

```bash
set -a
source ../buildenv/.env
set +a
pnpm install
pnpm run build
git init
git add .
git commit -m "feat: launch SomniacOS autonomous economy"
gh repo create somniacos --private --source=. --remote=origin --push
vercel link --yes
vercel env pull .env.vercel.local
vercel deploy --prod
```

Required secret handling:

- Do not commit `.env`, `.env.local`, `.env.vercel.local`, private keys, GitHub tokens, or Vercel tokens.
- Set deployment variables in Vercel through the dashboard or Vercel CLI.
