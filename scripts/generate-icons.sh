#!/bin/bash

# SVG를 PNG로 변환하는 스크립트
# ImageMagick이나 다른 도구를 사용할 수 있지만,
# 여기서는 브라우저를 통한 변환이나 온라인 도구 사용을 권장합니다.

echo "PWA 아이콘 생성 안내"
echo "====================="
echo ""
echo "public/icons/icon.svg 파일을 다음 크기로 변환해주세요:"
echo ""
echo "1. icon-192x192.png (192x192 픽셀)"
echo "2. icon-512x512.png (512x512 픽셀)"
echo ""
echo "변환 방법:"
echo "- 온라인: https://cloudconvert.com/svg-to-png"
echo "- Mac: 미리보기 앱에서 열기 > 파일 > 내보내기"
echo "- Linux: inkscape -w 192 -h 192 icon.svg -o icon-192x192.png"
echo ""
echo "또는 아래 명령어로 임시 아이콘 생성:"
echo "npm run generate-icons"
