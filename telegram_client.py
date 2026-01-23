import asyncio
import os
from pyrogram import Client
from pyrogram.types import Message
import config
import json
from datetime import datetime

async def get_client(username=None):
    """Get Telegram client with user-specific or global credentials"""
    # Get user-specific settings first, fallback to global
    telegram_config = config.get_user_telegram_config(username)

    api_id = telegram_config.get('api_id') or config.API_ID
    api_hash = telegram_config.get('api_hash') or config.API_HASH

    if not api_id or not api_hash:
        raise ValueError("Telegram API credentials not configured. Please set your API ID and API Hash in settings.")

    if config.BOT_TOKEN:
        # Use bot client
        client = Client(
            "bot_session",
            api_id=int(api_id),
            api_hash=api_hash,
            bot_token=config.BOT_TOKEN
        )
    else:
        # Use user client
        session_file = f"telegram_session_{username}" if username else config.SESSION_FILE
        client = Client(
            session_file,
            api_id=int(api_id),
            api_hash=api_hash
        )
    await client.start()
    return client

async def fetch_videos_from_channel(channel_id, username=None):
    client = await get_client(username)
    videos = []
    try:
        chat = await client.get_chat(channel_id)
        channel_name = chat.title
        async for message in client.get_chat_history(channel_id):
            if message.video:
                video = message.video
                unique_id = f"{channel_id}_{message.id}"
                thumbnail_path = await download_thumbnail_if_needed(client, video.thumbnail, unique_id)
                data = {
                    'unique_video_id': unique_id,
                    'message_id': message.id,
                    'channel_id': channel_id,
                    'channel_name': channel_name,
                    'title': message.caption or video.file_name or f"Video {message.id}",
                    'description': message.caption,
                    'stream_url': f"/stream/{video.file_id}",
                    'thumbnail_path': thumbnail_path,
                    'file_size': video.file_size,
                    'duration': video.duration,
                    'mime_type': video.mime_type,
                    'views_count': 0,
                    'category': '',
                    'added_time': message.date.timestamp(),
                    'last_updated': message.date.timestamp()
                }
                videos.append(data)
    except Exception as e:
        print(f"Error fetching from {channel_id}: {e}")
    finally:
        await client.stop()
    return videos

async def download_thumbnail_if_needed(client, thumbnail, unique_id):
    if not thumbnail:
        return None
    save_path = os.path.join(config.THUMBNAILS_DIR, f"{unique_id}.jpg")
    if not os.path.exists(save_path):
        await client.download_media(thumbnail.file_id, file=save_path)
    return save_path

async def get_video_stream(client, file_id):
    # This will be used in app.py for streaming
    # But since client is per call, perhaps pass file_id and download on demand
    pass

# Function to get all videos from all channels
async def fetch_all_videos():
    all_videos = []
    for channel in config.CHANNELS:
        videos = await fetch_videos_from_channel(channel.strip())
        all_videos.extend(videos)
    return all_videos