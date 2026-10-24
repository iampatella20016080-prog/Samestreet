# 本機預覽伺服器：不讓瀏覽器快取 JS（改完程式重新整理就是新版），同時處理多個請求
# 用法：在「普社」資料夾執行  python serve.py   （Mac 是 python3 serve.py），再開 http://localhost:8123
import http.server, os, sys
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'game') if os.path.isdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'game')) else '.')
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
print(f'serving {os.getcwd()} at http://localhost:{port}')
http.server.ThreadingHTTPServer(('', port), H).serve_forever()
