#!/bin/bash

# ElevenLabs Text-to-Speech via curl
# Make sure to set your ElevenLabs API key in the environment variable
# export ELEVENLABS_API_KEY='your-api-key-here'

# Check if API key is set
if [ -z "$ELEVENLABS_API_KEY" ]; then
  echo "Error: ELEVENLABS_API_KEY environment variable is not set"
  echo "Please set it with: export ELEVENLABS_API_KEY='your-api-key-here'"
  exit 1
fi

# Default values
text="Hello, this is a test of ElevenLabs text to speech API"
voice_id="21m00Tcm4TlvDq8ikWAM"  # Rachel voice
model_id="eleven_multilingual_v2"
stability=0.5
similarity_boost=0.75

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -t|--text)
      text="$2"
      shift 2
      ;;
    -v|--voice)
      voice_id="$2"
      shift 2
      ;;
    -m|--model)
      model_id="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  -t, --text TEXT       Text to convert to speech"
      echo "  -v, --voice TEXT      Voice ID to use (default: '21m00Tcm4TlvDq8ikWAM')"
      echo "  -m, --model TEXT      Model ID to use (default: 'eleven_multilingual_v2')"
      echo "  -h, --help            Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Create JSON payload
payload=$(cat <<EOF
{
  "text": "$text",
  "model_id": "$model_id",
  "voice_settings": {
    "stability": $stability,
    "similarity_boost": $similarity_boost
  }
}
EOF
)

# Make API request
echo "Generating speech for text: '$text'"
response=$(curl -s --request POST \
  --url https://api.elevenlabs.io/v1/text-to-speech/$voice_id \
  --header "accept: audio/mpeg" \
  --header "Content-Type: application/json" \
  --header "xi-api-key: $ELEVENLABS_API_KEY" \
  --data "$payload")

# Check if response is audio data or error
# If it's JSON, it's likely an error
if echo "$response" | head -c 1 | grep -E '^{["' > /dev/null 2>&1; then
  echo "Error from ElevenLabs API:"
  echo "$response" | jq '.'
  exit 1
fi

# Save audio to file
output_file="generated_speech.mp3"
echo "$response" > "$output_file"
echo "Speech generation successful! Saved to $output_file"