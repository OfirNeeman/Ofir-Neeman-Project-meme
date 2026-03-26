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
import jwt
import datetime
from functools import wraps
from cryptography.fernet import Fernet

# הגדרת הנתיב המדויק לקובץ ה-env שלך
# אם הקובץ בתיקיית server ושמו server.env:
env_path = Path('.env')
load_dotenv(dotenv_path=env_path)
FERNET_KEY = os.getenv("FERNET_KEY")
fernet = Fernet(FERNET_KEY)
GIPHY_API_KEY = os.getenv("GIPHY_API_KEY")
room_image_index = {}
PORT = 4000
UPLOADS_DIR = 'uploads'
# בדיקה קריטית - אם זה מדפיס None, המפתח עדיין לא נטען
print(f"Checking API Key: {GIPHY_API_KEY}")
# הגדרות TCP
TCP_IP = '0.0.0.0'
TCP_PORT = 5001

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your_fallback_secret_key")
def get_decrypted_image(file_path):
    with open(file_path, "rb") as f:
        encrypted_content = f.read()
    return fernet.decrypt(encrypted_content)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            # הסרת המילה Bearer אם היא קיימת
            if "Bearer " in token:
                token = token.split(" ")[1]
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            # כאן אפשר להוסיף ל-kwargs את ה-room_code או ה-player_id מהטוקן
        except Exception as e:
            return jsonify({'message': 'Token is invalid!', 'error': str(e)}), 401
        return f(*args, **kwargs)
    return decorated


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
app = Flask(__name__)
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,ngrok-skip-browser-warning'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    return response

MY_CATEGORIES = ['actions', 'vine', 'bright', 'emotions', 'the office', 'breaking bad', 'dance moms', 'brooklyn 99', 'כאן 11']
@app.route('/login-room', methods=['POST'])
def login_room():
    auth_data = request.json
    room_code = auth_data.get('roomCode')
    player_id = auth_data.get('playerId')
    
    if not room_code or not player_id:
        return jsonify({"message": "Missing details"}), 400

    # יצירת טוקן שתקף ל-24 שעות
    token = jwt.encode({
        'room_code': room_code,
        'player_id': player_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, SECRET_KEY, algorithm="HS256")

    return jsonify({'token': token})
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
            gif_data = requests.get(gif_url).content
            encrypted_gif = fernet.encrypt(gif_data)
            filename = os.path.join(target_dir, f"giphy_{i}.gif")
            with open(filename, "wb") as f:
                f.write(encrypted_gif)
                print(f"[V] Downloaded and ENCRYPTED GIF for: {chosen_tag}")
        except Exception as e:
                print(f"[!] Error: {e}")

# --- נתיב 1: יצירת תיקייה למשחק חדש ---
@app.route('/create-room-dir', methods=['POST'])
def create_room_dir():
    data = request.json
    room_code = data.get('roomCode')
    
    if not room_code:
        return jsonify({"error": "No room code provided"}), 400
    
    room_path = os.path.join(UPLOADS_DIR, room_code)
    room_image_index[room_code] = 0 # הוסף את זה בתוך create_room_dir
    try:
        if not os.path.exists(room_path):
            os.makedirs(room_path)
            # כשנוצר חדר, אנחנו ישר מושכים לו כמה GIFs שיהיו מוכנים בתיקייה שלו
            fetch_gifs_for_room(room_path, 3)
            return jsonify({"status": "success", "message": f"Room {room_code} created with GIFs"}), 201
        return jsonify({"status": "exists"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- נתיב 2: העלאת תמונה מהטלפון לתיקייה של החדר ---
@app.route('/upload/<room_code>', methods=['POST'])
@token_required
def upload_file(room_code):
    room_path = os.path.join(UPLOADS_DIR, room_code)
    
    # וודוא שהתיקייה קיימת (למקרה שהבקשה הגיעה לפני ה-create)
    if not os.path.exists(room_path):
        os.makedirs(room_path)

    if not request.data:
        return "No data", 400
    
    encrypted_data = fernet.encrypt(request.data)
    # שמירת הקובץ עם שם ייחודי
    filename = f"user_{random.randint(1000, 9999)}.jpg"
    file_path = os.path.join(room_path, filename)
    
    with open(file_path, "wb") as f:
        f.write(encrypted_data)
    
    print(f"[V] Image saved to room {room_code}: {filename}")
    return jsonify({"status": "success", "path": file_path}), 200

@app.route('/image_base64/<room_code>', methods=['GET'])
@token_required
def get_image_base64(room_code):
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

    decrypted_content = get_decrypted_image(latest_file)
    encoded = base64.b64encode(decrypted_content).decode("utf-8")
    
    return jsonify({"status": "success", "image": encoded})

@app.route('/next_image/<room_code>', methods=['GET'])
@token_required
def get_next_image(room_code):
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
    room_image_index[room_code] = current_index + 1

    try:
            # שימוש בפונקציית הפענוח שכבר כתבת
            decrypted_string = get_decrypted_image(image_path)
            encoded_string = base64.b64encode(decrypted_string).decode('utf-8')
            
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