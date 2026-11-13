# Local server for the presentation (no caching, so edits show up on reload).
import http.server, functools, os, sys
root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(H, directory=root)).serve_forever()
