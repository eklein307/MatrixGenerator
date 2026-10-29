import json, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
CORS = sys.argv[2] == "cors"
class H(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def hdr(self):
        if CORS:
            self.send_header("Access-Control-Allow-Origin","*")
            self.send_header("Access-Control-Allow-Headers","*")
            self.send_header("Access-Control-Allow-Methods","*")
    def do_OPTIONS(self):
        self.send_response(200); self.hdr(); self.end_headers()
    def send(self, obj, code=200):
        b=json.dumps(obj).encode(); self.send_response(code); self.hdr()
        self.send_header("Content-Type","application/json"); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        self.send({"data":[{"id":"gpt-oss-120b"},{"id":"claude-sonnet"}]})
    def do_POST(self):
        body=json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        rf=body.get("response_format")
        if not rf: c="OK"
        else: c=json.dumps({"step_type":"Ramp","duration":120,"tags":[{"tag":"temp_sp","value":60}]})
        self.send({"choices":[{"message":{"role":"assistant","content":c}}]})
HTTPServer(("127.0.0.1",int(sys.argv[1])),H).serve_forever()
