import os
import random
import requests
import urllib.request
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# טעינת הגדרות
load_dotenv()
GIPHY_API_KEY = os.getenv("GIPHY_API_KEY")
PORT = 4000
UPLOADS_DIR = 'uploads'

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

if __name__ == "__main__":
    init_uploads_dir()
    # הרצת השרת - הפקודה הזו חייבת להיות אחרונה!
    app.run(host='0.0.0.0', port=PORT, debug=True)