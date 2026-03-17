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

# הגדרת הנתיב המדויק לקובץ ה-env שלך
# אם הקובץ בתיקיית server ושמו server.env:
env_path = Path('server') / 'server.env' 
load_dotenv(dotenv_path=env_path)

GIPHY_API_KEY = os.getenv("GIPHY_API_KEY")
room_image_index = {}
PORT = 4000
UPLOADS_DIR = 'uploads'
# בדיקה קריטית - אם זה מדפיס None, המפתח עדיין לא נטען
print(f"Checking API Key: {GIPHY_API_KEY}")
# הגדרות TCP
TCP_IP = '0.0.0.0'
TCP_PORT = 5001

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
    room_code = data.get('roomCode')
    
    if not room_code:
        return jsonify({"error": "No room code provided"}), 400
    
    room_path = os.path.join(UPLOADS_DIR, room_code)
    
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
def upload_file(room_code):
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
    # הנתיב לתיקיית התמונות של החדר הספציפי
    room_folder = os.path.join('uploads', room_code)
    
    if not os.path.exists(room_folder):
        return jsonify({"error": "Room folder not found"}), 404

    # רשימת כל הקבצים בתיקייה (מסונן רק לתמונות)
    images = sorted([f for f in os.listdir(room_folder) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))])

    if not images:
        return jsonify({"error": "No images in room"}), 404

    # עדכון האינדקס עבור החדר
    current_index = room_image_index.get(room_code, 0)
    
    # אם הגענו לסוף הרשימה, חוזרים להתחלה (או עוצרים, לפי בחירתך)
    if current_index >= len(images):
        current_index = 0
    
    image_name = images[current_index]
    image_path = os.path.join(room_folder, image_name)

    # עדכון האינדקס לסיבוב הבא
    room_image_index[room_code] = current_index + 1
     # המרת התמונה ל-Base64
     
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
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    init_uploads_dir()
    # הרצת השרת - הפקודה הזו חייבת להיות אחרונה!
    app.run(host='0.0.0.0', port=PORT, debug=True)