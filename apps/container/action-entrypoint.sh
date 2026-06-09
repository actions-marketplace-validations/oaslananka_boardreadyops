#!/usr/bin/env sh
set -eu

# GitHub Actions automatically sets INPUT_<NAME> environment variables for Docker actions.
# No need to map positional arguments - just execute the action directly.
exec node /usr/local/lib/node_modules/boardreadyops/dist/action/index.cjs
