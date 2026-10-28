#!/bin/bash
cd "$(dirname "$0")"

echo "🎲 Запуск оновленої гри «Хроніки Майстра: Корона Чорної Зірки»..."

if command -v npm >/dev/null 2>&1; then
  if [ ! -d "node_modules" ]; then
    echo "📦 Встановлення залежностей (перший запуск)..."
    npm install --legacy-peer-deps
  fi
  echo "🚀 Запуск гри у браузері на http://localhost:8080..."
  (sleep 2 && open "http://localhost:8080") &
  npm run dev
else
  echo "Node.js/npm не знайдено, відкриваємо статичний сервер..."
  PORT=8765
  open "http://localhost:$PORT" &
  python3 -m http.server $PORT
fi
