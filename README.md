# YouTube Link Save

A YouTube-style video hub application built with Flask, designed for saving, organizing, and watching YouTube videos in a clean, responsive interface. This app allows users to add YouTube links with titles, thumbnails, and organize them into folders, providing a personalized video library experience.

## Features

- **Folder Selection**: Organize videos into custom folders. Select from existing folders or create new ones when adding videos.
- **Animated Design**: Smooth CSS animations and JavaScript effects for an engaging user experience, including hover effects, fade-ins, and interactive elements.
- **Real-Time Search**: Instant search functionality across video titles and folders, with animated show/hide transitions.
- **Responsive Design**: Mobile-friendly layout that adapts to different screen sizes using CSS media queries.

## Installation

1. Ensure you have Python 3.6+ installed on your system.
2. Clone or download the project repository.
3. Navigate to the project directory.
4. Install the required dependencies:

   ```bash
   pip install flask
   ```

## Usage

1. Run the Flask application:

   ```bash
   python app.py
   ```

2. Open your web browser and navigate to `http://localhost:5000`.
3. Add new videos by filling out the form on the home page:
   - Enter a title for the video.
   - Provide the YouTube URL.
   - Select an existing folder or enter a new folder name.
   - Optionally, add a thumbnail URL.
4. Browse videos on the home page or filter by folder using the folder links.
5. Click on a video card to watch it in the embedded player.
6. Use the search bar to filter videos in real-time.

## API Routes Documentation

The application uses the following routes:

- `GET /`: Home page displaying all videos and folders.
- `POST /add`: Add a new video. Expects form data with `title`, `url`, `folder` (or `new_folder`), and optional `thumbnail`.
- `GET /folders/<folder_name>`: Display videos in a specific folder.
- `GET /watch/<int:video_id>`: Watch page with embedded YouTube player for the specified video.

## File Structure

```
youtube-link-save/
├── app.py                 # Main Flask application
├── README.md              # Project documentation
├── QUICKSTART.md          # Quick setup guide
├── data/
│   ├── videos.json        # Stored video data
│   └── folders.json       # Stored folder data
├── static/
│   ├── animations.js      # JavaScript for animations and interactions
│   └── youtube.css        # CSS styles and animations
└── templates/
    ├── index.html         # Home page template
    ├── folder.html        # Folder-specific video list template
    └── watch.html         # Video watch page template
```

## Dependencies

- **Flask**: Web framework for Python.
- **json**: Built-in Python module for JSON handling.
- **os**: Built-in Python module for operating system interactions.

## Data Storage

Video and folder data are stored in JSON files within the `data/` directory:
- `videos.json`: Contains an array of video objects with id, title, url, folder, and thumbnail.
- `folders.json`: Contains an array of folder names.

The application automatically creates these files if they do not exist.