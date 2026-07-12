# Project notes for Claude

## Tooling preferences

- **Prefer Homebrew over npm for installing CLI tools.** When a global/system
  command-line tool is needed (e.g. the Vercel CLI), suggest `brew install …`
  rather than `npm install -g …`. This is about global tooling only — the
  project's own dependencies and `npm run` scripts in `package.json` still use
  npm as normal.
