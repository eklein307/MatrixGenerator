import json
from http.server import BaseHTTPRequestHandler, HTTPServer
BAD = open('reply_bad.txt').read(); GOOD = open('reply_good.txt').read()
class H(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def cors(self):
        for k,v in [("Access-Control-Allow-Origin","*"),("Access-Control-Allow-Headers","*"),("Access-Control-Allow-Methods","*")]: self.send_header(k,v)
    def do_OPTIONS(self): self.send_response(200); self.cors(); self.end_headers()
    def do_POST(self):
        body=json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        n=sum(1 for m in body["messages"] if m["role"]=="user")
        last=body["messages"][-1]["content"]
        print("call: user msgs", n, "| last starts:", last[:60].replace("\n"," "), flush=True)
        c = BAD if n==1 else GOOD
        b=json.dumps({"choices":[{"message":{"role":"assistant","content":c}}]}).encode()
        self.send_response(200); self.cors(); self.send_header("Content-Type","application/json"); self.end_headers(); self.wfile.write(b)
HTTPServer(("127.0.0.1",8703),H).serve_forever()
