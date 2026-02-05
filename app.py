from fastapi import FastAPI, Request, HTTPException, Form, BackgroundTasks, File, UploadFile, Response, Cookie
from starlette.responses import RedirectResponse
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
import yt_dlp
import json
import os
from datetime import datetime
import aiofiles
import shutil
from auth import get_current_user, authenticate_user, register_user
import asyncio
try:
    from telegram_client import fetch_videos_from_channel
    TELEGRAM_AVAILABLE = True
except ImportError:
    TELEGRAM_AVAILABLE = False

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# Only mount videos directory if it exists
import os
if os.path.exists("videos"):
    app.mount("/videos", StaticFiles(directory="videos"), name="videos")

templates = Jinja2Templates(directory="templates")

VIDEO_DB = "video_db.json"
FOLDER_DB = "folder_db.json"
PLAYLIST_DB = "playlist_db.json"
SOCIAL_DB = "social_db.json"
LOCAL_VIDEOS_DIR = "videos"

# Authentication routes
@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, error: str = None):
    return templates.TemplateResponse("login.html", {"request": request, "error": error})

@app.post("/login")
async def login(request: Request, username: str = Form(...), password: str = Form(...)):
    user = authenticate_user(username, password)
    if not user:
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error": "Invalid username or password"
        })

    from auth import create_access_token
    token = create_access_token({"sub": username})

    # Redirect admin users to admin panel, others to home
    redirect_url = "/admin" if user.get("role") == "admin" else "/"
    response = RedirectResponse(redirect_url, status_code=302)
    response.set_cookie(key="auth_token", value=token, httponly=True, max_age=6*30*24*60*60)
    return response

@app.get("/register", response_class=HTMLResponse)
async def register_page(request: Request, error: str = None, success: str = None):
    return templates.TemplateResponse("register.html", {
        "request": request,
        "error": error,
        "success": success
    })

@app.post("/register")
async def register(
    request: Request,
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...)
):
    if password != confirm_password:
        return templates.TemplateResponse("register.html", {
            "request": request,
            "error": "Passwords do not match"
        })

    try:
        user = register_user(username, email, password)
        return templates.TemplateResponse("register.html", {
            "request": request,
            "success": "Account created successfully! You can now login."
        })
    except HTTPException as e:
        return templates.TemplateResponse("register.html", {
            "request": request,
            "error": e.detail
        })

@app.get("/logout")
async def logout_get(response: Response):
    response = RedirectResponse("/", status_code=303)
    response.delete_cookie("auth_token")
    return response

@app.post("/logout")
async def logout_post(response: Response):
    # Redirect to main page with proper 303 status to ensure GET request
    from starlette.responses import RedirectResponse
    response = RedirectResponse(url="/", status_code=303)
    response.delete_cookie("auth_token")
    return response

@app.get("/start", response_class=HTMLResponse)
async def start_page(request: Request):
    return templates.TemplateResponse("start.html", {"request": request})

# Features route
@app.get("/features", response_class=HTMLResponse)
async def features_page(request: Request):
    from features import FeatureImplementation
    features_manager = FeatureImplementation()
    categories = features_manager.features.get_feature_categories()
    
    return templates.TemplateResponse("features.html", {
        "request": request,
        "categories": categories
    })

# API route to get feature status
@app.get("/api/features/status")
async def get_feature_status(feature: str = None):
    from features import VideoHubFeatures
    features = VideoHubFeatures()
    
    if feature:
        return {"feature": feature, "status": features.get_feature_status(feature)}
    else:
        return {"features": features.get_all_features()}

