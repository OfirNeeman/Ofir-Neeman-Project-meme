# client_proxy.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import socket
import json
import struct
import json

from server.server import OPCODE_CREATE_ROOM

    
app = Flask(__name__)
CORS(app)

SERVER_IP = '127.0.0.1'
SERVER_PORT = 5001

import struct

def send_tcp_custom_protocol(opcode, payload):
    """שליחת הודעה עם OpCode כחלק מפרוטוקול מותאם"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.connect((SERVER_IP, SERVER_PORT))
        
        message_bytes = json.dumps(payload).encode('utf-8')
        
        # אריזת ה-Header: אורך ההודעה + קוד הפעולה
        header = struct.pack('>IH', len(message_bytes), opcode)
        s.sendall(header + message_bytes)
        
        # קבלת תשובה לפי אותו פורמט
        raw_header = recvall(s, 6)
        if not raw_header:
            return {"error": "protocol mismatch"}
            
        res_len, res_opcode = struct.unpack('>IH', raw_header)
        res_data = recvall(s, res_len)
        return json.loads(res_data.decode('utf-8'))

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
    data = request.json
    
    # שליחה עם השם החדש וקביעת OpCode ברירת מחדל (למשל 101)
    # את יכולה להוסיף לוגיקה שקובעת את ה-opcode לפי התוכן של data
    opcode = data.get('opcode', 101) 
    
    try:
        # עדכון השורה שגרמה לשגיאה:
        response = send_tcp_custom_protocol(opcode, data)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=4001) # ה-React ידבר עם פורט 4001