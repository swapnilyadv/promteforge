#!/usr/bin/env bash
# One command after you change the engine (packages/core, packages/providers) or any app:
# rebuilds and tests everything, repackages the editor extension, and reinstalls it into the editors found on
# this Mac. The Chrome extension is rebuilt too; Chrome only needs a click on its reload arrow.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n\033[1m%s\033[0m\n' "$1"; }

step "1/4  Build, typecheck and test everything"
pnpm install --frozen-lockfile >/dev/null
pnpm build
pnpm typecheck
pnpm test

step "2/4  Package the VS Code / Cursor / Antigravity extension"
pnpm --filter promptforge package
VSIX="$PWD/apps/vscode/promptforge.vsix"

step "3/4  Reinstall it in the editors on this Mac"
install_in() {
  local name="$1" cli="$2"
  if [ -x "$cli" ]; then
    # Run from a neutral folder: some editor CLIs resolve paths against the working directory.
    (cd /tmp && "$cli" --install-extension "$VSIX" --force 2>&1 | grep -Ei "successfully|error" || true)
    echo "   $name: done. Reload its window (Cmd+Shift+P, 'Developer: Reload Window') or restart it."
  else
    echo "   $name: not found, skipped."
  fi
}
install_in "VS Code"     "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
install_in "Cursor"      "/Applications/Cursor.app/Contents/Resources/app/bin/cursor"
install_in "Antigravity" "/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide"

step "4/4  Chrome / Brave / Edge extension and website"
echo "   Extension rebuilt at: $PWD/apps/extension/.output/chrome-mv3"
echo "   -> open brave://extensions (or chrome://extensions) and click the reload arrow on PromptForge."
echo "   Website engine (apps/website/try.js) was rebuilt too. To publish it: git add -A && git commit && git push"
echo "   (Vercel deploys main automatically)."
printf '\n\033[1mDone.\033[0m\n'
