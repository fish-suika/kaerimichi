#!/bin/sh
# 分割ソースを1枚のHTMLに結合する
cd "$(dirname "$0")"
cat src/00-head.html src/10-tex.js src/20-snd.js src/30-core.js src/40-world.js src/50-room.js src/60-player.js src/65-touch.js src/70-story.js src/90-boot.js src/99-tail.html > kaerimichi.html
cp kaerimichi.html index.html          # GitHub Pages はルートの index.html を配信する
echo "built kaerimichi.html + index.html ($(wc -c < kaerimichi.html) bytes)"
