#!/usr/bin/env sh
set -eu

exec env \
  "INPUT_PATH=${1-}" \
  "INPUT_PROJECT=${2-}" \
  "INPUT_CONFIG=${3-}" \
  "INPUT_MODE=${4-}" \
  "INPUT_REQUIRE-KICAD=${5-}" \
  "INPUT_KICAD-CLI=${6-}" \
  "INPUT_BOM=${7-}" \
  "INPUT_PINMAP=${8-}" \
  "INPUT_VARIANT=${9-}" \
  "INPUT_SARIF=${10-}" \
  "INPUT_JSON=${11-}" \
  "INPUT_MARKDOWN=${12-}" \
  "INPUT_UPLOAD-SARIF=${13-}" \
  "INPUT_UPLOAD-ARTIFACTS=${14-}" \
  "INPUT_COMMENT-PR=${15-}" \
  "INPUT_ARTIFACT-NAME=${16-}" \
  "INPUT_FAIL-ON=${17-}" \
  "INPUT_ANNOTATIONS=${18-}" \
  node /usr/local/lib/node_modules/boardreadyops/dist/action/index.cjs
