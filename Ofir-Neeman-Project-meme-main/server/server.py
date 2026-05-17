import base64
import hashlib
import json
import os
from pathlib import Path
import random
import shutil
import socket
import struct
import threading
import urllib.request

# ספריות צד שלישי (Third-party packages)
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import bcrypt
import dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import hmac

# ==========================================
# הגדרות קבועות ומשתני סביבה (Configuration)
# ==========================================

# אופקודים (OpCodes) עבור פרוטוקול ה-TCP המותאם
OPCODE_CREATE_ROOM = 101
OPCODE_DELETE_ROOM = 102
OPCODE_ENCRYPT_DATA = 201

# טעינת משתני סביבה מקובץ server.env
ENV_PATH = Path('server') / 'server.env' 
dotenv.load_dotenv(dotenv_path=ENV_PATH)

SECRET_KEY = os.getenv("SECRET_KEY")
GIPHY_API_KEY = os.getenv("GIPHY_API_KEY")
print(f"Checking API Key initialization: {GIPHY_API_KEY}")

# הגדרות רשת ותיקיות
PORT = 4000
UPLOADS_DIR = 'uploads'
TCP_IP = '0.0.0.0'
TCP_PORT = 5001

# אינדקס למעקב אחרי תמונות המשחק בחדרים
room_image_index = {}

# קטגוריות לשליפת GIFs מ-Giphy
MY_CATEGORIES = ['actions', 'vine', 'bright', 'emotions', 'the office', 'breaking bad', 'dance moms', 'brooklyn 99', 'כאן 11']

# ==========================================
# פונקציות אבטחה והצפנה (Security & Crypto)
# ==========================================

def hash_password(password: str, salt: str) -> str:
    pepper = SECRET_KEY

    # 1. SHA256 עם salt + pepper
    sha = hashlib.sha256((password + salt + pepper).encode()).hexdigest()

    # 2. bcrypt על התוצאה
    hashed = bcrypt.hashpw(sha.encode(), bcrypt.gensalt())

    return hashed.decode()


def verify_password(password: str, salt: str, stored_hash: str) -> bool:
    pepper = SECRET_KEY

    sha = hashlib.sha256((password + salt + pepper).encode()).hexdigest()
    return bcrypt.checkpw(sha.encode(), stored_hash.encode())

def decrypt_room_code(encrypted_code: str) -> str:
    """
    מפענחת קוד חדר מוצפן שהתקבל מהקליינט (React) בפורמט AES-CBC-256.
    אם הקוד קצר מדי או הפענוח נכשל, מניחה שהקוד הגיע לא מוצפן ומחזירה אותו כמו שהוא.
    
    :param encrypted_code: הקוד המוצפן בבסיס Base64 (או קוד גולמי).
    :return: קוד החדר המפוענח כמחרוזת טקסט.
    """
    if not encrypted_code or len(encrypted_code) < 10: 
        return encrypted_code 
    try:
        # גזירת מפתח באורך 32 בתים (SHA-256) מתוך ה-SECRET_KEY
        key = hashlib.sha256(SECRET_KEY.encode()).digest()
        raw = base64.b64decode(encrypted_code)
        
        iv = raw[:16]  # 16 הבתים הראשונים הם ה-Initialization Vector
        cipher = AES.new(key, AES.MODE_CBC, iv)
        
        decrypted = unpad(cipher.decrypt(raw[16:]), AES.block_size)
        return decrypted.decode('utf-8')
    except Exception as e:
        print(f"[!] Decryption failed, using raw code. Error: {e}")
        return encrypted_code

# ==========================================
# פונקציות ניהול קבצים וחדרים (File Management)
# ==========================================

def delete_room_folder(room_code: str):
    """
    מוחקת לחלוטין את תיקיית החדר (כולל כל התמונות וה-GIFs שבה) ומנקה את האינדקס.
    
    :param room_code: קוד החדר שאת התיקייה שלו יש למחוק.
    """
    room_folder = os.path.join(UPLOADS_DIR, room_code)
    print(f"[*] Attempting to delete: {room_folder}")
    
    try:
        if os.path.exists(room_folder):
            shutil.rmtree(room_folder)
            print(f"[X] Successfully deleted folder: {room_folder}")
        else:
            print(f"[!] Folder not found: {room_folder}")
        
        if room_code in room_image_index:
            del room_image_index[room_code]
    except Exception as e:
        print(f"[!] Error during deletion of room {room_code}: {e}")


