# Examples of using the fetch scripts

# 1. Basic image download
./fetch_media.sh https://via.placeholder.com/150 icon.png

# 2. Download with custom headers (useful for APIs)
./fetch_media.sh -H "User-Agent: MyApp/1.0" https://api.example.com/image chart.png

# 3. Download and resize an image (requires ImageMagick)
./fetch_media.sh -r 128x128 https://via.placeholder.com/512 avatar.jpg

# 4. Basic audio download
./fetch_audio.sh https://example.com/sound.mp3 effect.mp3

# 5. Download audio with headers
./fetch_audio.sh -H "Authorization: Bearer your-token-here" https://api.example.com/audio speech.mp3

# 6. Download multiple audio files from a list
./fetch_audio.sh -l audio_list_example.txt

# 7. Download multiple images with a simple loop
urls=(
    "https://via.placeholder.com/100 red.png"
    "https://via.placeholder.com/100/blue.png blue.png"
    "https://via.placeholder.com/100/green.png green.png"
)

for item in "${urls[@]}"; do
    url=$(echo $item | cut -d' ' -f1)
    filename=$(echo $item | cut -d' ' -f2)
    ./fetch_media.sh $url $filename
done