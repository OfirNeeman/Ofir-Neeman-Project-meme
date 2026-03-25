# client_proxy.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import socket
import json

app = Flask(__name__)
CORS(app)

SERVER_IP = '127.0.0.1'
SERVER_PORT = 5001

def send_tcp_message(payload):
    """פונקציה שפותחת סוקט TCP אמיתי מול השרת"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.connect((SERVER_IP, SERVER_PORT))
        s.sendall(json.dumps(payload).encode('utf-8'))
        data = s.recv(4096)
        return json.loads(data.decode('utf-8'))

@app.route('/proxy', methods=['POST'])
def proxy():
    # ה-React שולח לכאן בקשה
    data = request.json
    # המתווך מעביר אותה ב-TCP לשרת הראשי
    response = send_tcp_message(data)
    return jsonify(response)

if __name__ == "__main__":
    app.run(port=4001, ssl_context=("cert.pem", "key.pem")) # ה-React ידבר עם פורט 4001