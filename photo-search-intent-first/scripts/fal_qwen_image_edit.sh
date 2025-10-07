#!/usr/bin/env bash
# Lightweight helper to call FAL Qwen Image Edit using curl
# Usage:
#   export FAL_KEY="<your fal key>"
#   ./fal_qwen_image_edit.sh -p "Change bag to apple macbook" -i "https://v3.fal.media/files/koala/oei_-iPIYFnhdB8SxojND_qwen-edit-res.png"
# OR using a local file (auto converts to data URI):
#   ./fal_qwen_image_edit.sh -p "Change bag to apple macbook" --file /absolute/path/to/input.png
# Optional:
#   -s steps (default 30)
#   -g guidance_scale (default 4)
#   -n num_images (default 1)
#   -o output_format (png|jpeg) default png
#   -a acceleration (none|regular|high) default regular
#   -w width -h height (custom size)
#   --negative "..." (negative prompt)
#   --sync (sync_mode true: returns data URI)
# Output: prints REQUEST_ID and fetches status until complete, then prints result JSON

set -euo pipefail

API_URL="https://queue.fal.run/fal-ai/qwen-image-edit"

if [[ -z "${FAL_KEY:-}" ]]; then
  echo "FAL_KEY is not set. Please export FAL_KEY first." >&2
  exit 1
fi

PROMPT=""
IMAGE_URL=""
FILE_PATH=""
STEPS=30
GUIDANCE=4
NUM_IMAGES=1
OUT_FMT="png"
ACCEL="regular"
NEGATIVE=" "
SYNC=false
WIDTH=""
HEIGHT=""

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--prompt) PROMPT="$2"; shift 2;;
    -i|--image-url) IMAGE_URL="$2"; shift 2;;
  -s|--steps) STEPS="$2"; shift 2;;
    -g|--guidance) GUIDANCE="$2"; shift 2;;
    -n|--num-images) NUM_IMAGES="$2"; shift 2;;
    -o|--output-format) OUT_FMT="$2"; shift 2;;
    -a|--acceleration) ACCEL="$2"; shift 2;;
    --negative) NEGATIVE="$2"; shift 2;;
    --sync) SYNC=true; shift 1;;
  -w|--width) WIDTH="$2"; shift 2;;
    -h|--height) HEIGHT="$2"; shift 2;;
  --file) FILE_PATH="$2"; shift 2;;
    *) echo "Unknown arg: $1" >&2; exit 1;;
  esac
done

if [[ -z "$PROMPT" ]]; then
  echo "Prompt is required" >&2
  exit 1
fi

# If FILE_PATH provided, encode to data URI
if [[ -n "$FILE_PATH" ]]; then
  if [[ ! -f "$FILE_PATH" ]]; then
    echo "File not found: $FILE_PATH" >&2
    exit 1
  fi
  # Detect mime type (requires 'file' command)
  if command -v file >/dev/null 2>&1; then
    MIME_TYPE=$(file -b --mime-type "$FILE_PATH")
  else
    # Fallback to extension-based guess
    case "$FILE_PATH" in
      *.jpg|*.jpeg) MIME_TYPE="image/jpeg";;
      *.png) MIME_TYPE="image/png";;
      *.webp) MIME_TYPE="image/webp";;
      *) MIME_TYPE="application/octet-stream";;
    esac
  fi
  BASE64_DATA=$(base64 -i "$FILE_PATH" | tr -d '\n')
  IMAGE_URL="data:${MIME_TYPE};base64,${BASE64_DATA}"
fi

if [[ -z "$IMAGE_URL" ]]; then
  echo "Either --image-url or --file must be provided" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for this script to run. Please install jq (e.g., brew install jq)." >&2
  exit 1
fi

# Build JSON safely with jq
REQ_BODY=$(jq -n \
  --arg prompt "$PROMPT" \
  --arg out_fmt "$OUT_FMT" \
  --arg image_url "$IMAGE_URL" \
  --arg negative "$NEGATIVE" \
  --arg accel "$ACCEL" \
  --arg steps "$STEPS" \
  --arg guidance "$GUIDANCE" \
  --arg num_images "$NUM_IMAGES" \
  --arg width "$WIDTH" \
  --arg height "$HEIGHT" \
  '
  {
    prompt: $prompt,
    num_inference_steps: ($steps|tonumber),
    guidance_scale: ($guidance|tonumber),
    num_images: ($num_images|tonumber),
    enable_safety_checker: true,
    output_format: $out_fmt,
    image_url: $image_url,
    negative_prompt: $negative,
    acceleration: $accel
  } as $base
  | ($width|if length>0 then tonumber else null end) as $w
  | ($height|if length>0 then tonumber else null end) as $h
  | if ($w != null and $h != null) then
      $base + { image_size: { width: $w, height: $h } }
    else
      $base + { image_size: "square_hd" }
    end
  ')

#!/usr/bin/env bash
# NOTE: This script prints server error details for easier debugging.
# Submit request
TMP_BODY=$(mktemp)
http_code=$(curl --silent --show-error --request POST \
  --url "$API_URL" \
  --header "Authorization: Key $FAL_KEY" \
  --header "Content-Type: application/json" \
  --data "$REQ_BODY" \
  --output "$TMP_BODY" \
  --write-out "%{http_code}" || true)
response=$(cat "$TMP_BODY")
rm -f "$TMP_BODY" || true

if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
  echo "FAL submit error (HTTP $http_code). Response:" >&2
  echo "$response" >&2
  exit 1
fi

REQUEST_ID=$(echo "$response" | grep -o '"request_id" *: *"[^"]*"' | sed 's/.*: *"\(.*\)"/\1/')
if [[ -z "$REQUEST_ID" ]]; then
  echo "Failed to extract request_id from response: $response" >&2
  exit 1
fi

echo "REQUEST_ID=$REQUEST_ID"

# Poll status
STATUS_URL="$API_URL/requests/$REQUEST_ID/status"
DETAIL_URL="$API_URL/requests/$REQUEST_ID"

for i in {1..60}; do
  status=$(curl --silent --show-error --request GET \
    --url "$STATUS_URL" \
    --header "Authorization: Key $FAL_KEY") || true
  state=$(echo "$status" | grep -o '"status" *: *"[^"]*"' | sed 's/.*: *"\(.*\)"/\1/')
  echo "status=$state"
  if [[ "$state" == "COMPLETED" || "$state" == "FAILED" ]]; then
    break
  fi
  sleep 2
 done

# Fetch result
result=$(curl --silent --show-error --request GET \
  --url "$DETAIL_URL" \
  --header "Authorization: Key $FAL_KEY")

echo "$result"
