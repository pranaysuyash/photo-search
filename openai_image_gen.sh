#!/bin/bash

# OpenAI DALL-E Image Generation via curl
# Make sure to set your OpenAI API key in the environment variable
# export OPENAI_API_KEY='your-api-key-here'

# Check if API key is set
if [ -z "$OPENAI_API_KEY" ]; then
  echo "Error: OPENAI_API_KEY environment variable is not set"
  echo "Please set it with: export OPENAI_API_KEY='your-api-key-here'"
  exit 1
fi

# Default values
prompt="a white siamese cat"
model="dall-e-3"
n=1
size="1024x1024"
quality="standard"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--prompt)
      prompt="$2"
      shift 2
      ;;
    -m|--model)
      model="$2"
      shift 2
      ;;
    -n|--number)
      n="$2"
      shift 2
      ;;
    -s|--size)
      size="$2"
      shift 2
      ;;
    -q|--quality)
      quality="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  -p, --prompt TEXT     Prompt for image generation (default: 'a white siamese cat')"
      echo "  -m, --model TEXT      Model to use (dall-e-2 or dall-e-3) (default: 'dall-e-3')"
      echo "  -n, --number INT      Number of images to generate (default: 1)"
      echo "  -s, --size TEXT       Size of images (default: '1024x1024')"
      echo "  -q, --quality TEXT    Quality of images (standard or hd) (default: 'standard')"
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
  "model": "$model",
  "prompt": "$prompt",
  "n": $n,
  "size": "$size",
  "quality": "$quality"
}
EOF
)

# Make API request
echo "Generating image with prompt: '$prompt'"
response=$(curl -s https://api.openai.com/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d "$payload")

# Check if response contains error
if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
  echo "Error from OpenAI API:"
  echo "$response" | jq '.error'
  exit 1
fi

# Extract image URLs
echo "Image generation successful!"
echo "$response" | jq -r '.data[].url'

# Optional: Download images
echo "Downloading images..."
index=1
echo "$response" | jq -r '.data[].url' | while read url; do
  if [ ! -z "$url" ]; then
    filename="generated_image_$index.png"
    curl -s "$url" -o "$filename"
    echo "Downloaded: $filename"
    index=$((index + 1))
  fi
done