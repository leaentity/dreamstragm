"""本地静态预览；只提供前端白名单，不暴露 .git、文档或环境变量。"""
import os
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
ROOT = Path(__file__).resolve().parent.parent
FILES = {'index.html': 'text/html', 'app.js': 'text/javascript', 'assistant-motion.js': 'text/javascript', 'assets/assistant-motion-v1.png': 'image/png', 'assets/assistant-doodles-v1.png': 'image/png', 'storage.js': 'text/javascript', 'i18n.js': 'text/javascript', 'tidy.js': 'text/javascript', 'ambient.js': 'text/javascript', 'style.css': 'text/css', 'preview.png': 'image/png', 'assets/dream-assistant.png': 'image/png', 'assets/dream-assistant-spritesheet.png': 'image/png', 'assets/dream-assistant-full-body-v2.png': 'image/png', **{f'assets/figma/{name}.svg': 'image/svg+xml' for name in ['door','profile','mic','voice-oval','write-underline','journal','explore','circle','active-mark','arrow-down']}, **{f'assets/fonts/Gaegu-{weight}.ttf': 'font/ttf' for weight in ['Light','Regular']}}
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        name = urlparse(self.path).path.lstrip('/') or 'index.html'
        if name not in FILES:
            self.send_error(404)
            return
        try:
            data = (ROOT / name).read_bytes()
        except OSError:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header('Content-Type', FILES[name] + '; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)
    def log_message(self, *args):
        pass
if __name__ == '__main__':
    port = int(os.environ.get('PORT', '5174'))
    print(f'Dreamstragm: http://localhost:{port}/', flush=True)
    try:
        ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
    except KeyboardInterrupt:
        pass
