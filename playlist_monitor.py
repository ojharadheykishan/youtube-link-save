"""
YouTube Playlist Monitor - Background Task
Run this separately: python playlist_monitor.py
"""

import asyncio
import json
import os
from datetime import datetime

VIDEO_DB = "video_db.json"
PLAYLIST_DB = "playlist_db.json"
NOTIFICATIONS_DB = "notifications_db.json"

def load_db():
    try:
        with open(VIDEO_DB, 'r') as f:
            return json.load(f)
    except:
        return {}

def load_playlist_db():
    try:
        with open(PLAYLIST_DB, 'r') as f:
            return json.load(f)
    except:
        return {}

def save_playlist_db(db):
    try:
        with open(PLAYLIST_DB, 'w') as f:
            json.dump(db, f, indent=2)
    except Exception as e:
        print(f"Error: {e}")

def load_notifications():
    try:
        with open(NOTIFICATIONS_DB, 'r') as f:
            return json.load(f)
    except:
        return {}

def save_notifications(db):
    try:
        with open(NOTIFICATIONS_DB, 'w') as f:
            json.dump(db, f, indent=2)
    except Exception as e:
        print(f"Error: {e}")

def add_notification(user_id, notification):
    db = load_notifications()
    if user_id not in db:
        db[user_id] = []
    
    notification['id'] = f"notif_{datetime.now().timestamp()}"
    notification['created_at'] = datetime.now().isoformat()
    notification['read'] = False
    
    db[user_id].insert(0, notification)
    db[user_id] = db[user_id][:50]
    save_notifications(db)
    return notification

async def check_playlist_updates():
    """Check for new videos in monitored playlists"""
    print("Checking for playlist updates...")
    
    import yt_dlp
    
    playlist_db = load_playlist_db()
    db = load_db()
    
    new_videos = 0
    notifications = 0
    
    for playlist_id, info in playlist_db.items():
        if not info.get('monitor', False):
            continue
        
        try:
            print(f"Checking: {info.get('title', playlist_id)}")
            url = info.get('url')
            username = info.get('username')
            folder_name = info.get('folder_name')
            
            if not url or not username:
                continue
            
            ydl_opts = {
                'quiet': True,
                'extract_flat': 'in_playlist',
                'playlist_items': '1:500',
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                result = ydl.extract_info(url, download=False)
                
                if 'entries' not in result or not result['entries']:
                    continue
                
                # Get existing videos
                existing = set()
                for vid, v in db.items():
                    if v.get('playlist_id') == playlist_id:
                        existing.add(v.get('original_video_id', ''))
                
                # Find new videos
                for entry in result['entries']:
                    if not entry or not entry.get('id'):
                        continue
                    
                    vid_id = entry.get('id')
                    
                    if vid_id in existing:
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
                        'folder_name': folder_name,
                        'folder_path': folder_name,
                        'duration': entry.get('duration', 0),
                        'uploader': entry.get('uploader', 'Unknown'),
                        'added_time': datetime.now().isoformat(),
                        'views_count': 0,
                        'source_type': 'youtube_playlist_auto',
                        'playlist_id': playlist_id,
                        'user_id': username
                    }
                    
                    new_videos += 1
                    notifications += 1
                    
                    # Send notification
                    add_notification(username, {
                        'type': 'playlist_new_video',
                        'title': 'New Video!',
                        'message': entry.get('title', 'Unknown')[:50],
                        'playlist_name': info.get('title', 'Playlist'),
                        'video_id': unique_id,
                        'thumbnail': f"https://img.youtube.com/vi/{vid_id}/mqdefault.jpg"
                    })
            
            info['last_checked'] = datetime.now().isoformat()
            save_playlist_db(playlist_db)
            
        except Exception as e:
            print(f"Error: {e}")
            continue
    
    # Save database
    try:
        with open(VIDEO_DB, 'w') as f:
            json.dump(db, f, indent=2)
    except Exception as e:
        print(f"DB Error: {e}")
    
    if new_videos > 0:
        print(f"Done: {new_videos} new videos, {notifications} notifications")
    else:
        print("No new videos found")
    
    return new_videos, notifications

async def run_monitor():
    """Run monitor every 30 minutes"""
    while True:
        try:
            await check_playlist_updates()
        except Exception as e:
            print(f"Monitor error: {e}")
        await asyncio.sleep(1800)  # 30 minutes

if __name__ == "__main__":
    asyncio.run(run_monitor())
