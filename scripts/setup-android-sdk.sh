#!/usr/bin/env bash
set -euo pipefail

# Configure the Android SDK for the Expo native project.
# Usage: ./scripts/setup-android-sdk.sh

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
android_dir="$repo_root/apps/mobile/android"

sdk_candidates=()
[[ -n "${ANDROID_HOME:-}" ]] && sdk_candidates+=("$ANDROID_HOME")
[[ -n "${ANDROID_SDK_ROOT:-}" ]] && sdk_candidates+=("$ANDROID_SDK_ROOT")
sdk_candidates+=(
  "$HOME/Library/Android/sdk"
  "$HOME/Android/Sdk"
  "${LOCALAPPDATA:-}/Android/Sdk"
)

sdk_path=""
for candidate in "${sdk_candidates[@]}"; do
  if [[ -n "$candidate" && -d "$candidate/platform-tools" ]]; then
    sdk_path="$(cd "$candidate" && pwd)"
    break
  fi
done

if [[ -z "$sdk_path" ]]; then
  echo "Android SDK를 찾지 못했습니다." >&2
  echo "Android Studio의 SDK Manager에서 SDK를 설치한 뒤 ANDROID_HOME을 설정하세요." >&2
  echo "예: export ANDROID_HOME=\"$HOME/Library/Android/sdk\"" >&2
  exit 1
fi

mkdir -p "$android_dir"
printf 'sdk.dir=%s\n' "${sdk_path//\\/\\\\}" > "$android_dir/local.properties"

cat <<EOF
Android SDK 설정 완료
- SDK: $sdk_path
- 파일: $android_dir/local.properties

현재 셸에도 경로를 적용하려면 다음을 실행하세요:
export ANDROID_HOME="$sdk_path"
export ANDROID_SDK_ROOT="$sdk_path"
export PATH="$sdk_path/platform-tools:$sdk_path/emulator:\$PATH"

그 다음:
cd "$repo_root/apps/mobile" && npx expo run:android
EOF
