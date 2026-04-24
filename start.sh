#!/bin/bash

# Получаем папку, где лежит этот скрипт
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Установка зависимостей ==="

echo "Backend..."
cd "$SCRIPT_DIR/backend" && npm install
if [ $? -ne 0 ]; then
  echo "ОШИБКА: не удалось установить backend"
  exit 1
fi

echo "Frontend..."
cd "$SCRIPT_DIR/frontend" && npm install
if [ $? -ne 0 ]; then
  echo "ОШИБКА: не удалось установить frontend"
  exit 1
fi

echo ""
echo "=== Запуск ==="
echo ""
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Администратор: admin@company.com / Admin123456"
echo ""

# Запускаем backend
cd "$SCRIPT_DIR/backend" && npm run dev &
BACKEND_PID=$!

sleep 3

# Запускаем frontend
cd "$SCRIPT_DIR/frontend" && npm run dev &
FRONTEND_PID=$!

sleep 4

# Открываем браузер
if which xdg-open > /dev/null 2>&1; then
  xdg-open http://localhost:3000
elif which open > /dev/null 2>&1; then
  open http://localhost:3000
fi

echo "Нажмите Ctrl+C для остановки"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
