"""
Notification API Routes - Add to app.py
"""

from fastapi import APIRouter, HTTPException, Cookie, Form
from starlette.responses import JSONResponse
import json
import os
from datetime import datetime

NOTIFICATIONS_DB = "notifications_db.json"

def load_notifications():
    try:
        with open(NOTIFICATIONS_DB, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_notifications(db):
    try:
        with open(NOTIFICATIONS_DB, 'w') as f:
            json.dump(db, f, indent=2)
    except Exception as e:
        print(f"Error saving notifications: {e}")

def verify_auth(auth_token):
    """Verify authentication token"""
    if not auth_token:
        return None
    try:
        from auth import verify_token
        return verify_token(auth_token)
    except:
        return None

# Notification API endpoints
notifications_router = APIRouter()

@notifications_router.get("/api/notifications")
async def get_notifications(auth_token: str = Cookie(None)):
    """Get user notifications"""
    username = verify_auth(auth_token)
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = load_notifications()
    user_notifications = db.get(username, [])
    
    unread_count = sum(1 for n in user_notifications if not n.get('read', False))
    
    return {
        "notifications": user_notifications[:50],
        "unread_count": unread_count
    }

@notifications_router.post("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, auth_token: str = Cookie(None)):
    """Mark a notification as read"""
    username = verify_auth(auth_token)
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = load_notifications()
    
    if username not in db:
        raise HTTPException(status_code=404, detail="No notifications found")
    
    found = False
    for notif in db[username]:
        if notif.get('id') == notification_id:
            notif['read'] = True
            found = True
            break
    
    if found:
        save_notifications(db)
        return {"message": "Notification marked as read"}
    else:
        raise HTTPException(status_code=404, detail="Notification not found")

@notifications_router.post("/api/notifications/read-all")
async def mark_all_read(auth_token: str = Cookie(None)):
    """Mark all notifications as read"""
    username = verify_auth(auth_token)
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = load_notifications()
    
    if username in db:
        for notif in db[username]:
            notif['read'] = True
        save_notifications(db)
    
    return {"message": "All notifications marked as read"}

@notifications_router.delete("/api/notifications")
async def clear_notifications(auth_token: str = Cookie(None)):
    """Clear all notifications"""
    username = verify_auth(auth_token)
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db = load_notifications()
    db[username] = []
    save_notifications(db)
    
    return {"message": "All notifications cleared"}

@notifications_router.get("/api/notifications/count")
async def get_unread_count(auth_token: str = Cookie(None)):
    """Get unread notification count"""
    username = verify_auth(auth_token)
    if not username:
        return {"count": 0}
    
    db = load_notifications()
    user_notifications = db.get(username, [])
    count = sum(1 for n in user_notifications if not n.get('read', False))
    
    return {"count": count}

# Playlist monitoring endpoints
@notifications_router.post("/api/playlists/{playlist_id}/check")
async def check_playlist_now(playlist_id: str, auth_token: str = Cookie(None)):
    """Manually check a playlist for new videos"""
    username = verify_auth(auth_token)
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    from app import load_db, load_playlist_db, save_db, save_playlist_db
    
    playlist_db = load_playlist_db()
    
    if playlist_id not in playlist_db:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    playlist_info = playlist_db[playlist_id]
    
    if playlist_info.get('username') != username:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check for new videos
    import yt_dlp
    
    playlist_url = playlist_info.get('url')
    db = load_db()
    
    new_videos = 0
    
    try:
        ydl_opts = {
            'quiet': True,
            'extract_flat': 'in_playlist',
            'playlist_items': '1:500',
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(playlist_url, download=False)
            
            if 'entries' in info and info['entries']:
                existing_ids = set()
                for vid, video in db.items():
                    if video.get('playlist_id') == playlist_id:
                        existing_ids.add(video.get('original_video_id', ''))
                
                for entry in info['entries']:
                    if not entry or not entry.get('id'):
                        continue
                    
                    vid_id = entry.get('id')
                    
                    if vid_id in existing_ids:
                        continue
                    
                    unique_id = f"{vid_id}_{playlist_id}"
                    
                    if unique_id in db:
                        continue
                    
                    # Add new video
                    db[unique_id] = {
                        'video_id': unique_id,
                        'original_video_id': vid_id,
                        'title': entry.get('title', 'Unknown'),
                        'url': f"https://www.youtube.com/watch?v={vid_id}",
                        'folder_name': playlist_info.get('folder_name', 'Playlist'),
                        'folder_path': playlist_info.get('folder_name', 'Playlist'),
                        'duration': entry.get('duration', 0),
                        'uploader': entry.get('uploader', 'Unknown'),
                        'added_time': datetime.now().isoformat(),
                        'views_count': 0,
                        'source_type': 'youtube_playlist_auto',
                        'playlist_id': playlist_id,
                        'user_id': username
                    }
                    
                    new_videos += 1
                    
                    # Add notification
                    notifications_db = load_notifications()
                    if username not in notifications_db:
                        notifications_db[username] = []
                    
                    notifications_db[username].insert(0, {
                        'id': f"notif_{datetime.now().timestamp()}",
                        'type': 'playlist_new_video',
                        'title': '🎬 New Video in Playlist!',
                        'message': entry.get('title', 'Unknown')[:60],
                        'playlist_name': playlist_info.get('title', 'Playlist'),
                        'video_id': unique_id,
                        'video_title': entry.get('title', 'Unknown'),
                        'thumbnail': f"https://img.youtube.com/vi/{vid_id}/mqdefault.jpg",
                        'created_at': datetime.now().isoformat(),
                        'read': False
                    })
                    
                    # Keep only last 50 notifications
                    notifications_db[username] = notifications_db[username][:50]
                    save_notifications(notifications_db)
                
                playlist_info['last_checked'] = datetime.now().isoformat()
                save_playlist_db(playlist_db)
                save_db(db)
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking playlist: {str(e)}")
    
    return {
        "message": f"Found {new_videos} new videos",
        "new_videos": new_videos,
        "playlist_id": playlist_id
    }

@notifications_router.delete("/api/playlists/{playlist_id}/monitor")
async def remove_playlist_monitor(playlist_id: str, auth_token: str = Cookie(None)):
    """Remove playlist from monitoring"""
    username = verify_auth(auth_token)
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    from app import load_playlist_db, save_playlist_db
    
    playlist_db = load_playlist_db()
    
    if playlist_id not in playlist_db:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    playlist_info = playlist_db[playlist_id]
    
    if playlist_info.get('username') != username:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Remove monitoring but keep videos
    playlist_info['monitor'] = False
    save_playlist_db(playlist_db)
    
    return {"message": "Playlist monitoring stopped"}

def add_notification(username, notification):
    """Helper to add notification"""
    db = load_notifications()
    
    if username not in db:
        db[username] = []
    
    notification['id'] = f"notif_{datetime.now().timestamp()}"
    notification['created_at'] = datetime.now().isoformat()
    notification['read'] = False
    
    db[username].insert(0, notification)
    db[username] = db[username][:50]
    save_notifications(db)
    
    return notification
