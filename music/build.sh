#!/bin/sh
# builds the single-file app: index.html
cd "$(dirname "$0")"
{
  printf '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n<meta name="theme-color" content="#16171a">\n<title>Nautic Music</title>\n<link rel="icon" href="icons/music-192.png">\n<style>\n'
  cat src/style.css
  printf '</style></head><body>\n'
  cat src/body.html
  printf '<script>\n'
  for f in src/js/*.js; do cat "$f"; printf '\n'; done
  printf '</script></body></html>\n'
} > index.html
