import json
import socket
import struct
from flask import Flask, jsonify, request
from flask_cors import CORS


app = Flask(__name__)
CORS(app)  # מאפשר ל-React לתקשר עם ה-Proxy בלי חסימות דפדפן

# הגדרות יעד - לאן ה-Proxy צריך להעביר את הודעות ה-TCP
SERVER_IP = '127.0.0.1'
SERVER_PORT = 5001


def recvall(sock: socket.socket, n: int) -> bytearray:
    """
    פונקציית עזר המבטיחה קריאה מלאה של n בתים מתוך ה-Socket (מונעת קטיעת הודעות).
    
    :param sock: אובייקט ה-Socket של השרת.
    :param n: מספר הבתים המדויק שיש לקרוא.
    :return: מערך בתים (bytearray) או None אם החיבור נסגר.
    """
    data = bytearray()
    while len(data) < n:
        packet = sock.recv(n - len(data))
        if not packet:
            return None
        data.extend(packet)
    return data


def send_tcp_custom_protocol(opcode: int, payload: dict) -> dict:
    """
    פותחת חיבור TCP זמני לשרת הראשי, אורזת את המידע לפי חוקי הפרוטוקול המותאם
    (Header של 6 בתים + Payload), שולחת אותו ומחזירה את תשובת השרת המפוענחת.
    
    :param opcode: קוד הפעולה לפרוטוקול (למשל 101, 102).
    :param payload: מילון הנתונים (הטקסט/הודעה) שיש לשלוח.
    :return: מילון (Dictionary) עם תשובת השרת, או הודעת שגיאה.
    """
    # שימוש ב-with סוגר את ה-socket אוטומטית בסיום הפעולה
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.connect((SERVER_IP, SERVER_PORT))
        
        # הפיכת המידע לטקסט JSON מבוסס בתים
        message_bytes = json.dumps(payload).encode('utf-8')
        
        # אריזת ה-Header במבנה Big-Endian: 
        # I (אורך ההודעה - 4 בתים), H (קוד הפעולה OpCode - שני בתים)
        header = struct.pack('>IH', len(message_bytes), opcode)
        
        # שליחת ה-Header והתוכן יחד במכה אחת
        s.sendall(header + message_bytes)
        
        # --- קבלת התשובה מהשרת לפי אותו פורמט בדיוק ---
        raw_header = recvall(s, 6)
        if not raw_header:
            return {"error": "protocol mismatch or empty response"}
            
        # פירוק ה-Header של התשובה
        res_len, res_opcode = struct.unpack('>IH', raw_header)
        
        # קריאת תוכן התשובה המלא לפי האורך שהתקבל
        res_data = recvall(s, res_len)
        if not res_data:
            return {"error": "failed to read response payload"}
            
        # פיענוח ה-JSON והחזרתו כמשתנה Python
        return json.loads(res_data.decode('utf-8'))


@app.route('/proxy', methods=['POST'])
def proxy():
    """
    נתיב HTTP POST המשמש כגשר עבור ה-Frontend (React).
    הנתיב מקבל בקשת HTTP רגילה, שולף מתוכה את ה-OpCode (ברירת מחדל 101),
    ומעביר את הבקשה כחבילת TCP פרוטוקול אל השרת הראשי.
    """
    data = request.json
    if not data:
        return jsonify({"error": "Missing request body"}), 400
    
    # שליפת ה-opcode מתוך הבקשה. אם ה-React לא שלח, נניח ברירת מחדל 101 (יצירת חדר)
    opcode = data.get('opcode', 101) 
    
    try:
        # שליחת הנתונים דרך פונקציית ה-TCP
        response = send_tcp_custom_protocol(opcode, data)
        
        # החזרת התשובה של שרת ה-TCP חזרה ל-React כ-HTTP JSON רגיל
        return jsonify(response), 200
        
    except Exception as e:
        # טיפול בשגיאות תקשורת (למשל אם שרת ה-TCP כבוי)
        return jsonify({"error": f"Proxy failed to communicate with TCP server: {str(e)}"}), 500


if __name__ == "__main__":
    # הרצת שרת ה-Proxy בפורט 4001
    print("[*] Client Proxy Server running on port 4001...")
    app.run(host='0.0.0.0', port=4001, debug=True)