# API route to implement all features
@app.post("/api/features/implement-all")
async def implement_all_features():
    from features import FeatureImplementation
    features_manager = FeatureImplementation()
    
    try:
        features_manager.implement_all_features()
        return {"success": True, "message": "All features implemented successfully"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def load_db():
    try:
        with open(VIDEO_DB, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_db(db):
    try:
        with open(VIDEO_DB, 'w') as f:
            json.dump(db, f, indent=2)
    except OSError as e:
        print(f"Error saving video database: {e}")
        # Return without raising exception - allow app to continue

def load_folder_db():
    try:
        with open(FOLDER_DB, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_folder_db(db):
    try:
        with open(FOLDER_DB, 'w') as f:
            json.dump(db, f, indent=2)
    except OSError as e:
        print(f"Error saving folder database: {e}")
        # Return without raising exception - allow app to continue

def load_playlist_db():
    try:
        with open(PLAYLIST_DB, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_playlist_db(db):
    try:
        with open(PLAYLIST_DB, 'w') as f:
            json.dump(db, f, indent=2)
    except OSError as e:
        print(f"Error saving playlist database: {e}")
        # Return without raising exception - allow app to continue

def load_social_db():
    try:
        with open(SOCIAL_DB, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"facebook": "", "whatsapp": "", "instagram": "", "telegram": ""}

def save_social_db(db):
    try:
        with open(SOCIAL_DB, 'w') as f:
            json.dump(db, f, indent=2)
    except OSError as e:
        print(f"Error saving social database: {e}")
        # Return without raising exception - allow app to continue

async def extract_playlist_videos(playlist_url, username=None):
    """Extract all videos from a YouTube playlist - SUPER FAST mode"""
    try:
        print(f"🔍 Extracting videos from playlist: {playlist_url}")
        
        # Validate and normalize playlist URL
        import re
        playlist_id = None
        
        # Extract playlist ID from various YouTube URL formats
        patterns = [
            r'list=([A-Za-z0-9_-]+)',  # Standard playlist parameter
            r'playlist\?list=([A-Za-z0-9_-]+)',  # Playlist page URL
            r'youtube\.com\/playlist\/([A-Za-z0-9_-]+)',  # New playlist format
        ]
        
        for pattern in patterns:
            match = re.search(pattern, playlist_url)
            if match:
                playlist_id = match.group(1)
                break
        
        if playlist_id:
            normalized_url = f"https://www.youtube.com/playlist?list={playlist_id}"
            print(f"✅ Normalized playlist URL: {normalized_url}")
        else:
            print(f"❌ Invalid playlist URL - no playlist ID found: {playlist_url}")
            return []

        # SUPER FAST extraction - minimal metadata only
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': 'in_playlist',  # Extract minimal info for playlists
            'playlist_items': '1:300',  # Get first 300 videos (increased limit)
            'ignore_errors': True,  # Continue on errors
            'timeout': 30,  # Reduced timeout for faster failure
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            'skip_download': True,
            'force_generic_extractor': False,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(normalized_url, download=False)

            if 'entries' in info and info['entries']:
                # Process videos in bulk
                videos = []
                for entry in info['entries']:
                    if entry and entry.get('id'):
                        videos.append({
                            'video_id': entry.get('id'),
                            'title': entry.get('title', 'Unknown Title'),
                            'url': f"https://www.youtube.com/watch?v={entry.get('id')}",
                            'duration': entry.get('duration', 0),
                            'uploader': entry.get('uploader', 'Unknown'),
                            'playlist_id': info.get('id', playlist_id),
                            'playlist_title': info.get('title', 'Unknown Playlist')
                        })
                print(f"✅ Extracted {len(videos)} videos from playlist (SUPER FAST)")
                return videos
            else:
                print(f"❌ No entries found in playlist info. Available keys: {list(info.keys()) if isinstance(info, dict) else 'Not a dict'}")
                return []
                
    except Exception as e:
        print(f"❌ Error extracting playlist: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return []

async def download_video_locally(video_id, username, quality='best'):
    """Download a YouTube video locally for offline playback"""
    try:
        # Create user directory
        user_dir = os.path.join(LOCAL_VIDEOS_DIR, username)
        os.makedirs(user_dir, exist_ok=True)

        output_template = os.path.join(user_dir, f'{video_id}.%(ext)s')

        # Try with different options to avoid bot detection
        ydl_opts = {
            'format': quality,
            'outtmpl': output_template,
            'quiet': True,
            'no_warnings': True,
            'extractor_args': {
                'youtube': {
                    'player_skip': ['js', 'configs'],
                    'player_client': ['android'],
                }
            },
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            # Add cookies support (optional)
            'cookiesfrombrowser': None,  # Can be configured by user
        }

        # If user has cookies configured, use them
        cookies_file = os.path.join(user_dir, 'cookies.txt')
        if os.path.exists(cookies_file):
            ydl_opts['cookiefile'] = cookies_file

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=True)

            # Return local file path
            filename = ydl.prepare_filename(info)
            return filename if os.path.exists(filename) else None

    except Exception as e:
        print(f"Error downloading video {video_id}: {e}")
        # Don't return None immediately, try alternative approach
        return await download_video_alternative(video_id, username)

async def download_video_alternative(video_id, username):
    """Alternative download method for when yt-dlp fails"""
    try:
        # For now, just return None and rely on streaming
        # In production, you could implement alternative download methods
        print(f"Using streaming fallback for video {video_id}")
        return None
    except Exception as e:
        print(f"Alternative download also failed for {video_id}: {e}")
        return None

async def add_playlist(playlist_url, folder_name, username, monitor=False):
    """Add entire playlist with option to monitor for updates - FAST MODE"""
    print(f"📥 Starting playlist import (FAST MODE): URL={playlist_url}, Folder={folder_name}, Monitor={monitor}")
    
    # Extract playlist metadata and videos (FAST mode - no downloads)
    videos = await extract_playlist_videos(playlist_url)

    if not videos or len(videos) == 0:
        print(f"❌ No videos extracted from playlist: {playlist_url}")
        return {"error": "Could not extract videos from playlist. Please check if the playlist URL is valid and public."}

    db = load_db()
    playlist_db = load_playlist_db()
    folder_db = load_folder_db()

    # Create folder if it doesn't exist
    if folder_name and folder_name not in folder_db:
        folder_db[folder_name] = {
            'name': folder_name,
            'path': folder_name,
            'parent_path': '',
            'user_id': username,
            'created_time': datetime.now().isoformat()
        }
        save_folder_db(folder_db)
        print(f"✅ Created new folder: {folder_name}")

    added_count = 0
    playlist_id = videos[0]['playlist_id'] if videos else None

    # Store playlist info if monitoring
    if monitor and playlist_id:
        playlist_db[playlist_id] = {
            'id': playlist_id,
            'url': playlist_url,
            'title': videos[0]['playlist_title'] if videos else 'Unknown Playlist',
            'folder_name': folder_name,
            'username': username,
            'last_checked': datetime.now().isoformat(),
            'video_count': len(videos),
            'monitor': True
        }
        save_playlist_db(playlist_db)
        print(f"✅ Playlist monitoring enabled: {playlist_id}")

    # Add all videos (FAST - metadata only)
    print(f"📊 Database contains {len(db)} videos before addition")
    
    # Process videos in bulk for speed
    videos_to_add = []
    for video in videos:
        video_id = f"{video['video_id']}_{playlist_id}"
        if video_id not in db:
            videos_to_add.append({
                'video_id': video_id,
                'original_video_id': video['video_id'],
                'title': video['title'],
                'url': video['url'],
                'local_path': None,
                'folder_name': folder_name,
                'folder_path': folder_name,
                'duration': video['duration'],
                'uploader': video['uploader'],
                'added_time': datetime.now().isoformat(),
                'views_count': 0,
                'source_type': 'youtube_playlist',
                'playlist_id': playlist_id,
                'user_id': username
            })

    # Bulk add to database
    for video_data in videos_to_add:
        db[video_data['video_id']] = video_data
        added_count += 1

    save_db(db)
    
    print(f"🎉 Playlist import completed (FAST MODE): Added {added_count} videos in {len(videos_to_add)} operations")
    return {
        "message": f"Added {added_count} videos from playlist (FAST MODE)",
        "playlist_id": playlist_id,
        "total_videos": len(videos)
    }

async def check_playlist_updates():
    """Background task to check for playlist updates"""
    playlist_db = load_playlist_db()
    db = load_db()

    for playlist_id, playlist_info in playlist_db.items():
        if playlist_info.get('monitor'):
            try:
                print(f"Checking for updates in playlist: {playlist_info['title']} ({playlist_id})")
                videos = await extract_playlist_videos(playlist_info['url'])
                current_video_ids = {v['video_id'] for v in videos}

                # Check for new videos
                existing_video_ids = {
                    v['original_video_id'] for v in db.values()
                    if v.get('playlist_id') == playlist_id
                }

                new_videos = [v for v in videos if v['video_id'] not in existing_video_ids]

                if new_videos:
                    username = playlist_info['username']
                    folder_name = playlist_info['folder_name']
                    print(f"Found {len(new_videos)} new videos in playlist {playlist_id}")

                    for video in new_videos:
                        video_id = f"{video['video_id']}_{playlist_id}"

                        db[video_id] = {
                            'video_id': video_id,
                            'original_video_id': video['video_id'],
                            'title': video['title'],
                            'url': video['url'],
                            'local_path': None,  # Will be downloaded later if needed
                            'folder_name': folder_name,
                            'folder_path': folder_name,
                            'duration': video['duration'],
                            'uploader': video['uploader'],
                            'added_time': datetime.now().isoformat(),
                            'views_count': 0,
                            'source_type': 'youtube_playlist_auto',
                            'playlist_id': playlist_id,
                            'user_id': username
                        }

                    save_db(db)
                    print(f"✅ Added {len(new_videos)} new videos to playlist {playlist_id}")

                    # TODO: Implement notification system for new videos
                    # For now, just print to console
                    print(f"🔔 Notification: {len(new_videos)} new videos added to '{playlist_info['title']}' playlist")

                # Update last checked
                playlist_info['last_checked'] = datetime.now().isoformat()
                playlist_info['video_count'] = len(videos)

            except Exception as e:
                print(f"❌ Error checking playlist {playlist_id}: {e}")
                import traceback
                traceback.print_exc()

    save_playlist_db(playlist_db)

def build_folder_hierarchy():
    """Build hierarchical folder structure from videos and folders"""
    db = load_db()
    folder_db = load_folder_db()

    # Get all unique folder paths
    folders = {}
    for video in db.values():
        folder_path = video.get('folder_path', video.get('folder_name', ''))
        if folder_path:
            folders[folder_path] = folders.get(folder_path, 0) + 1

    # Add folders from folder_db
    for folder_name, folder_info in folder_db.items():
        if folder_name not in folders:
            folders[folder_name] = 0

    # Build hierarchy
    hierarchy = {}
    for folder_path, count in folders.items():
        parts = folder_path.split('/')
        current = hierarchy
        for part in parts:
            if part not in current:
                current[part] = {'count': 0, 'subfolders': {}}
            current = current[part]['subfolders']
        # Set count on the deepest level
        if parts:
            current = hierarchy
            for part in parts[:-1]:
                current = current[part]['subfolders']
            current[parts[-1]]['count'] = count

    return hierarchy

def build_user_folder_hierarchy(username):
    """Build folder hierarchy for a specific user"""
    db = load_db()
    folder_db = load_folder_db()

    # Get user's folder paths
    folders = {}
    for video in db.values():
        if video.get('user_id') == username:
            folder_path = video.get('folder_path', video.get('folder_name', ''))
            if folder_path:
                folders[folder_path] = folders.get(folder_path, 0) + 1

    # Add user's folders from folder_db
    for folder_name, folder_info in folder_db.items():
        if folder_info.get('user_id') == username:
            if folder_name not in folders:
                folders[folder_name] = 0

    # Build hierarchy
    hierarchy = {}
    for folder_path, count in folders.items():
        parts = folder_path.split('/')
        current = hierarchy
        for part in parts:
            if part not in current:
                current[part] = {'count': 0, 'subfolders': {}}
            current = current[part]['subfolders']
        # Set count on the deepest level
        if parts:
            current = hierarchy
            for part in parts[:-1]:
                current = current[part]['subfolders']
            current[parts[-1]]['count'] = count

    return hierarchy

@app.get("/", response_class=HTMLResponse)
async def home(request: Request, auth_token: str = Cookie(None)):
    # Check if user is authenticated
    if not auth_token:
        return RedirectResponse("/start", status_code=302)

    try:
        from auth import verify_token
        username = verify_token(auth_token)
        if not username:
            return RedirectResponse("/login", status_code=302)

        from auth import load_users
        users = load_users()
        if username not in users:
            return RedirectResponse("/login", status_code=302)

        user = users[username]
    except Exception:
        return RedirectResponse("/login", status_code=302)

    db = load_db()
    social_db = load_social_db()

    # Filter videos by current user
    user_videos = [video for video in db.values() if video.get('user_id') == user['username']]
    user_videos.sort(key=lambda x: x.get('added_time', ''), reverse=True)

    # Build user-specific folder hierarchy
    folder_hierarchy = build_user_folder_hierarchy(user['username'])

    return templates.TemplateResponse("index.html", {
        "request": request,
        "folder_hierarchy": folder_hierarchy,
        "videos": user_videos,
        "current_user": user,
        "social_db": social_db
    })

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request, auth_token: str = Cookie(None)):
    """Advanced dashboard with all 50 features"""
    if not auth_token:
        return RedirectResponse("/login", status_code=302)

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        if username not in users:
            return RedirectResponse("/login", status_code=302)
        user = users[username]
    except Exception:
        return RedirectResponse("/login", status_code=302)

    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "current_user": user
    })

@app.get("/folder/{folder_path:path}", response_class=HTMLResponse)
async def folder_page(request: Request, folder_path: str, auth_token: str = Cookie(None)):
    # Check authentication
    if not auth_token:
        return RedirectResponse("/login", status_code=302)

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        if username not in users:
            return RedirectResponse("/login", status_code=302)
        user = users[username]
    except Exception:
        return RedirectResponse("/login", status_code=302)

    db = load_db()
    folder_db = load_folder_db()

    # Find user's videos in this folder and subfolders
    videos = []
    for video in db.values():
        if video.get('user_id') == username:
            video_folder = video.get('folder_path', video.get('folder_name', ''))
            if video_folder == folder_path or video_folder.startswith(folder_path + '/'):
                videos.append(video)

    # Get user's subfolders
    subfolders = {}
    for folder_name, folder_info in folder_db.items():
        if (folder_info.get('user_id') == username and
            folder_name.startswith(folder_path + '/') and
            folder_name.count('/') == folder_path.count('/') + 1):
            subfolder_name = folder_name.split('/')[-1]
            subfolders[subfolder_name] = folder_name

    return templates.TemplateResponse("folder.html", {
        "request": request,
        "folder_path": folder_path,
        "folder_name": folder_path.split('/')[-1],
        "videos": videos,
        "subfolders": subfolders,
        "current_user": user
    })

@app.get("/watch/{video_id}", response_class=HTMLResponse)
async def watch(request: Request, video_id: str, auth_token: str = Cookie(None)):
    # Check authentication
    if not auth_token:
        return RedirectResponse("/login", status_code=302)

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        if username not in users:
            return RedirectResponse("/login", status_code=302)
        user = users[username]
    except Exception:
        return RedirectResponse("/login", status_code=302)

    db = load_db()
    video = db.get(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Check if video belongs to user
    if video.get('user_id') != username:
        raise HTTPException(status_code=403, detail="Access denied")

    # Increment views
    video['views_count'] = video.get('views_count', 0) + 1
    # Try to save DB - handle read-only filesystem error (common on Vercel)
    try:
        save_db(db)
    except OSError as e:
        print(f"Error saving database: {e}")
        # Continue without saving (read-only filesystem on Vercel)
    return templates.TemplateResponse("watch.html", {"request": request, "video": video, "current_user": user})

@app.post("/add_video")
async def add_video(
    background_tasks: BackgroundTasks,
    url: str = Form(...),
    folder_path: str = Form(None),
    new_folder: str = Form(None),
    auth_token: str = Cookie(None)
):
    # Verify user authentication
    if not auth_token:
        return {"error": "Authentication required"}, 401

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        if username not in users:
            return {"error": "User not found"}, 401
        user = users[username]
    except Exception:
        return {"error": "Invalid authentication"}, 401

    # Use new_folder if provided, otherwise use folder_path
    actual_folder = new_folder if new_folder else folder_path
    if not actual_folder:
        return {"error": "Folder path is required"}, 400

    background_tasks.add_task(process_video, url, actual_folder, username)
    return {"message": "Video processing started"}

@app.get("/api/folders")
async def get_folders(auth_token: str = Cookie(None)):
    # Check authentication
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        if username not in users:
            raise HTTPException(status_code=401, detail="User not found")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    folder_hierarchy = build_user_folder_hierarchy(username)

    # Flatten hierarchy for backward compatibility
    def flatten_hierarchy(hierarchy, prefix=""):
        folders = []
        for name, data in hierarchy.items():
            full_path = f"{prefix}/{name}" if prefix else name
            folders.append({
                'name': full_path,
                'display_name': name,
                'count': data['count'],
                'path': full_path,
                'has_subfolders': bool(data['subfolders'])
            })
            # Recursively add subfolders
            folders.extend(flatten_hierarchy(data['subfolders'], full_path))
        return folders

    folders = flatten_hierarchy(folder_hierarchy)
    return {"folders": folders}

@app.get("/api/stream/{video_id}")
async def get_stream(video_id: str, auth_token: str = Cookie(None)):
    """Get streaming URL for a video with better error handling and debugging"""
    print(f"\n📺 Stream API called for video_id: {video_id}")
    
    if not auth_token:
        print("❌ No auth token provided")
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        if username not in users:
            print(f"❌ User {username} not found in users database")
            raise HTTPException(status_code=401, detail="User not found")
        print(f"✅ Authenticated as: {username}")
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication")

    db = load_db()
    print(f"📊 Total videos in database: {len(db)}")
    
    video = db.get(video_id)
    if not video:
        print(f"❌ Video {video_id} not found in database")
        print(f"Available video IDs: {list(db.keys())[:5]}...")  # Show first 5
        raise HTTPException(status_code=404, detail=f"Video {video_id} not found")

    print(f"✅ Video found: {video.get('title', 'Unknown')}")
    print(f"   Owner: {video.get('user_id')}, Current user: {username}")

    # Check if video belongs to user
    if video.get('user_id') != username:
        print(f"❌ Access denied: Video belongs to {video.get('user_id')}, not {username}")
        raise HTTPException(status_code=403, detail="Access denied")
    
    print(f"✅ Access granted")
    
    try:
        # Extract stream URL using yt-dlp
        url = video.get('source_url') or video.get('url')
        if not url:
            print(f"❌ No source URL found in video record")
            raise HTTPException(status_code=400, detail="Video has no source URL")
            
        print(f"🔗 Source URL: {url}")
        
        # Try multiple format options
        format_options = [
            ('18', 'MP4 360p (Best Compatibility)'),
            ('best[ext=mp4]', 'Best MP4'),
            ('best', 'Best Available'),
            ('22', 'MP4 720p'),
        ]
        
        stream_url = None
        selected_format_desc = None
        
        for fmt, fmt_desc in format_options:
            print(f"🔄 Trying format {fmt}...")
            ydl_opts = {
                'format': fmt,
                'quiet': True,
                'no_warnings': True,
                'socket_timeout': 25,
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
            
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    stream_url = info.get('url')
                    
                    if stream_url:
                        selected_format_desc = fmt_desc
                        print(f"✅ Got stream URL using {fmt_desc}")
                        return {
                            "stream_url": stream_url,
                            "title": info.get('title', video.get('title')),
                            "duration": info.get('duration', 0),
                            "format": fmt_desc,
                            "source": "yt_dlp"
                        }
            except Exception as e:
                err_msg = str(e)[:80]
                print(f"  ⚠️ Format {fmt} failed: {err_msg}")
                # Check for common YouTube errors
                if 'Sign in' in str(e) or 'bot' in str(e).lower() or 'age' in str(e).lower():
                    print(f"🚫 YouTube access restricted: {str(e)}")
                    return {
                        "stream_url": None,
                        "error": "YouTube access restricted",
                        "suggestion": "This video requires YouTube sign-in or age verification. Please use the YouTube Embed player instead.",
                        "title": video.get('title'),
                        "video_id": video_id,
                        "restricted": True,
                        "fallback": True
                    }
                continue
        
        # If we still don't have URL, log error and return fallback info
        print(f"❌ Could not extract direct stream for {video_id}")
        return {
            "stream_url": None,
            "error": "Could not extract direct stream - try YouTube embed",
            "title": video.get('title'),
            "video_id": video_id,
            "fallback": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error extracting stream: {type(e).__name__}: {str(e)[:200]}")
        import traceback
        traceback.print_exc()
        
        return {
            "stream_url": None,
            "error": f"Stream extraction failed: {str(e)[:100]}",
            "title": video.get('title'),
            "video_id": video_id,
            "fallback": True
        }


@app.get("/api/proxy_stream/{video_id}")
async def proxy_stream(video_id: str, auth_token: str = Cookie(None)):
    """Proxy endpoint that streams video directly through server"""
    import httpx
    
    print(f"\n📹 Proxy stream requested for: {video_id}")
    
    if not auth_token:
        print("❌ No auth token")
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        if username not in users:
            print(f"❌ User {username} not found")
            raise HTTPException(status_code=401, detail="User not found")
    except Exception as e:
        print(f"❌ Auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication")

    db = load_db()
    video = db.get(video_id)
    if not video:
        print(f"❌ Video {video_id} not found")
        raise HTTPException(status_code=404, detail="Video not found")

    if video.get('user_id') != username:
        print(f"❌ Access denied")
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        url = video.get('source_url') or video.get('url')
        if not url:
            print(f"❌ No source URL")
            raise HTTPException(status_code=400, detail="No source URL")

        print(f"🔗 Getting stream from: {url}")
        
        # Try multiple format options with fallback
        format_options = [
            ('18', 'MP4 360p (Standard)'),
            ('best[ext=mp4]', 'Best MP4'),
            ('best', 'Best Available'),
            ('22', 'MP4 720p'),
            ('43', 'WebM 360p'),
        ]
        
        stream_url = None
        selected_format = None
        
        for fmt, fmt_desc in format_options:
            print(f"🔄 Trying format {fmt} ({fmt_desc})...")
            ydl_opts = {
                'format': fmt,
                'quiet': True,
                'no_warnings': True,
                'socket_timeout': 25,
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
            
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    stream_url = info.get('url')
                    if stream_url:
                        selected_format = fmt_desc
                        print(f"✅ Success with {fmt_desc}")
                        break
            except Exception as e:
                err_msg = str(e)[:50]
                print(f"  ⚠️ Format {fmt} failed: {err_msg}")
                # Check for common YouTube errors
                if 'Sign in' in str(e) or 'bot' in str(e).lower() or 'age' in str(e).lower():
                    print(f"🚫 YouTube access restricted: {str(e)}")
                    return {
                        "error": "YouTube access restricted",
                        "suggestion": "This video requires YouTube sign-in or age verification. Please use the YouTube Embed player instead.",
                        "video_id": video_id,
                        "restricted": True
                    }
                continue
        
        if not stream_url:
            print(f"❌ Could not extract stream URL with any format")
            # Return a helpful error response
            return {
                "error": "Could not extract playable stream",
                "suggestion": "The video may be restricted or unavailable",
                "video_id": video_id
            }

        print(f"✅ Stream URL extracted using {selected_format}, proxying...")
        
        # Proxy the stream with proper headers
        async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
            try:
                async with client.stream('GET', stream_url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }) as response:
                    if response.status_code not in [200, 206]:
                        print(f"❌ Stream returned: {response.status_code}")
                        raise HTTPException(status_code=response.status_code, detail=f"Stream error: {response.status_code}")
                    
                    # Get content type and length
                    content_type = response.headers.get('content-type', 'video/mp4')
                    content_length = response.headers.get('content-length', 'unknown')
                    
                    print(f"✅ Proxying stream - Type: {content_type}, Size: {content_length}")
                    
                    # Stream the video
                    async def generate():
                        try:
                            async for chunk in response.aiter_bytes(chunk_size=16384):
                                if chunk:
                                    yield chunk
                        except Exception as e:
                            print(f"❌ Error streaming chunk: {e}")
                    
                    return Response(
                        content=generate(),
                        media_type=content_type,
                        headers={
                            'Accept-Ranges': 'bytes',
                            'Cache-Control': 'public, max-age=3600',
                            'Content-Type': content_type,
                        }
                    )
            except httpx.TimeoutException:
                print("❌ Stream connection timeout")
                raise HTTPException(status_code=504, detail="Stream timeout - video took too long to load")
            except Exception as e:
                print(f"❌ Stream error: {type(e).__name__}: {str(e)[:100]}")
                raise HTTPException(status_code=500, detail=f"Stream failed: {str(e)[:50]}")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Proxy error: {type(e).__name__}: {str(e)[:200]}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)[:80]}")


@app.post("/api/rename_folder")
async def rename_folder(old_name: str = Form(...), new_name: str = Form(...), auth_token: str = Cookie(None)):
    """Rename a folder and update all videos in it"""
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        if username not in users:
            raise HTTPException(status_code=401, detail="User not found")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    db = load_db()
    folder_db = load_folder_db()

    # Update all user's videos with the old folder name
    for video in db.values():
        if video.get('user_id') == username and video.get('folder_name') == old_name:
            video['folder_name'] = new_name

    # Update folder in folder_db if it belongs to user
    if old_name in folder_db and folder_db[old_name].get('user_id') == username:
        folder_info = folder_db[old_name]
        folder_info['name'] = new_name
        folder_info['path'] = new_name
        folder_db[new_name] = folder_info
        del folder_db[old_name]
        save_folder_db(folder_db)

    # Rename physical folder
    old_path = os.path.join("videos", username, old_name)
    new_path = os.path.join("videos", username, new_name)

    if os.path.exists(old_path):
        os.rename(old_path, new_path)

    save_db(db)
    return {"message": f"Folder renamed from {old_name} to {new_name}"}



@app.get("/api/telegram/channels")
async def get_telegram_channels():
    """Get list of configured Telegram channels"""
    if not TELEGRAM_AVAILABLE:
        return {"error": "Telegram client not available", "channels": []}
    
    import config
    channels = config.CHANNELS or []
    return {"channels": channels}

@app.get("/api/telegram/sync/{channel}")
async def sync_telegram_channel(channel: str, background_tasks: BackgroundTasks, auth_token: str = Cookie(None)):
    """Sync videos from a Telegram channel"""
    if not TELEGRAM_AVAILABLE:
        raise HTTPException(status_code=400, detail="Telegram client not available")

    # Get current user
    username = None
    if auth_token:
        try:
            from auth import verify_token
            username = verify_token(auth_token)
        except:
            pass

    try:
        # Queue background task with username
        background_tasks.add_task(fetch_and_store_telegram_videos, channel, username)
        return {"message": f"Syncing channel: {channel}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/telegram-study", response_class=HTMLResponse)
async def telegram_study_page(request: Request, auth_token: str = Cookie(None)):
    """Telegram Study Page - Perfect study interface for Telegram channels"""
    # Check if user is authenticated
    if not auth_token:
        return RedirectResponse("/login", status_code=302)

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        if username not in users:
            return RedirectResponse("/login", status_code=302)
        user = users[username]
    except Exception:
        return RedirectResponse("/login", status_code=302)

    return templates.TemplateResponse("telegram_study.html", {"request": request, "current_user": user})

@app.get("/api/telegram/videos")
async def get_telegram_videos():
    """Get all Telegram videos from cache"""
    try:
        import config
        cache_file = config.VIDEO_CACHE_FILE
        if os.path.exists(cache_file):
            with open(cache_file, 'r') as f:
                return json.load(f)
    except:
        pass
    return {}

@app.delete("/delete_video/{video_id}")
async def delete_video(video_id: str, auth_token: str = Cookie(None)):
    """Delete a video from the database"""
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        if username not in users:
            raise HTTPException(status_code=401, detail="User not found")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    db = load_db()
    
    if video_id not in db:
        raise HTTPException(status_code=404, detail="Video not found")

    video = db[video_id]
    
    # Check if video belongs to the user
    if video.get('user_id') != username:
        raise HTTPException(status_code=403, detail="Access denied")

    # Delete video from database
    del db[video_id]
    save_db(db)

    return {"message": "Video deleted successfully"}

@app.post("/api/social-link")
async def update_social_link(platform: str = Form(...), url: str = Form(...), auth_token: str = Cookie(None)):
    """Update social media link - admin only"""
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        
        if username not in users or users[username].get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Access denied - admin only")
        
        social_db = load_social_db()
        social_db[platform] = url
        save_social_db(social_db)
        
        return {"success": True, "message": f"{platform} link updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/social-links")
async def get_social_links():
    """Get all social media links"""
    return load_social_db()


@app.get("/api/telegram/settings")
async def get_telegram_settings(auth_token: str = Cookie(None)):
    """Get current user's Telegram settings"""
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token
        username = verify_token(auth_token)

        import config
        settings = config.get_user_telegram_config(username)
        return {
            "api_id": settings.get('api_id', ''),
            "api_hash": settings.get('api_hash', ''),
            "configured": bool(settings.get('api_id') and settings.get('api_hash'))
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/telegram/settings")
async def save_telegram_settings(
    api_id: str = Form(...),
    api_hash: str = Form(...),
    auth_token: str = Cookie(None)
):
    """Save Telegram API settings for current user"""
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token
        username = verify_token(auth_token)

        import config
        if config.save_user_telegram_config(username, api_id.strip(), api_hash.strip()):
            return {"message": "Telegram settings saved successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to save settings")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def fetch_and_store_telegram_videos(channel: str, username: str = None):
    """Background task to fetch and store Telegram videos"""
    if not TELEGRAM_AVAILABLE:
        return

    try:
        videos = await fetch_videos_from_channel(channel, username)
        db = load_db()
        
        for video in videos:
            unique_id = video.get('unique_video_id')
            if unique_id and unique_id not in db:
                # Convert Telegram video to database format
                db[unique_id] = {
                    'video_id': unique_id,
                    'title': video.get('title', 'Telegram Video'),
                    'source_url': f"/api/telegram/download/{unique_id}",
                    'folder_name': f"📱 {video.get('channel_name', 'Telegram')}",
                    'embed_url': f"/watch/{unique_id}",
                    'thumbnail_path': video.get('thumbnail_path', ''),
                    'duration': video.get('duration', 0),
                    'file_size': video.get('file_size', 0),
                    'added_time': datetime.now().isoformat(),
                    'views_count': 0,
                    'source_type': 'telegram',
                    'file_id': video.get('file_id', ''),
                    'message_id': video.get('message_id'),
                    'channel_id': video.get('channel_id')
                }
        
        save_db(db)
        print(f"Synced {len(videos)} videos from {channel}")
    except Exception as e:
        print(f"Error syncing Telegram channel: {e}")

async def process_video(url: str, folder_name: str, username: str = None):
    try:
        # Extract video_id from URL - YouTube IDs are exactly 11 alphanumeric/dash characters
        import re
        # Try different URL patterns
        patterns = [
            r'youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})',
            r'youtu\.be/([a-zA-Z0-9_-]{11})',
            r'youtube\.com/embed/([a-zA-Z0-9_-]{11})',
            r'youtube\.com/live/([a-zA-Z0-9_-]{11})',
            r'youtube\.com/watch\?v=([a-zA-Z0-9_-]+)',  # Allow longer IDs as fallback
            r'youtu\.be/([a-zA-Z0-9_-]+)',  # Allow longer IDs as fallback
        ]
        
        video_id = None
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                extracted_id = match.group(1)
                # Validate: YouTube video IDs should be 11 characters
                if len(extracted_id) == 11:
                    video_id = extracted_id
                    break
                # If not 11 chars, it might be a live video or playlist - try anyway
                elif len(extracted_id) > 0:
                    video_id = extracted_id
                    break
        
        if not video_id:
            print(f"Invalid YouTube URL: {url}")
            return
        
        # Clean video_id - ensure no special characters except dash and underscore
        video_id = video_id.strip()

        # Check if exists
        db = load_db()
        if video_id in db:
            print("Video already exists")
            return

        # Create folder if it doesn't exist
        if username:
            folder_path = os.path.join("videos", username, folder_name)
        else:
            folder_path = os.path.join("videos", folder_name)
        os.makedirs(folder_path, exist_ok=True)

        # Use embed URL for YouTube
        embed_url = f"https://www.youtube.com/embed/{video_id}"

        # Use basic info (yt-dlp causing issues)
        title = f"YouTube Video {video_id}"
        duration = 0
        thumbnail_url = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"

        # Download thumbnail
        thumbnail_path = os.path.join("static", "thumbnails", f"{video_id}.jpg")
        os.makedirs(os.path.dirname(thumbnail_path), exist_ok=True)
        try:
            import urllib.request
            urllib.request.urlretrieve(thumbnail_url, thumbnail_path)
        except:
            # Create a placeholder
            with open(thumbnail_path, 'wb') as f:
                f.write(b'')  # Empty file

        # Save to db
        db[video_id] = {
            'video_id': video_id,
            'user_id': username,  # Associate with user
            'title': title,
            'source_url': url,
            'folder_path': folder_name,  # Changed from folder_name to folder_path
            'folder_name': folder_name.split('/')[-1],  # Keep for backward compatibility
            'embed_url': embed_url,
            'thumbnail_path': thumbnail_path,
            'duration': duration,
            'file_size': 0,  # Not downloaded
            'added_time': datetime.now().isoformat(),
            'views_count': 0
        }
        save_db(db)
        print(f"Video added: {title}")
    except Exception as e:
        print(f"Error processing video: {e}")

@app.post("/api/delete_folder")
async def delete_folder(folder_name: str = Form(...), auth_token: str = Cookie(None)):
    """Delete a folder and all its videos from the database and filesystem"""
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        if username not in users:
            raise HTTPException(status_code=401, detail="User not found")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    db = load_db()
    folder_db = load_folder_db()

    # Remove all user's videos in the folder
    videos_to_delete = [video_id for video_id, video in db.items()
                       if video.get('user_id') == username and 
                       (video.get('folder_name') == folder_name or video.get('folder_path') == folder_name)]

    for video_id in videos_to_delete:
        del db[video_id]

    # Remove folder from folder_db if it belongs to user
    if folder_name in folder_db and folder_db[folder_name].get('user_id') == username:
        del folder_db[folder_name]
        save_folder_db(folder_db)

    save_db(db)

    # Delete physical folder if it exists and is empty
    folder_path = os.path.join("videos", username, folder_name)
    try:
        if os.path.exists(folder_path):
            # Check if folder is empty or only contains .gitkeep or similar
            if not os.listdir(folder_path):
                os.rmdir(folder_path)
            else:
                # If not empty, still remove it (videos folder should be managed by database)
                import shutil
                shutil.rmtree(folder_path)
    except Exception as e:
        print(f"Warning: Could not delete physical folder {folder_path}: {e}")

    return {"message": f"Folder '{folder_name}' and all its videos deleted successfully"}

# Admin routes
@app.get("/admin", response_class=HTMLResponse)
async def admin_panel(request: Request, auth_token: str = Cookie(None)):
    # Check if user is authenticated and is admin
    if not auth_token:
        return RedirectResponse("/login", status_code=302)

    try:
        from auth import verify_token
        username = verify_token(auth_token)
        if not username:
            return RedirectResponse("/login", status_code=302)

        from auth import load_users
        users = load_users()
        if username not in users:
            return RedirectResponse("/login", status_code=302)

        user = users[username]
        if user.get("role") != "admin":
            return RedirectResponse("/", status_code=302)  # Not admin, redirect to home

    except Exception:
        return RedirectResponse("/login", status_code=302)

    return templates.TemplateResponse("admin.html", {"request": request, "current_user": user})

@app.get("/api/admin/stats")
async def get_admin_stats(auth_token: str = Cookie(None)):
    # Verify admin access
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        user = users.get(username)

        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    # Calculate statistics
    all_users = load_users()
    db = load_db()

    total_users = len(all_users)
    active_users = sum(1 for u in all_users.values() if u.get("is_active", True))
    total_videos = len(db)
    total_views = sum(video.get("views_count", 0) for video in db.values())

    # Calculate storage used (rough estimate)
    storage_used = 0
    for video in db.values():
        thumbnail_path = video.get("thumbnail_path", "")
        if thumbnail_path and os.path.exists(thumbnail_path):
            try:
                storage_used += os.path.getsize(thumbnail_path)
            except:
                pass

    # Convert to MB
    storage_used_mb = round(storage_used / (1024 * 1024), 2)

    # Count folders
    folder_db = load_folder_db()
    total_folders = len(folder_db)

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_videos": total_videos,
        "total_views": total_views,
        "storage_used": storage_used_mb,
        "total_folders": total_folders
    }

@app.get("/api/admin/users")
async def get_all_users(auth_token: str = Cookie(None)):
    # Verify admin access
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        user = users.get(username)

        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    # Return all users (exclude passwords)
    all_users = load_users()
    user_list = []
    for username, user_data in all_users.items():
        user_list.append({
            "username": username,
            "email": user_data.get("email"),
            "role": user_data.get("role", "user"),
            "is_active": user_data.get("is_active", True),
            "created_at": user_data.get("created_at"),
            "last_login": user_data.get("last_login"),
            "login_count": user_data.get("login_count", 0)
        })

    return {"users": user_list}

@app.post("/api/admin/users/{target_username}/toggle")
async def toggle_user_status(target_username: str, auth_token: str = Cookie(None)):
    # Verify admin access
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users, save_users
        username = verify_token(auth_token)
        users = load_users()
        user = users.get(username)

        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

        if target_username not in users:
            raise HTTPException(status_code=404, detail="User not found")

        if target_username == "admin":
            raise HTTPException(status_code=400, detail="Cannot modify admin user")

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    # Toggle user status
    users[target_username]["is_active"] = not users[target_username].get("is_active", True)
    save_users(users)

    return {"message": f"User {target_username} status updated"}

@app.delete("/api/admin/users/{target_username}/delete")
async def delete_user(target_username: str, auth_token: str = Cookie(None)):
    # Verify admin access
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users, save_users
        username = verify_token(auth_token)
        users = load_users()
        user = users.get(username)

        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

        if target_username not in users:
            raise HTTPException(status_code=404, detail="User not found")

        if target_username == "admin":
            raise HTTPException(status_code=400, detail="Cannot delete admin user")

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    # Delete user and all their data
    db = load_db()
    folder_db = load_folder_db()

    # Remove user's videos
    videos_to_delete = [vid for vid, video in db.items() if video.get("user_id") == target_username]
    for vid in videos_to_delete:
        del db[vid]

    # Remove user's folders
    folders_to_delete = [fid for fid, folder in folder_db.items() if folder.get("user_id") == target_username]
    for fid in folders_to_delete:
        del folder_db[fid]

    # Remove user account
    del users[target_username]

    # Save changes
    save_db(db)
    save_folder_db(folder_db)
    save_users(users)

    return {"message": f"User {target_username} and all their data deleted"}

@app.get("/api/admin/videos")
async def get_all_videos(auth_token: str = Cookie(None)):
    # Verify admin access
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        user = users.get(username)

        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    db = load_db()
    videos = []
    
    for video_id, video_data in db.items():
        videos.append({
            "video_id": video_id,
            "title": video_data.get("title", "Untitled"),
            "url": video_data.get("url", ""),
            "user_id": video_data.get("user_id", "Unknown"),
            "views_count": video_data.get("views_count", 0),
            "added_date": video_data.get("added_date", "")
        })

    return {"videos": videos}

@app.delete("/api/videos/{video_id}/delete")
async def delete_video(video_id: str, auth_token: str = Cookie(None)):
    # Verify user access
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    db = load_db()
    
    if video_id not in db:
        raise HTTPException(status_code=404, detail="Video not found")

    # Check if video belongs to user
    video_data = db[video_id]
    if video_data.get("user_id") != username:
        raise HTTPException(status_code=403, detail="Access denied - video belongs to another user")

    # Delete video thumbnail if exists
    thumbnail_path = video_data.get("thumbnail_path")
    if thumbnail_path and os.path.exists(thumbnail_path):
        try:
            os.remove(thumbnail_path)
        except:
            pass

    del db[video_id]
    save_db(db)

    return {"message": "Video deleted successfully"}

@app.post("/api/delete_video")
async def delete_video_post(video_id: str = Form(...), auth_token: str = Cookie(None)):
    """Delete a video (POST method for compatibility with frontend)"""
    # Verify user access
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    
    db = load_db()
    
    if video_id not in db:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Check if video belongs to user
    video_data = db[video_id]
    if video_data.get("user_id") != username:
        raise HTTPException(status_code=403, detail="Access denied - video belongs to another user")
    
    # Delete video thumbnail if exists
    thumbnail_path = video_data.get("thumbnail_path")
    if thumbnail_path and os.path.exists(thumbnail_path):
        try:
            os.remove(thumbnail_path)
        except:
            pass
    
    del db[video_id]
    save_db(db)
    
    return {"message": "Video deleted successfully"}

@app.get("/api/admin/settings")
async def get_admin_settings(auth_token: str = Cookie(None)):
    # Verify admin access
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        user = users.get(username)

        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    # Load admin settings from JSON file
    settings_file = "admin_settings.json"
    default_settings = {
        "admin_enabled": True,
        "max_upload_size": 100,
        "max_videos_per_user": 1000,
        "enable_moderation": False,
        "enable_notifications": True
    }

    try:
        if os.path.exists(settings_file):
            with open(settings_file, 'r') as f:
                settings = json.load(f)
                return {**default_settings, **settings}
    except:
        pass

    return default_settings

@app.post("/api/admin/settings/update")
async def update_admin_settings(request: Request, auth_token: str = Cookie(None)):
    # Verify admin access
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        user = users.get(username)

        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    settings_file = "admin_settings.json"
    
    # Get existing settings
    existing_settings = {}
    if os.path.exists(settings_file):
        try:
            with open(settings_file, 'r') as f:
                existing_settings = json.load(f)
        except:
            pass

    # Get new settings from request
    body = await request.json()
    existing_settings.update(body)

    # Save settings
    with open(settings_file, 'w') as f:
        json.dump(existing_settings, f, indent=2)

    return {"message": "Settings updated successfully", "settings": existing_settings}

@app.post("/api/admin/backup")
async def backup_database(auth_token: str = Cookie(None)):
    # Verify admin access
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        user = users.get(username)

        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    # Create backup of all database files
    import zipfile
    
    backup_filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    
    try:
        with zipfile.ZipFile(backup_filename, 'w') as zipf:
            # Add all JSON database files
            db_files = [
                VIDEO_DB, FOLDER_DB, PLAYLIST_DB, 
                'users_db.json', 'admin_settings.json'
            ]
            
            for db_file in db_files:
                if os.path.exists(db_file):
                    zipf.write(db_file)

        return FileResponse(backup_filename, media_type='application/zip', filename=backup_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

@app.post("/api/admin/clear-cache")
async def clear_cache(auth_token: str = Cookie(None)):
    # Verify admin access
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        user = users.get(username)

        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    # Clear cache files
    try:
        if os.path.exists("video_cache.json"):
            with open("video_cache.json", 'w') as f:
                json.dump({}, f)

        # Clear __pycache__
        if os.path.exists("__pycache__"):
            shutil.rmtree("__pycache__")

        return {"message": "Cache cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing cache: {str(e)}")

@app.post("/api/admin/reset-database")
async def reset_database(auth_token: str = Cookie(None)):
    # Verify admin access
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        user = users.get(username)

        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    # Reset all databases but keep admin user
    try:
        # Reset video database
        with open(VIDEO_DB, 'w') as f:
            json.dump({}, f)

        # Reset folder database
        with open(FOLDER_DB, 'w') as f:
            json.dump({}, f)

        # Reset playlist database
        with open(PLAYLIST_DB, 'w') as f:
            json.dump({}, f)

        # Keep only admin user
        admin_user = {
            "admin": {
                "username": "admin",
                "password": "admin",
                "email": "admin@videohub.local",
                "role": "admin",
                "is_active": True,
                "created_at": datetime.now().isoformat(),
                "last_login": None,
                "login_count": 0
            }
        }
        with open('users_db.json', 'w') as f:
            json.dump(admin_user, f, indent=2)

        return {"message": "Database reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting database: {str(e)}")

@app.post("/api/create_subfolder")
async def create_subfolder(parent_path: str = Form(...), subfolder_name: str = Form(...), auth_token: str = Cookie(None)):
    """Create a new subfolder"""
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        if username not in users:
            raise HTTPException(status_code=401, detail="User not found")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    if not subfolder_name or not subfolder_name.strip():
        raise HTTPException(status_code=400, detail="Subfolder name is required")

    folder_db = load_folder_db()
    new_folder_path = f"{parent_path}/{subfolder_name.strip()}" if parent_path else subfolder_name.strip()

    if new_folder_path in folder_db:
        raise HTTPException(status_code=400, detail="Folder already exists")

    # Create physical folder
    folder_physical_path = os.path.join("videos", username, new_folder_path)
    os.makedirs(folder_physical_path, exist_ok=True)

    # Save to folder database
    folder_db[new_folder_path] = {
        'name': subfolder_name.strip(),
        'path': new_folder_path,
        'parent_path': parent_path,
        'user_id': username,
        'created_time': datetime.now().isoformat()
    }
    save_folder_db(folder_db)

    return {"message": f"Subfolder '{subfolder_name}' created successfully", "folder_path": new_folder_path}

@app.post("/api/move_video")
async def move_video(video_id: str = Form(...), new_folder_path: str = Form(...)):
    """Move a video to a different folder"""
    db = load_db()
    folder_db = load_folder_db()

    if video_id not in db:
        raise HTTPException(status_code=404, detail="Video not found")

    if new_folder_path and new_folder_path not in folder_db:
        raise HTTPException(status_code=400, detail="Target folder does not exist")

    video = db[video_id]
    old_folder = video.get('folder_path', video.get('folder_name', ''))

    # Update video folder
    video['folder_path'] = new_folder_path
    video['folder_name'] = new_folder_path.split('/')[-1] if new_folder_path else ''

    save_db(db)
    return {"message": f"Video moved from '{old_folder}' to '{new_folder_path}'"}

@app.post("/api/copy_video")
async def copy_video(video_id: str = Form(...), new_folder_path: str = Form(...)):
    """Copy a video to a different folder"""
    db = load_db()
    folder_db = load_folder_db()

    if video_id not in db:
        raise HTTPException(status_code=404, detail="Video not found")

    if new_folder_path and new_folder_path not in folder_db:
        raise HTTPException(status_code=400, detail="Target folder does not exist")

    video = db[video_id]
    new_video_id = f"{video_id}_copy_{int(datetime.now().timestamp())}"

    # Create copy of video
    new_video = video.copy()
    new_video['video_id'] = new_video_id
    new_video['folder_path'] = new_folder_path
    new_video['folder_name'] = new_folder_path.split('/')[-1] if new_folder_path else ''
    new_video['added_time'] = datetime.now().isoformat()
    new_video['views_count'] = 0

    db[new_video_id] = new_video
    save_db(db)

    return {"message": f"Video copied to '{new_folder_path}'", "new_video_id": new_video_id}

@app.post("/api/add_playlist")
async def add_playlist_endpoint(
    playlist_url: str = Form(...),
    folder_name: str = Form(...),
    monitor: bool = Form(False),
    background_tasks: BackgroundTasks = None,
    auth_token: str = Cookie(None)
):
    """Add entire YouTube playlist with local download"""
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token
        username = verify_token(auth_token)

        # Validate playlist URL - accept various YouTube playlist URL formats
        is_youtube_playlist = 'youtube.com' in playlist_url and 'list=' in playlist_url
        is_youtu_be = 'youtu.be' in playlist_url

        if not (is_youtube_playlist or is_youtu_be):
            raise HTTPException(status_code=400, detail="Invalid playlist URL. Please provide a valid YouTube playlist URL (e.g., https://www.youtube.com/playlist?list=... or https://www.youtube.com/watch?v=...&list=...)")

        # Process playlist synchronously
        result = await add_playlist(playlist_url, folder_name, username, monitor)

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        return {
            "message": result["message"],
            "playlist_id": result.get("playlist_id"),
            "total_videos": result.get("total_videos", 0)
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/playlists")
async def get_playlists(auth_token: str = Cookie(None)):
    """Get user's monitored playlists"""
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token
        username = verify_token(auth_token)

        playlist_db = load_playlist_db()
        user_playlists = {
            pid: playlist for pid, playlist in playlist_db.items()
            if playlist.get('username') == username
        }

        return {"playlists": user_playlists}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/playlist_videos")
async def get_playlist_videos(playlist_id: str, auth_token: str = Cookie(None)):
    """Get videos from a specific playlist"""
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        from auth import verify_token
        username = verify_token(auth_token)

        db = load_db()
        
        # Get all videos from this playlist that belong to the user
        playlist_videos = []
        for video_id, video in db.items():
            if video.get('playlist_id') == playlist_id and video.get('user_id') == username:
                playlist_videos.append({
                    'id': video_id,
                    'original_video_id': video.get('original_video_id'),
                    'title': video.get('title'),
                    'url': video.get('url'),
                    'duration': video.get('duration'),
                    'uploader': video.get('uploader'),
                    'added_time': video.get('added_time')
                })

        return {"playlist_id": playlist_id, "videos": playlist_videos}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/videos/{username}/{video_id}")
async def serve_local_video(username: str, video_id: str):
    """Serve locally downloaded videos"""
    # Find video in database
    db = load_db()
    video = None

    for vid, vdata in db.items():
        if vdata.get('video_id') == video_id and vdata.get('username') == username:
            video = vdata
            break

    if not video or not video.get('local_path'):
        raise HTTPException(status_code=404, detail="Video not found")

    # Check if file exists
    if not os.path.exists(video['local_path']):
        raise HTTPException(status_code=404, detail="Video file not found")

    # Serve the video file
    return FileResponse(
        video['local_path'],
        media_type='video/mp4',
        headers={"Accept-Ranges": "bytes"}
    )

@app.get("/api/playlist_updates")
async def trigger_playlist_updates(background_tasks: BackgroundTasks):
    """Manually trigger playlist update check"""
    background_tasks.add_task(check_playlist_updates)
    return {"message": "Playlist update check started"}

@app.on_event("startup")
async def startup_event():
    """Initialize background tasks on startup"""
    # Start playlist monitoring in background
    import asyncio
    asyncio.create_task(playlist_monitor_task())

async def playlist_monitor_task():
    """Background task to monitor playlists for updates"""
    while True:
        try:
            await check_playlist_updates()
        except Exception as e:
            print(f"Error in playlist monitoring: {e}")
        # Check every 6 hours
        await asyncio.sleep(6 * 60 * 60)

# ==================== API ENDPOINTS FOR ALL 50 FEATURES ====================

# TAGGING FEATURES
@app.post("/api/tags/add")
async def api_add_tags(video_id: str = Form(...), tags: str = Form(...), auth_token: str = Cookie(None)):
    """Add tags to video"""
    from features import add_tag
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    
    tag_list = [t.strip() for t in tags.split(',') if t.strip()]
    return add_tag(video_id, tag_list, username)

@app.get("/api/tags/{video_id}")
async def api_get_tags(video_id: str, auth_token: str = Cookie(None)):
    """Get tags for video"""
    from features import get_tags
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return {'tags': get_tags(video_id, username)}

@app.get("/api/tags/all")
async def api_all_tags(auth_token: str = Cookie(None)):
    """Get all tags for user"""
    from features import get_all_tags
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    tags = get_all_tags(username)
    return {'tags': dict(tags)}

# FAVORITE FEATURES
@app.post("/api/favorites/toggle")
async def api_toggle_favorite(video_id: str = Form(...), auth_token: str = Cookie(None)):
    """Toggle favorite status"""
    from features import toggle_favorite
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return toggle_favorite(video_id, username)

@app.get("/api/favorites")
async def api_get_favorites(auth_token: str = Cookie(None)):
    """Get favorite videos"""
    from features import get_favorites
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return {'favorites': get_favorites(username)}

@app.get("/api/favorites/check/{video_id}")
async def api_check_favorite(video_id: str, auth_token: str = Cookie(None)):
    """Check if video is favorited"""
    from features import is_favorite
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return {'is_favorite': is_favorite(video_id, username)}

# WATCH HISTORY
@app.post("/api/history/add")
async def api_add_history(video_id: str = Form(...), auth_token: str = Cookie(None)):
    """Add to watch history"""
    from features import add_to_watch_history
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return add_to_watch_history(video_id, username)

@app.get("/api/history")
async def api_get_history(limit: int = 20, auth_token: str = Cookie(None)):
    """Get watch history"""
    from features import get_watch_history
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return {'history': get_watch_history(username, limit)}

# BATCH OPERATIONS
@app.post("/api/batch/move")
async def api_batch_move(video_ids: str = Form(...), folder: str = Form(...), auth_token: str = Cookie(None)):
    """Batch move videos"""
    from features import batch_move_videos
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    ids = [v.strip() for v in video_ids.split(',')]
    return batch_move_videos(ids, folder, username)

@app.post("/api/batch/delete")
async def api_batch_delete(video_ids: str = Form(...), auth_token: str = Cookie(None)):
    """Batch delete videos"""
    from features import batch_delete_videos
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    ids = [v.strip() for v in video_ids.split(',')]
    return batch_delete_videos(ids, username)

@app.post("/api/batch/tags")
async def api_batch_tags(video_ids: str = Form(...), tags: str = Form(...), auth_token: str = Cookie(None)):
    """Batch add tags"""
    from features import batch_add_tags
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    ids = [v.strip() for v in video_ids.split(',')]
    tag_list = [t.strip() for t in tags.split(',')]
    return batch_add_tags(ids, tag_list, username)

# AUTO ORGANIZE
@app.post("/api/organize/by-date")
async def api_organize_by_date(auth_token: str = Cookie(None)):
    """Auto organize by date"""
    from features import auto_organize_by_date
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return auto_organize_by_date(username)

# SEARCH FEATURES
@app.get("/api/search/advanced")
async def api_advanced_search(query: str = "", folder: str = "", auth_token: str = Cookie(None)):
    """Advanced search"""
    from features import advanced_search
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    
    filters = {}
    if folder:
        filters['folder'] = folder
    
    results = advanced_search(username, query, filters)
    return {'results': results, 'count': len(results)}

# COMMENTS
@app.post("/api/comments/add")
async def api_add_comment(video_id: str = Form(...), comment: str = Form(...), auth_token: str = Cookie(None)):
    """Add comment"""
    from features import add_comment
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return add_comment(video_id, username, comment)

@app.get("/api/comments/{video_id}")
async def api_get_comments(video_id: str):
    """Get comments"""
    from features import get_comments
    return {'comments': get_comments(video_id)}

# RATINGS
@app.post("/api/ratings/add")
async def api_rate_video(video_id: str = Form(...), rating: int = Form(...), auth_token: str = Cookie(None)):
    """Rate video"""
    from features import rate_video
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return rate_video(video_id, username, rating)

@app.get("/api/ratings/{video_id}")
async def api_get_rating(video_id: str):
    """Get video rating"""
    from features import get_average_rating
    return {'average_rating': get_average_rating(video_id)}

# SHARING
@app.post("/api/share/create")
async def api_create_share(video_id: str = Form(...), auth_token: str = Cookie(None)):
    """Create share link"""
    from features import create_share_link
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return create_share_link(video_id, username)

@app.get("/api/share/{share_code}")
async def api_get_share(share_code: str):
    """Get shared video"""
    from features import get_shared_video
    video = get_shared_video(share_code)
    if not video:
        raise HTTPException(status_code=404, detail="Share not found")
    return video

# ANALYTICS
@app.get("/api/dashboard")
async def api_dashboard(auth_token: str = Cookie(None)):
    """Get user dashboard"""
    from features import get_user_dashboard
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return get_user_dashboard(username)

@app.get("/api/storage")
async def api_storage(auth_token: str = Cookie(None)):
    """Get storage info"""
    from features import get_storage_info
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return get_storage_info(username)

@app.post("/api/storage/cleanup")
async def api_cleanup_storage(days: int = 90, auth_token: str = Cookie(None)):
    """Cleanup old videos"""
    from features import cleanup_storage
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return cleanup_storage(username, days)

@app.get("/api/stats/{video_id}")
async def api_video_stats(video_id: str):
    """Get video stats"""
    from features import get_video_stats, increment_view_count
    increment_view_count(video_id)
    return get_video_stats(video_id)

# Social Media API endpoints
@app.get("/api/social")
async def api_get_social_links():
    """Get social media links"""
    return load_social_db()

@app.post("/api/social")
async def api_update_social_links(
    facebook: str = Form(None),
    whatsapp: str = Form(None),
    instagram: str = Form(None),
    telegram: str = Form(None),
    auth_token: str = Cookie(None)
):
    """Update social media links (admin only)"""
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        from auth import verify_token, load_users
        username = verify_token(auth_token)
        users = load_users()
        if username not in users or users[username].get("role") != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    
    social_db = load_social_db()
    
    if facebook is not None:
        social_db["facebook"] = facebook
    if whatsapp is not None:
        social_db["whatsapp"] = whatsapp
    if instagram is not None:
        social_db["instagram"] = instagram
    if telegram is not None:
        social_db["telegram"] = telegram
    
    save_social_db(social_db)
    return {"message": "Social media links updated successfully", "data": social_db}

# SECURITY
@app.post("/api/folder/password")
async def api_set_folder_password(folder: str = Form(...), password: str = Form(...), auth_token: str = Cookie(None)):
    """Set folder password"""
    from features import set_folder_password
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return set_folder_password(folder, password, username)

@app.post("/api/2fa/enable")
async def api_enable_2fa(auth_token: str = Cookie(None)):
    """Enable 2FA"""
    from features import enable_2fa
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return enable_2fa(username)

@app.post("/api/2fa/verify")
async def api_verify_2fa(token: str = Form(...), auth_token: str = Cookie(None)):
    """Verify 2FA token"""
    from features import verify_2fa_token
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return {'verified': verify_2fa_token(username, token)}

# EXPORT
@app.get("/api/export/data")
async def api_export_data(auth_token: str = Cookie(None)):
    """Export all user data"""
    from features import export_user_data
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    return export_user_data(username)

# DASHBOARD ENDPOINT
@app.get("/api/dashboard")
async def api_dashboard(auth_token: str = Cookie(None)):
    """Get comprehensive dashboard data"""
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        from auth import verify_token
        username = verify_token(auth_token)
    except:
        raise HTTPException(status_code=401, detail="Invalid auth")
    
    from features import (
        get_user_dashboard, get_all_tags, get_favorites,
        get_watch_history, get_storage_info, get_recent_activity
    )
    
    try:
        dashboard = get_user_dashboard(username)
        all_tags = get_all_tags(username)
        favorites = get_favorites(username)
        history = get_watch_history(username, 5)
        storage = get_storage_info(username)
        activity = get_recent_activity(username, 10)
        
        return {
            'total_videos': dashboard.get('total_videos', 0),
            'total_favorites': dashboard.get('total_favorites', 0),
            'total_tags': len(all_tags),
            'top_tags': list(dict(sorted(all_tags.items(), key=lambda x: x[1], reverse=True)[:10]).keys()),
            'storage_info': storage,
            'recent_videos': favorites[:5],
            'watch_history': history,
            'recent_activity': activity,
            'stats': {
                'videos_watched': len(history),
                'favorites_count': len(favorites),
                'tags_count': len(all_tags)
            }
        }
    except Exception as e:
        print(f"Dashboard error: {e}")
        return {
            'total_videos': 0,
            'total_favorites': 0,
            'total_tags': 0,
            'top_tags': [],
            'storage_info': {'total_size_gb': 0, 'used_size_gb': 0},
            'recent_videos': [],
            'watch_history': [],
            'recent_activity': [],
            'stats': {'videos_watched': 0, 'favorites_count': 0, 'tags_count': 0}
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))