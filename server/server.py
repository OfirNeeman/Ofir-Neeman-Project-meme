import socket
import threading
import os
import requests
import urllib.request
import shutil
import random
from dotenv import load_dotenv

load_dotenv() # טוען את המשתנים מהקובץ .env
GIPHY_API_KEY = os.getenv("GIPHY_API_KEY")
PORT = 4000
UPLOADS_DIR = 'uploads'

MY_CATEGORIES = ['actions', 'vine','bright', 'emotions', 'the office', 'breaking bad', 'dance moms', 'brooklyn 99','כאן 11']

def clear_uploads_folder():
    if os.path.exists(UPLOADS_DIR):
        print("[*] מנקה תיקיית uploads ממשחקים קודמים...")
        # מוחק את כל התיקייה ויוצר אותה מחדש ריקה
        shutil.rmtree(UPLOADS_DIR)
    os.makedirs(UPLOADS_DIR)

def fetch_random_gifs(limit=5):
    print(f"[*] מושך {limit} GIFs מקטגוריות נבחרות...")
    
    for i in range(limit):
        # בחירת קטגוריה רנדומלית מהרשימה שלך
        chosen_tag = random.choice(MY_CATEGORIES)
        
        url = f"https://api.giphy.com/v1/gifs/random?api_key={GIPHY_API_KEY}&tag={chosen_tag}&rating=g"
        
        try:
            response = requests.get(url).json()
            gif_url = response['data']['images']['fixed_height']['url']
            
            # נשמור את הקובץ עם שם הקטגוריה כדי שנדע מה זה
            filename = os.path.join(UPLOADS_DIR, f"giphy_{chosen_tag}_{i}.gif")
            urllib.request.urlretrieve(gif_url, filename)
            print(f"[V] הורדתי GIF בקטגוריית '{chosen_tag}': {filename}")
        except Exception as e:
            print(f"[!] שגיאה במשיכת GIF עבור {chosen_tag}: {e}")
            

def handle_client(client_socket, addr):
    try:
        raw_data = client_socket.recv(4096)
        if not raw_data:
            return

        # ננסה לפענח כטקסט כדי לראות אם זו בקשת GET/POST של המארח
        try:
            request_text = raw_data.decode('utf-8')
            is_request = "GET" in request_text or "POST" in request_text
        except UnicodeDecodeError:
            is_request = False

        if is_request:
            # המארח מבקש לבחור תמונה רנדומלית
            all_files = [f for f in os.listdir(UPLOADS_DIR) if f.endswith(('.gif', '.jpg', '.jpeg', '.png'))]
            chosen_image = random.choice(all_files) if all_files else "default.jpg"
            
            response = "HTTP/1.1 200 OK\r\n"
            response += "Content-Type: text/plain\r\n"
            response += "Access-Control-Allow-Origin: *\r\n"
            response += "\r\n"
            response += chosen_image
            client_socket.sendall(response.encode())
            print(f"[*] Sent random image to host: {chosen_image}")
        else:
            # אם זה לא טקסט קריא, זו כנראה תמונה שנשלחת משחקן
            filename = f"{UPLOADS_DIR}/image_{addr[1]}.jpg"
            with open(filename, "wb") as f:
                f.write(raw_data)
                while True:
                    client_socket.settimeout(1.0)
                    try:
                        data = client_socket.recv(4096)
                        if not data: break
                        f.write(data)
                    except socket.timeout:
                        break
            print(f"[V] Saved player image: {filename}")

    except Exception as e:
        print(f"[!] Error: {e}")
    finally:
        client_socket.close()
        
if __name__ == "__main__":
    clear_uploads_folder() # ניקוי לפני הכל
    fetch_random_gifs(3)
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind(('0.0.0.0', PORT))
    server.listen(5)
    print(f"[*] השרת מאזין בפורט {PORT}... מחכה לטלפון שלך.")

    while True:
        client, addr = server.accept()
        threading.Thread(target=handle_client, args=(client, addr)).start()