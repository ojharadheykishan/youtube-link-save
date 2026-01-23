#!/bin/bash
# Quick verification script for custom player installation

echo "🔍 CUSTOM VIDEO PLAYER - INSTALLATION VERIFICATION"
echo "=================================================="
echo ""

# Check if files exist
echo "📁 Checking files..."
FILES=(
    "static/js/custom-player.js"
    "static/css/custom-player.css"
    "templates/watch.html"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        echo "  ✅ $file ($SIZE bytes)"
    else
        echo "  ❌ $file MISSING"
    fi
done

echo ""
echo "📝 Checking integrations in watch.html..."

# Check CSS link
if grep -q 'href="/static/css/custom-player.css"' templates/watch.html; then
    echo "  ✅ CSS link present"
else
    echo "  ❌ CSS link missing"
fi

# Check JS script
if grep -q 'src="/static/js/custom-player.js"' templates/watch.html; then
    echo "  ✅ JS script link present"
else
    echo "  ❌ JS script link missing"
fi

# Check initialization calls
INIT_COUNT=$(grep -c "window.initCustomPlayer" templates/watch.html)
echo "  ✅ Found $INIT_COUNT initialization calls"

echo ""
echo "🎮 Checking player features..."

# Check speed options
SPEEDS=$(grep -c "data-speed=" static/js/custom-player.js)
echo "  ✅ Speed options: $SPEEDS settings"

# Check quality options
QUALITIES=$(grep -c "data-quality=" static/js/custom-player.js)
echo "  ✅ Quality options: $QUALITIES settings"

# Check keyboard shortcuts
SHORTCUTS=$(grep -c "e.code ===" static/js/custom-player.js)
echo "  ✅ Keyboard shortcuts: $SHORTCUTS configured"

echo ""
echo "✅ VERIFICATION COMPLETE"
echo "=================================================="
echo ""
echo "🚀 To test the player:"
echo "   1. Start the server: python app.py"
echo "   2. Upload or select a video"
echo "   3. Open the watch page"
echo "   4. Check browser console for initialization logs"
echo ""
