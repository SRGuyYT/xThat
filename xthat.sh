#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

PID_FILE="$ROOT/.xthat.pid"
LOG_FILE="$ROOT/.xthat.log"
PORT=5000
HOSTNAME=0.0.0.0

load_port() {
  if [[ -f "$ROOT/.env" ]]; then
    local app_url
    app_url="$(grep -E '^APP_URL=' "$ROOT/.env" | tail -n 1 | cut -d= -f2- || true)"
    if [[ -n "${app_url:-}" ]]; then
      local hostport
      hostport="${app_url#*://}"
      hostport="${hostport%%/*}"
      if [[ "$hostport" == *:* ]]; then
        HOSTNAME="${hostport%%:*}"
        PORT="${hostport##*:}"
      else
        HOSTNAME="$hostport"
      fi
    fi
  fi
}

ensure_ready() {
  if [[ ! -d "$ROOT/node_modules" ]]; then
    echo "node_modules not found. Run npm install first."
    exit 1
  fi

  npm run db:init
}

is_running() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(cat "$PID_FILE")"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" 2>/dev/null
}

start_fg() {
  ensure_ready
  echo "Starting xThat in foreground on port $PORT..."
  PORT="$PORT" HOSTNAME="$HOSTNAME" npm run dev -- --hostname "$HOSTNAME" --port "$PORT"
}

start_bg() {
  ensure_ready
  if is_running; then
    status
    return 0
  fi

  echo "Starting xThat in background on port $PORT..."
  PORT="$PORT" HOSTNAME="$HOSTNAME" nohup npm run dev -- --hostname "$HOSTNAME" --port "$PORT" >>"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 1
  status
}

stop_server() {
  if ! is_running; then
    echo "xThat is not running."
    rm -f "$PID_FILE"
    return 0
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  echo "Stopping xThat process $pid..."
  kill "$pid" 2>/dev/null || true

  for _ in {1..20}; do
    if ! kill -0 "$pid" 2>/dev/null; then
      break
    fi
    sleep 0.5
  done

  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true
  fi

  rm -f "$PID_FILE"
  echo "Stopped."
}

status() {
  if ! is_running; then
    echo "xThat is not running."
    return 1
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  echo "xThat is running on http://localhost:$PORT with PID $pid."
  echo "Log file: $LOG_FILE"
}

restart() {
  stop_server
  start_bg
}

interactive_menu() {
  while true; do
    cat <<EOF

xThat Launcher
1. Start in foreground
2. Start in background
3. Stop background server
4. Status
5. Open app URL
6. Exit

EOF
    read -r -p "Choose an option [1-6]: " choice

    case "$choice" in
      1) start_fg ;;
      2) start_bg ;;
      3) stop_server ;;
      4) status || true ;;
      5)
        local app_url
        app_url="$(grep -E '^APP_URL=' "$ROOT/.env" 2>/dev/null | tail -n 1 | cut -d= -f2-)"
        app_url="${app_url:-http://localhost:$PORT}"
        if command -v xdg-open >/dev/null 2>&1; then
          xdg-open "$app_url" >/dev/null 2>&1 || true
        elif command -v open >/dev/null 2>&1; then
          open "$app_url" >/dev/null 2>&1 || true
        else
          echo "Open this URL manually: $app_url"
        fi
        ;;
      6) exit 0 ;;
      *) echo "Invalid choice." ;;
    esac
  done
}

usage() {
  cat <<'EOF'
Usage: ./xthat.sh <start|start-bg|stop|status|restart>
  start     Run in the current shell
  start-bg  Run in the background and write .xthat.pid + .xthat.log
  stop      Stop the background server
  status    Show background server status
  restart   Restart the background server
EOF
}

load_port

case "${1:-}" in
  "") interactive_menu ;;
  start) start_fg ;;
  start-bg) start_bg ;;
  stop) stop_server ;;
  status) status ;;
  restart) restart ;;
  *) usage; exit 1 ;;
esac
