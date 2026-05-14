#!/bin/sh

# Video extraction script - extracts video portions based on START/END timestamps
# Loops through all timestamp_*.log files and extracts corresponding video portions
# Usage: sh scripts/extract-video-from-timestamps.sh [outputDir] [format] [startDelay]
# Formats: gif (default), mp4
# startDelay: seconds to add to START timestamp (default: 2)

VIDEO_DIR="cypress/videos"
OUTPUT_DIR="${1:-cypress/records}"
OUTPUT_FORMAT="${2:-gif}"
START_DELAY="${3:-2}"

FFMPEG_CMD=$(command -v ffmpeg 2>/dev/null || echo "/usr/bin/ffmpeg")

# Create output directory
rm -rf "$OUTPUT_DIR"/* 2>/dev/null
mkdir -p "$OUTPUT_DIR" || { echo "❌ Failed to create output directory"; exit 1; }

# Check if ffmpeg is available
[ -x "$FFMPEG_CMD" ] || { echo "❌ ffmpeg not found"; exit 1; }

echo "📁 Processing timestamp logs from cypress/timestamp/*.log"
echo ""

# Loop through all timestamp log files
for LOG_FILE in cypress/timestamp/*.log; do
  [ -f "$LOG_FILE" ] || continue
  
  TEST_NAME="${LOG_FILE##*/}"
  TEST_NAME="${TEST_NAME%.log}"
  
  echo "🎬 $TEST_NAME"
  
  VIDEO_FILE="$VIDEO_DIR/${TEST_NAME}.spec.ts.mp4"
  [ -f "$VIDEO_FILE" ] || { echo "  ⚠️  No video found"; echo ""; continue; }
  
  # Parse timestamps from log (get last/most recent, extract after ::)
  START_TIME=$(grep "^START::" "$LOG_FILE" | tail -1 | sed 's/^.*:://')
  END_TIME=$(grep "^END::" "$LOG_FILE" | tail -1 | sed 's/^.*:://')
  
  if [ -z "$START_TIME" ]; then echo "  ❌ START_TIME is missing"; fi
  if [ -z "$END_TIME" ]; then echo "  ❌ END_TIME is missing"; fi
  
  [ -n "$START_TIME" ] && [ -n "$END_TIME" ] || { echo "  ❌ Could not parse timestamps"; echo ""; continue; }
  
  # Get video file's modification time (when recording finished)
  VIDEO_MTIME=$(stat -c %Y "$VIDEO_FILE" 2>/dev/null || stat -f %m "$VIDEO_FILE" 2>/dev/null)
  
  # Get video duration from ffprobe
  FFPROBE_CMD=$(command -v ffprobe 2>/dev/null || echo "/usr/bin/ffprobe")
  VIDEO_DURATION=$($FFPROBE_CMD -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE" 2>/dev/null)
  
  [ -n "$VIDEO_MTIME" ] && [ -n "$VIDEO_DURATION" ] || { echo "  ❌ Could not get video info"; echo ""; continue; }
  
  # Calculate video start timestamp: VIDEO_MTIME - VIDEO_DURATION
  VIDEO_START_EPOCH=$(echo "$VIDEO_MTIME - $VIDEO_DURATION" | bc)
  
  # Convert test timestamps to epoch seconds
  START_EPOCH=$(date -d "$START_TIME" +%s.%N 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S.%fZ" "$START_TIME" +%s.000 2>/dev/null)
  END_EPOCH=$(date -d "$END_TIME" +%s.%N 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S.%fZ" "$END_TIME" +%s.000 2>/dev/null)
  
  [ -n "$START_EPOCH" ] && [ -n "$END_EPOCH" ] || { echo "  ❌ Could not convert timestamps"; echo ""; continue; }
  
  # Offset from actual video start to START timestamp (with configurable delay)
  OFFSET=$(echo "($START_EPOCH + $START_DELAY) - $VIDEO_START_EPOCH" | bc)
  
  OFFSET=$(printf "%.3f" "$OFFSET")
  DURATION=$(echo "$END_EPOCH - $START_EPOCH" | bc)
  DURATION=$(printf "%.3f" "$DURATION")
  
  [ "$(echo "$DURATION > 0" | bc)" = "1" ] || { echo "  ❌ Invalid duration"; echo ""; continue; }
  
  OUTPUT_PATH="$OUTPUT_DIR/${TEST_NAME}.$OUTPUT_FORMAT"
  
  if [ "$OUTPUT_FORMAT" = "mp4" ]; then
    CODEC_OPTS="-c:v libx264 -preset fast -c:a aac"
  elif [ "$OUTPUT_FORMAT" = "gif" ]; then
    CODEC_OPTS="-vf \"fps=25,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse\" -loop 0"
  else
    echo "  ❌ Unknown format"; echo ""; continue
  fi
  
  echo "  ✂️  Cutting $DURATION seconds at offset $OFFSET..."
  eval "$FFMPEG_CMD -i \"$VIDEO_FILE\" -ss $OFFSET -t $DURATION $CODEC_OPTS \"$OUTPUT_PATH\" -y" 2>/dev/null
  
  if [ -f "$OUTPUT_PATH" ]; then
    SIZE=$(stat -c %s "$OUTPUT_PATH" 2>/dev/null || stat -f %z "$OUTPUT_PATH" 2>/dev/null)
    echo "  ✓ Created: $(basename "$OUTPUT_PATH") (${SIZE} bytes)"
  else
    echo "  ❌ Failed"
  fi
  
  echo ""
done

# Calculate total size of all produced files
TOTAL_SIZE=$(du -sb "$OUTPUT_DIR" 2>/dev/null | awk '{print $1}')
TOTAL_MB=$(echo "scale=2; $TOTAL_SIZE / 1048576" | bc)

echo ""
echo "📊 Total size: ${TOTAL_MB} MB"
echo ""