def fetch_gifs_for_room(target_dir: str, limit: int = 3):
    """
    שולפת תמונות GIF אקראיות מתוך ה-API של Giphy לפי קטגוריות מוגדרות מראש,
    ושומרת אותן בתיקיית החדר הייעודית.
    
    :param target_dir: נתיב תיקיית החדר אליה ישמרו הקבצים.
    :param limit: כמות ה-GIFs להורדה (ברירת מחדל: 3).
    """
    if not GIPHY_API_KEY:
        print("[!] No GIPHY_API_KEY found in .env")
        return
    
    for i in range(limit):
        chosen_tag = random.choice(MY_CATEGORIES)
        url = f"https://api.giphy.com/v1/gifs/random?api_key={GIPHY_API_KEY}&tag={chosen_tag}&rating=g"
        try:
            res = requests.get(url).json()
            gif_url = res['data']['images']['fixed_height']['url']
            filename = os.path.join(target_dir, f"giphy_{i}.gif")
            
            # הורדה ושמירה פיזית של הקובץ בדיסק
            urllib.request.urlretrieve(gif_url, filename)
            print(f"[V] Downloaded GIF for category: {chosen_tag}")
        except Exception as e:
            print(f"[!] Error fetching GIF from Giphy: {e}")

# ==========================================
# תשתית שרת TCP Socket (Custom Protocol)
# ==========================================

