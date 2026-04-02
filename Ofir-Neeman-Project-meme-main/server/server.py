import os
import random
import requests
import urllib.request
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import socket
import threading
import json
import base64
import os
from dotenv import load_dotenv
from pathlib import Path
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import base64
import hashlib
import bcrypt

# הגדרת הנתיב המדויק לקובץ ה-env שלך
# אם הקובץ בתיקיית server ושמו server.env:
env_path = Path('server') / 'server.env' 
load_dotenv(dotenv_path=env_path)
SECRET_KEY = os.getenv("SECRET_KEY")
GIPHY_API_KEY = os.getenv("GIPHY_API_KEY")
room_image_index = {}
PORT = 4000
UPLOADS_DIR = 'uploads'
# בדיקה קריטית - אם זה מדפיס None, המפתח עדיין לא נטען
print(f"Checking API Key: {GIPHY_API_KEY}")
# הגדרות TCP
TCP_IP = '0.0.0.0'
TCP_PORT = 5001

def hash_password(password, salt):
    # ה-Pepper נלקח ממשתני הסביבה ולא נשמר ב-DB
    pepper = os.getenv("SECRET_KEY") 
    if not pepper:
        raise ValueError("No SECRET_KEY found in environment variables!")
        
    combined = password + salt + pepper
    return hashlib.sha256(combined.encode()).hexdigest()

def verify_password(password, hashed):
    pepper = SECRET_KEY.encode()
    return bcrypt.checkpw(password.encode() + pepper, hashed.encode())

def decrypt_room_code(encrypted_code):
    if not encrypted_code or len(encrypted_code) < 10: # הגנה מפני קודים קצרים מדי או לא מוצפנים
        return encrypted_code 
    try:
        # יצירת מפתח באורך 32 בתים מתוך ה-SECRET_KEY
        key = hashlib.sha256(SECRET_KEY.encode()).digest()
        raw = base64.b64decode(encrypted_code)
        
        iv = raw[:16]
        cipher = AES.new(key, AES.MODE_CBC, iv)
        
        decrypted = unpad(cipher.decrypt(raw[16:]), AES.block_size)
        return decrypted.decode('utf-8')
    except Exception as e:
        # אם הפענוח נכשל, נניח שהקוד הגיע לא מוצפן ונחזיר אותו כמות שהוא
        return encrypted_code

def handle_tcp_client(conn, addr):
    try:
        data = conn.recv(4096)
        if data:
            message = json.loads(data.decode('utf-8'))
            print(f"Received TCP: {message}")
            response = {"status": "ok", "action": message.get("action")}
            conn.sendall(json.dumps(response).encode('utf-8'))
    except Exception as e:
        print(f"TCP Error: {e}")
    finally:
        conn.close() # חשוב לסגור את החיבור בכל פעם

def start_tcp_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((TCP_IP, TCP_PORT))
    server.listen(5)
    print(f"[*] שרת TCP Socket מאזין בפורט {TCP_PORT}")
    while True:
        conn, addr = server.accept()
        threading.Thread(target=handle_tcp_client, args=(conn, addr)).start()

# הפעלה ב-Thread נפרד כדי ש-Flask ימשיך לעבוד
threading.Thread(target=start_tcp_server, daemon=True).start()

# טעינת הגדרות


app = Flask(__name__)
CORS(app) # מאפשר ל-React לתקשר עם השרת בלי חסימות דפדפן

MY_CATEGORIES = ['actions', 'vine', 'bright', 'emotions', 'the office', 'breaking bad', 'dance moms', 'brooklyn 99', 'כאן 11']

def init_uploads_dir():
    if not os.path.exists(UPLOADS_DIR):
        os.makedirs(UPLOADS_DIR)
    print(f"[*] Folder {UPLOADS_DIR} is ready.")

