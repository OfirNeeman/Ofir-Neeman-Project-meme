# client_proxy.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import socket
import json
import struct
import json

    
app = Flask(__name__)
CORS(app)

SERVER_IP = '127.0.0.1'
SERVER_PORT = 5001

import struct

def send_tcp_message(payload):
    """פונקציה שפותחת סוקט TCP עם פרוטוקול אורך-תוכן"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.connect((SERVER_IP, SERVER_PORT))
        
        # הפיכת ה-JSON לבתים
        message = json.dumps(payload).encode('utf-8')
        # אריזה: 4 בתים של אורך + תוכן ההודעה
        msg = struct.pack('>I', len(message)) + message
        s.sendall(msg)
        
        # קבלת תשובה מהשרת לפי אותו פרוטוקול
        raw_msglen = recvall(s, 4)
        if not raw_msglen:
            return {"error": "no response"}
        msglen = struct.unpack('>I', raw_msglen)[0]
        
        data = recvall(s, msglen)
        return json.loads(data.decode('utf-8'))

def recvall(sock, n):
    # (אותה פונקציית עזר מהשרת)
    data = bytearray()
    while len(data) < n:
        packet = sock.recv(n - len(data))
        if not packet: return None
        data.extend(packet)
    return data

@app.route('/proxy', methods=['POST'])
def proxy():
    # ה-React שולח לכאן בקשה
    data = request.json
    # המתווך מעביר אותה ב-TCP לשרת הראשי
    response = send_tcp_message(data)
    return jsonify(response)

if __name__ == "__main__":
    app.run(port=4001) # ה-React ידבר עם פורט 4001