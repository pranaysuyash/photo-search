#!/bin/bash

# General purpose script for fetching images/icons via curl
# This script can be used to download various types of media for your website

# Function to download an image from a URL
download_image() {
    local url=$1
    local filename=$2
    
    echo "Downloading image from: $url"
    
    # Use curl to download the image
    curl -s "$url" -o "$filename"
    
    # Check if download was successful
    if [ $? -eq 0 ] && [ -f "$filename" ]; then
        echo "Successfully downloaded: $filename"
        file "$filename"  # Show file type info
    else
        echo "Failed to download image"
        return 1
    fi
}

# Function to download with custom headers (for APIs that require them)
download_with_headers() {
    local url=$1
    local filename=$2
    local headers=$3  # Should be in the format "Header1: Value1|Header2: Value2"
    
    echo "Downloading from: $url"
    
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
        echo "Failed to download file"
        return 1
    fi
}

# Function to download and resize an image using ImageMagick (if available)
download_and_resize() {
    local url=$1
    local filename=$2
    local width=$3
    local height=$4
    
    # Download the image first
    download_image "$url" "$filename"
    
    # Check if ImageMagick is available and resize
    if command -v convert &> /dev/null; then
        local resized_filename="${filename%.*}_resized.${filename##*.}"
        echo "Resizing image to ${width}x${height}"
        convert "$filename" -resize "${width}x${height}" "$resized_filename"
        if [ $? -eq 0 ]; then
            echo "Successfully resized image to: $resized_filename"
        else
            echo "Failed to resize image"
        fi
    else
        echo "ImageMagick not found. Skipping resize step."
        echo "Install ImageMagick with: brew install imagemagick (macOS) or apt-get install imagemagick (Linux)"
    fi
}

# Display help
show_help() {
    echo "Usage: $0 [OPTIONS] URL FILENAME"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -H, --headers HEADERS   Headers to include (format: 'Header1: Value1|Header2: Value2')"
    echo "  -r, --resize WxH        Resize image after download (requires ImageMagick)"
    echo ""
    echo "Examples:"
    echo "  $0 https://example.com/image.png icon.png"
    echo "  $0 -H 'Authorization: Bearer token|Accept: image/*' https://api.example.com/image logo.png"
    echo "  $0 -r 128x128 https://example.com/avatar.jpg profile.jpg"
}

# Parse command line arguments
HEADERS=""
RESIZE_DIMENSIONS=""

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
        -r|--resize)
            RESIZE_DIMENSIONS="$2"
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

# Check if URL and filename are provided
if [ $# -lt 2 ]; then
    echo "Error: URL and filename are required"
    show_help
    exit 1
fi

URL=$1
FILENAME=$2

# Execute the appropriate function based on options
if [ -n "$RESIZE_DIMENSIONS" ]; then
    # Extract width and height from dimensions
    WIDTH=$(echo $RESIZE_DIMENSIONS | cut -d'x' -f1)
    HEIGHT=$(echo $RESIZE_DIMENSIONS | cut -d'x' -f2)
    download_and_resize "$URL" "$FILENAME" "$WIDTH" "$HEIGHT"
elif [ -n "$HEADERS" ]; then
    download_with_headers "$URL" "$FILENAME" "$HEADERS"
else
    download_image "$URL" "$FILENAME"
fi