def fetch_gifs_for_room(target_dir, limit=3):
    """מושך GIFs מ-Giphy ושומר אותם בתיקייה ספציפית"""
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
            urllib.request.urlretrieve(gif_url, filename)
            print(f"[V] Downloaded GIF for category: {chosen_tag}")
        except Exception as e:
            print(f"[!] Error fetching GIF: {e}")

# --- נתיב 1: יצירת תיקייה למשחק חדש ---
@app.route('/create-room-dir', methods=['POST'])
def create_room_dir():
    data = request.json
    # כאן אנחנו מצפים לקוד מוצפן מה-React
    encrypted_code = data.get('roomCode')
    room_code = decrypt_room_code(encrypted_code)
    
    if not room_code:
        return jsonify({"error": "Invalid room code"}), 400
    
    room_path = os.path.join(UPLOADS_DIR, room_code)
    room_image_index[room_code] = 0 
    
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
    new_hash = hash_password(password, salt)
    
    # ← כאן
    print(f"stored: {stored}")
    print(f"salt: {salt}")
    print(f"new_hash: {new_hash}")
    print(f"original_hash: {original_hash}")
    print(f"match: {new_hash == original_hash}")
    
    return jsonify({"match": new_hash == original_hash})
# --- נתיב 2: העלאת תמונה מהטלפון לתיקייה של החדר ---
@app.route('/upload/<room_code>', methods=['POST'])
def upload_file(room_code):
    room_code = decrypt_room_code(room_code)
    room_path = os.path.join(UPLOADS_DIR, room_code)
    
    # וודוא שהתיקייה קיימת (למקרה שהבקשה הגיעה לפני ה-create)
    if not os.path.exists(room_path):
        os.makedirs(room_path)

    if not request.data:
        return "No data", 400

    # שמירת הקובץ עם שם ייחודי
    filename = f"user_{random.randint(1000, 9999)}.jpg"
    file_path = os.path.join(room_path, filename)
    
    with open(file_path, "wb") as f:
        f.write(request.data)
    
    print(f"[V] Image saved to room {room_code}: {filename}")
    return jsonify({"status": "success", "path": file_path}), 200

@app.route('/image_base64/<room_code>', methods=['GET'])
def get_image_base64(room_code):
    room_code = decrypt_room_code(room_code)
    room_path = os.path.join(UPLOADS_DIR, room_code)

    if not os.path.exists(room_path):
        return jsonify({"error": "Room not found"}), 404

    files = os.listdir(room_path)

    if not files:
        return jsonify({"error": "No images"}), 404

    latest_file = max(
        [os.path.join(room_path, f) for f in files],
        key=os.path.getctime
    )

    with open(latest_file, "rb") as img:
        encoded = base64.b64encode(img.read()).decode("utf-8")

    return jsonify({
        "status": "success",
        "image": encoded
    })

@app.route('/next_image/<room_code>', methods=['GET'])
def get_next_image(room_code):
    room_code = decrypt_room_code(room_code)
    room_folder = os.path.join(UPLOADS_DIR, room_code)
    if not os.path.exists(room_folder):
        return jsonify({"error": "Room not found"}), 404

    # סינון קבצים - מוודא שרק תמונות נכנסות לרשימה
    images = sorted([f for f in os.listdir(room_folder) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))])
    
    if not images:
        return jsonify({"error": "No images in folder", "image": None}), 404 # הוספת image: None

    # שליפת האינדקס הנוכחי
    current_index = room_image_index.get(room_code, 0)
    
    # בדיקה אם נגמרו התמונות
    if current_index >= len(images):
        # מחזירים תשובה מפורשת שאין יותר תמונה
        return jsonify({
            "status": "game_over",
            "image": None, # חשוב עבור ה-if (data.image) ב-React
            "message": "No more images"
        }), 200

    image_name = images[current_index]
    image_path = os.path.join(room_folder, image_name)

    # עדכון האינדקס לסיבוב הבא
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

if __name__ == "__main__":
    init_uploads_dir()
    # הרצת השרת - הפקודה הזו חייבת להיות אחרונה!
    app.run(host='0.0.0.0', port=PORT, debug=True)