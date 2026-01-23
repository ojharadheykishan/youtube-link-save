# Configuration for VideoHub
import os

# Default values - can be overridden by user settings
API_ID = os.environ.get('TELEGRAM_API_ID', '')
API_HASH = os.environ.get('TELEGRAM_API_HASH', '')
BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')

# Session file for user client
SESSION_FILE = "telegram_session"

# Database files
VIDEO_DB = "video_db.json"
FOLDER_DB = "folder_db.json"
USERS_DB = "users_db.json"

# User settings storage
USER_SETTINGS_FILE = "user_settings.json"

def get_user_telegram_config(username=None):
    """Get Telegram config for a specific user"""
    try:
        if os.path.exists(USER_SETTINGS_FILE):
            with open(USER_SETTINGS_FILE, 'r') as f:
                settings = json.load(f)
                if username and username in settings:
                    return settings[username].get('telegram', {})
                elif not username:
                    # Return default/global settings
                    return settings.get('global', {}).get('telegram', {})
    except:
        pass
    return {}

def save_user_telegram_config(username, api_id, api_hash):
    """Save Telegram config for a user"""
    try:
        settings = {}
        if os.path.exists(USER_SETTINGS_FILE):
            with open(USER_SETTINGS_FILE, 'r') as f:
                settings = json.load(f)

        if username not in settings:
            settings[username] = {}

        settings[username]['telegram'] = {
            'api_id': api_id,
            'api_hash': api_hash
        }

        with open(USER_SETTINGS_FILE, 'w') as f:
            json.dump(settings, f, indent=2)

        return True
    except Exception as e:
        print(f"Error saving Telegram config: {e}")
        return False

# Import json for the functions above
import json