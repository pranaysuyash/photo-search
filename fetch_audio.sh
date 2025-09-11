#!/bin/bash

# General purpose script for fetching audio files via curl
# This script can be used to download sound effects, music, or voice clips

# Function to download an audio file from a URL
download_audio() {
    local url=$1
    local filename=$2
    
    echo "Downloading audio from: $url"
    
    # Use curl to download the audio file
    curl -s "$url" -o "$filename"
    
    # Check if download was successful
    if [ $? -eq 0 ] && [ -f "$filename" ]; then
        echo "Successfully downloaded: $filename"
        file "$filename"  # Show file type info
    else
        echo "Failed to download audio"
        return 1
    fi
}

# Function to download audio with custom headers (for APIs that require them)
download_audio_with_headers() {
    local url=$1
    local filename=$2
    local headers=$3  # Should be in the format "Header1: Value1|Header2: Value2"
    
    echo "Downloading audio from: $url"
    
    # Build curl command with headers
    local curl_cmd="curl -s"
    
    # Add headers if provided
    if [ -n "$headers" ]; then
        IFS='|' read -ra ADDR <<< "$headers"
        for i in "${ADDR[@]}"; do
            curl_cmd="$curl_cmd -H \"$i\""
        done
    fi
    
    # Add URL and output file
    curl_cmd="$curl_cmd \"$url\" -o \"$filename\""
    
    # Execute the command
    eval $curl_cmd
    
    # Check if download was successful
    if [ $? -eq 0 ] && [ -f "$filename" ]; then
        echo "Successfully downloaded: $filename"
        file "$filename"
    else
        echo "Failed to download audio"
        return 1
    fi
}

# Function to download multiple audio files from a list
download_audio_list() {
    local list_file=$1
    
    # Check if list file exists
    if [ ! -f "$list_file" ]; then
        echo "Error: List file not found: $list_file"
        return 1
    fi
    
    # Process each line in the list file
    while IFS= read -r line; do
        # Skip empty lines and comments
        if [ -z "$line" ] || [[ $line == #* ]]; then
            continue
        fi
        
        # Split line into URL and filename
        local url=$(echo "$line" | cut -d'|' -f1)
        local filename=$(echo "$line" | cut -d'|' -f2)
        
        # Download the audio file
        download_audio "$url" "$filename"
    done < "$list_file"
}

# Display help
show_help() {
    echo "Usage: $0 [OPTIONS] URL FILENAME"
    echo "       $0 [OPTIONS] -l LIST_FILE"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -H, --headers HEADERS   Headers to include (format: 'Header1: Value1|Header2: Value2')"
    echo "  -l, --list LIST_FILE    Download multiple files from a list"
    echo ""
    echo "Examples:"
    echo "  $0 https://example.com/sound.mp3 effect.mp3"
    echo "  $0 -H 'Authorization: Bearer token' https://api.example.com/audio clip.wav"
    echo "  $0 -l audio_list.txt"
    echo ""
    echo "List file format (audio_list.txt):"
    echo "https://example.com/sound1.mp3|effect1.mp3"
    echo "https://example.com/sound2.wav|effect2.wav"
    echo "# This is a comment"
    echo "https://example.com/sound3.ogg|effect3.ogg"
}

# Parse command line arguments
HEADERS=""
LIST_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -H|--headers)
            HEADERS="$2"
            shift 2
            ;;
        -l|--list)
            LIST_FILE="$2"
            shift 2
            ;;
        -*)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
        *)
            break
            ;;
    esac
done

# Handle list mode
if [ -n "$LIST_FILE" ]; then
    download_audio_list "$LIST_FILE"
    exit 0
fi

# Check if URL and filename are provided (for single file mode)
if [ $# -lt 2 ]; then
    echo "Error: URL and filename are required"
    show_help
    exit 1
fi

URL=$1
FILENAME=$2

# Execute the appropriate function based on options
if [ -n "$HEADERS" ]; then
    download_audio_with_headers "$URL" "$FILENAME" "$HEADERS"
else
    download_audio "$URL" "$FILENAME"
fi