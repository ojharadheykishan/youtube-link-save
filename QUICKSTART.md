n# Quick Start Guide for YouTube Link Save

## Prerequisites

- Python 3.6 or higher
- pip (Python package installer)

## Setup

1. **Clone or Download the Project**
   - Download the project files to your local machine.

2. **Install Dependencies**
   ```bash
   pip install flask
   ```

3. **Run the Application**
    ```bash
    python app.py
    ```

4. **Access the App**
    - Open your browser and go to `http://localhost:10000`
    - Register a new account or login

## First Steps

1. **Configure Telegram (Optional)**
    - Click the settings icon (⚙️) in the header
    - Enter your Telegram API ID and API Hash from https://my.telegram.org/apps
    - This allows syncing videos from Telegram channels

2. **Add Content - Single Videos or Playlists**
    - **Single Video**: Enter YouTube URL, select/create folder, click "Add Video"
    - **Entire Playlist**: Switch to "YouTube Playlist" tab, paste playlist URL, choose folder, optionally enable monitoring

3. **Playlist Features**
    - **Bulk Import**: Add all videos from a YouTube playlist at once
    - **Local Download**: Videos are downloaded locally for offline playback
    - **Auto-Monitoring**: Get notified when new videos are added to monitored playlists
    - **Persistent Access**: Videos remain playable even if deleted from YouTube

4. **Sync Telegram Videos**
    - In the "Sync Telegram Videos" section, enter a channel username (e.g., @Rk_Movie096)
    - Click "Sync Now" to import videos from that channel

5. **Organize Videos**
    - Videos are automatically organized into folders.
    - Click on folder names to view videos in that folder.

6. **Watch Videos**
    - **Local Playback**: Downloaded videos play directly from your server (no YouTube restrictions)
    - **Quality Control**: Adjust video quality and playback speed
    - **Offline Access**: Videos work even without internet connection

7. **Search Videos**
    - Use the search bar to filter videos by title or folder in real-time.

## Troubleshooting

- If port 10000 is busy, modify the PORT environment variable or change the default in `app.py`.
- Ensure the `data/` directory exists and is writable for storing video data.