def recvall(sock: socket.socket, n: int) -> bytearray:
    """
    פונקציית עזר המבטיחה קריאה מלאה של n בתים מתוך ה-Socket (מונעת קטיעת הודעות).
    
    :param sock: אובייקט ה-Socket של הלקוח.
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


def handle_tcp_client(conn: socket.socket, addr: tuple):
    """
    מטפלת בלקוח TCP שהתחבר בנפרד. קוראת את ה-Header (אורך + אופקוד),
    מפענחת את ה-Payload ומבצעת לוגיקה בהתאם לפרוטוקול.
    
    :param conn: אובייקט ה-Connection של הלקוח.
    :param addr: כתובת ה-IP והפורט של הלקוח.
    """
    try:
        # 1. קריאת Header קבוע (6 בתים: 4 לאורך ההודעה + 2 לסוג הפעולה/OpCode)
        raw_header = recvall(conn, 6)
        if not raw_header:
            return
        
        # פירוק ה-Header במבנה Big-Endian: I (unsigned int, 4 bytes), H (unsigned short, 2 bytes)
        msglen, opcode = struct.unpack('>IH', raw_header)

        # 2. קריאת ה-Payload (תוכן ההודעה בפורמט JSON)
        data = recvall(conn, msglen)
        if data:
            message = json.loads(data.decode('utf-8'))
            print(f"Received TCP OpCode {opcode}: {message}")
            
            response_payload = {}

            # 3. מכונת מצבים (State Machine) של פרוטוקול ה-TCP
            if opcode == OPCODE_CREATE_ROOM:
                response_payload = {"status": "room_created", "details": "success"}
            elif opcode == OPCODE_DELETE_ROOM:
                room_code = message.get("roomCode")
                delete_room_folder(room_code)
                response_payload = {"status": "deleted", "room": room_code}
            else:
                response_payload = {"status": "unknown_opcode"}

            # 4. שליחת תשובה חזרה במבנה הפרוטוקול (Header + Payload)
            resp_bytes = json.dumps(response_payload).encode('utf-8')
            header = struct.pack('>IH', len(resp_bytes), opcode)
            conn.sendall(header + resp_bytes)
            
    except Exception as e:
        print(f"TCP Protocol Error: {e}")
    finally:
        conn.close()


def start_tcp_server():
    """
    מאתחלת את שרת ה-TCP Socket ומאזינה לחיבורים נכנסים בלולאה אינסופית.
    כל לקוח חדש מועבר ל-Thread נפרד.
    """
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((TCP_IP, TCP_PORT))
    server.listen(5)
    print(f"[*] TCP Socket Server listening on port {TCP_PORT}")
    
    while True:
        conn, addr = server.accept()
        # הפעלת תהליכון (Thread) ייעודי לטיפול בלקוח במקביל לשרת
        threading.Thread(target=handle_tcp_client, args=(conn, addr)).start()


# הפעלת שרת ה-TCP ב-Thread רקע (Daemon) כדי שלא יחסום את Flask
threading.Thread(target=start_tcp_server, daemon=True).start()

# ==========================================
# תשתית שרת Flask Web API (HTTP)
# ==========================================

app = Flask(__name__)
CORS(app)  # פתיחת חסימות CORS לאפשר עבודה מול React/Mobile


@app.route('/create-room-dir', methods=['POST'])
def create_room_dir():
    """
    נתיב ליצירת תיקיית חדר חדש. 
    מקבל קוד חדר מוצפן, מפענח אותו, מייצר תיקייה ומוריד לתוכה GIFs מ-Giphy.
    """
    data = request.json
    encrypted_code = data.get('roomCode')
    room_code = decrypt_room_code(encrypted_code)
    
    if not room_code:
        return jsonify({"error": "Invalid room code"}), 400
    
    room_path = os.path.join(UPLOADS_DIR, room_code)
    room_image_index[room_code] = 0  # איפוס מדד התמונות עבור החדר
    
    try:
        if not os.path.exists(room_path):
            os.makedirs(room_path)
            fetch_gifs_for_room(room_path, 3)
            return jsonify({"status": "success", "room": room_code}), 201
        return jsonify({"status": "exists"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/hash-password', methods=['POST'])
def hash_password_endpoint():
    """
    נתיב המייצר מלח (Salt) אקראי ומחזיר סיסמה מגובבת (Hashed) לטובת שמירה ב-DB.
    """
    data = request.json
    password = data.get('password')
    if not password:
        return jsonify({"error": "Missing password"}), 400
    
    salt = hashlib.sha256(os.urandom(32)).hexdigest()[:16]
    hashed = hash_password(password, salt)
    
    return jsonify({"hash": f"{salt}:{hashed}"})


@app.route('/verify-password', methods=['POST'])
def verify_password_endpoint():
    data = request.json
    password = data.get('password')
    stored = data.get('stored_hash')

    salt, original_hash = stored.split(":", 1)

    match = verify_password(password, salt, original_hash)

    return jsonify({"match": match})

@app.route('/upload/<room_code>', methods=['POST'])
def upload_file(room_code):
    """
    נתיב לקבלת קובץ תמונה (בבינארי גולמי מ-HTTP Request Body) ושמירתו בתיקיית החדר.
    """
    room_code = decrypt_room_code(room_code)
    room_path = os.path.join(UPLOADS_DIR, room_code)
    
    if not os.path.exists(room_path):
        os.makedirs(room_path)

    if not request.data:
        return "No data received", 400

    # יצירת שם קובץ רנדומלי למניעת דריסת קבצים
    filename = f"user_{random.randint(1000, 9999)}.jpg"
    file_path = os.path.join(room_path, filename)
    
    with open(file_path, "wb") as f:
        f.write(request.data)
    
    print(f"[V] Image saved to room {room_code}: {filename}")
    return jsonify({"status": "success", "path": file_path}), 200

@app.route('/next_image/<room_code>', methods=['GET'])
def get_next_image(room_code):
    """
    מנהל את שלבי המשחק ומחזיר בכל קריאה את התמונה הבאה בתור (במבנה סדור).
    במידה ונגמרו התמונות, מחזיר סטטוס game_over.
    """
    room_code = decrypt_room_code(room_code)
    room_folder = os.path.join(UPLOADS_DIR, room_code)
    if not os.path.exists(room_folder):
        return jsonify({"error": "Room not found"}), 404

    # סינון קבצים ומיון אלפביתי כדי להבטיח סדר קבוע
    images = sorted([f for f in os.listdir(room_folder) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))])
    
    if not images:
        return jsonify({"error": "No images in folder", "image": None}), 404

    current_index = room_image_index.get(room_code, 0)
    
    # בדיקה האם הגענו לסוף רשימת התמונות (המשחק נגמר)
    if current_index >= len(images):
        return jsonify({
            "status": "game_over",
            "image": None,
            "message": "No more images"
        }), 200

    image_name = images[current_index]
    image_path = os.path.join(room_folder, image_name)

    # קידום האינדקס ב-1 עבור הסיבוב הבא
    room_image_index[room_code] = current_index + 1

    try:
        with open(image_path, "rb") as img_file:
            encoded_string = base64.b64encode(img_file.read()).decode('utf-8')
        
        return jsonify({
            "image": encoded_string,
            "image_name": image_name,
            "current_round": current_index + 1,
            "total_images": len(images)
        })
    except Exception as e:
        return jsonify({"error": str(e), "image": None}), 500


@app.route('/delete-room-dir/<room_code>', methods=['POST', 'DELETE'])
def handle_delete_room(room_code):
    """
    נתיב HTTP המאפשר מחיקה וניקוי חדר מה-Frontend (תומך גם ב-POST וגם ב-DELETE).
    """
    room_code = decrypt_room_code(room_code)
    delete_room_folder(room_code)
    return jsonify({"status": "success", "message": f"Room {room_code} cleaned up"}), 200


# ==========================================
# הרצת שרת ה-Flask API המרכזי
# ==========================================
if __name__ == "__main__":
    # הרצת השרת על הכתובת הלוקאלית והפורט המוגדר (Debug=True מאפשר טעינה מחדש בשינויי קוד)
    app.run(host='0.0.0.0', port=PORT, debug=True)