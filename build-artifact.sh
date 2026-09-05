#!/bin/sh
# アーティファクト用：外側の <!doctype>/<html>/<head>/<body> を外した版を作る
cd "$(dirname "$0")"
sed -e '/^<!doctype html>$/d' -e '/^<html lang="ja">$/d' -e '/^<head>$/d' \
    -e '/^<meta charset="utf-8">$/d' -e '/^<meta name="viewport"/d' \
    -e '/^<\/head>$/d' -e '/^<body>$/d' -e '/^<\/body>$/d' -e '/^<\/html>$/d' \
    kaerimichi.html > kaerimichi-artifact.html
echo "built kaerimichi-artifact.html ($(wc -c < kaerimichi-artifact.html) bytes)"
