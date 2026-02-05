"""
RSS Feed & Progress Tracking API Routes
"""

from fastapi import APIRouter, HTTPException, Cookie, Response
from starlette.responses import JSONResponse
import json
from datetime import datetime

RSS_DB = "rss_feeds.json"

def load_rss_db():
    try:
        with open(RSS_DB, 'r') as f:
            return json.load(f)
    except:
        return {}

def save_rss_db(db):
    try:
        with open(RSS_DB, 'w') as f:
            json.dump(db, f, indent=2)
    except Exception as e:
        print(f"Error saving RSS DB: {e}")

# RSS Feed API endpoints
rss_router = APIRouter()

@rss_router.get("/api/rss/{playlist_id}")
async def get_playlist_rss(playlist_id: str, auth_token: str = Cookie(None)):
    """Generate RSS feed for a playlist"""
    username = None
    if auth_token:
        try:
            from auth import verify_token
            username = verify_token(auth_token)
        except:
            pass
    
    try:
        from app import load_playlist_db, load_db
        playlist_db = load_playlist_db()
        db = load_db()
        
        if playlist_id not in playlist_db:
            raise HTTPException(status_code=404, detail="Playlist not found")
        
        playlist_info = playlist_db[playlist_id]
        playlist_videos = []
        
        for video_id, video in db.items():
            if video.get('playlist_id') == playlist_id:
                playlist_videos.append(video)
        
        playlist_videos.sort(key=lambda x: x.get('added_time', ''), reverse=True)
        
        base_url = "http://localhost:10000"
        
        rss_xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
    <title>{playlist_info.get('title', 'YouTube Playlist')}</title>
    <description>Updates for YouTube playlist</description>
    <link>{playlist_info.get('url', '')}</link>
    <atom:link href="{base_url}/api/rss/{playlist_id}" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <lastBuildDate>{datetime.now().strftime('%a, %d %b %Y %H:%M:%S GMT')}</lastBuildDate>
'''
        
        for video in playlist_videos[:50]:
            original_id = video.get('original_video_id', '')
            thumbnail = f"https://img.youtube.com/vi/{original_id}/mqdefault.jpg" if original_id else ""
            
            rss_xml += f'''
    <item>
        <title><![CDATA[{video.get('title', 'Unknown')}]]></title>
        <link>{video.get('url', '')}</link>
        <guid isPermaLink="false">{video.get('video_id', '')}</guid>
        <pubDate>{video.get('added_time', datetime.now().isoformat())}</pubDate>
    </item>'''
        
        rss_xml += '''
</channel>
</rss>'''
        
        return Response(content=rss_xml, media_type="application/rss+xml")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@rss_router.get("/api/rss")
async def list_rss_feeds(auth_token: str = Cookie(None)):
    """List all RSS feeds for user"""
    username = None
    if auth_token:
        try:
            from auth import verify_token
            username = verify_token(auth_token)
        except:
            pass
    
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        from app import load_playlist_db
        playlist_db = load_playlist_db()
        
        user_playlists = {}
        for pid, info in playlist_db.items():
            if info.get('username') == username and info.get('monitor', False):
                user_playlists[pid] = {
                    'title': info.get('title', 'Unknown'),
                    'rss_url': f"/api/rss/{pid}"
                }
        
        return {'feeds': user_playlists}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Progress tracking endpoints
@rss_router.get("/api/progress")
async def get_watch_progress(auth_token: str = Cookie(None)):
    """Get all watch progress for user"""
    username = None
    if auth_token:
        try:
            from auth import verify_token
            username = verify_token(auth_token)
        except:
            pass
    
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        from app import load_db
        db = load_db()
        
        progress = {}
        for video_id, video in db.items():
            if video.get('user_id') == username:
                progress[video_id] = {
                    'title': video.get('title', 'Unknown'),
                    'progress': video.get('watch_progress', 0),
                    'watch_time': video.get('watch_time_seconds', 0),
                    'last_position': video.get('last_position_seconds', 0),
                    'completed': video.get('completed', False)
                }
        
        return {'progress': progress}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@rss_router.post("/api/progress/{video_id}")
async def update_video_progress(
    video_id: str,
    progress_percent: float = 0,
    current_time: float = 0,
    auth_token: str = Cookie(None)
):
    """Update watch progress for a video"""
    username = None
    if auth_token:
        try:
            from auth import verify_token
            username = verify_token(auth_token)
        except:
            pass
    
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        from app import load_db, save_db
        db = load_db()
        
        if video_id not in db:
            raise HTTPException(status_code=404, detail="Video not found")
        
        if db[video_id].get('user_id') != username:
            raise HTTPException(status_code=403, detail="Access denied")
        
        db[video_id]['watch_progress'] = min(100, max(0, progress_percent))
        db[video_id]['last_position_seconds'] = current_time
        db[video_id]['watch_time_seconds'] = db[video_id].get('watch_time_seconds', 0) + 1
        db[video_id]['last_watched'] = datetime.now().isoformat()
        
        if progress_percent >= 90:
            db[video_id]['completed'] = True
            db[video_id]['completed_at'] = datetime.now().isoformat()
        
        save_db(db)
        
        return {'message': 'Progress updated', 'video_id': video_id, 'progress': progress_percent}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@rss_router.delete("/api/progress/{video_id}")
async def reset_video_progress(video_id: str, auth_token: str = Cookie(None)):
    """Reset watch progress for a video"""
    username = None
    if auth_token:
        try:
            from auth import verify_token
            username = verify_token(auth_token)
        except:
            pass
    
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        from app import load_db, save_db
        db = load_db()
        
        if video_id not in db:
            raise HTTPException(status_code=404, detail="Video not found")
        
        if db[video_id].get('user_id') != username:
            raise HTTPException(status_code=403, detail="Access denied")
        
        db[video_id]['watch_progress'] = 0
        db[video_id]['last_position_seconds'] = 0
        db[video_id]['watch_time_seconds'] = 0
        db[video_id]['completed'] = False
        db[video_id].pop('completed_at', None)
        
        save_db(db)
        
        return {'message': 'Progress reset', 'video_id': video_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@rss_router.get("/api/progress/stats")
async def get_progress_stats(auth_token: str = Cookie(None)):
    """Get watch progress statistics"""
    username = None
    if auth_token:
        try:
            from auth import verify_token
            username = verify_token(auth_token)
        except:
            pass
    
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        from app import load_db
        db = load_db()
        
        stats = {
            'total_videos': 0,
            'watched': 0,
            'completed': 0,
            'total_watch_time_seconds': 0
        }
        
        for video_id, video in db.items():
            if video.get('user_id') == username:
                stats['total_videos'] += 1
                stats['total_watch_time_seconds'] += video.get('watch_time_seconds', 0)
                
                if video.get('watch_progress', 0) > 0:
                    stats['watched'] += 1
                
                if video.get('completed', False):
                    stats['completed'] += 1
        
        return {'stats': stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
