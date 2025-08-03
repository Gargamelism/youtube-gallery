# Video Gallery - Local Excel Reader

A React-based video gallery application that reads Excel files locally and displays videos in a YouTube-like interface with Hebrew/English text support.

## Features

- 📊 **Excel Integration**: Reads local Excel files with video metadata
- 🎬 **YouTube-like Interface**: Card-based layout with thumbnails and video info
- 🌐 **Multilingual Support**: Automatic RTL/LTR alignment for Hebrew and English text
- ✅ **Watch Tracking**: Mark videos as watched (removes from list)
- 🖥️ **Desktop Optimized**: Designed for wide-screen desktop viewing
- 🎯 **No Upload Required**: Direct local file access

## Prerequisites

- **Node.js** (LTS version recommended)
  - Download from [nodejs.org](https://nodejs.org/)
  - Includes npm (Node Package Manager)

## Installation

1. **Create the React application:**
   ```bash
   npx create-react-app video-gallery
   cd video-gallery
   ```

2. **Install required dependencies:**
   ```bash
   npm install xlsx lucide-react
   ```

3. **Replace the default App component:**
   - Delete `src/App.js`
   - Create new `src/App.js` with the video gallery component code
   - Update `src/App.css` with the provided styles (optional)

4. **Set up Tailwind CSS for Create React App:**
   
   **Option A: Quick Setup (CDN - Recommended for testing)**
   
   Add this line to your `public/index.html` in the `<head>` section:
   ```html
   <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
   ```
   
   Your `public/index.html` should look like:
   ```html
   <!DOCTYPE html>
   <html lang="en">
     <head>
       <meta charset="utf-8" />
       <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
       <meta name="viewport" content="width=device-width, initial-scale=1" />
       <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
       <title>Video Gallery</title>
     </head>
     <body>
       <!-- ... rest of the file ... -->
     </body>
   </html>
   ```

   **Option B: Full Installation (Recommended for Create React App)**
   
   Create React App has built-in PostCSS support, so follow these steps:
   
   1. **Install Tailwind and its peer dependencies:**
      ```bash
      npm install -D tailwindcss postcss autoprefixer
      ```
   
   2. **Generate configuration files:**
      ```bash
      npx tailwindcss init -p
      ```
   
   3. **Configure your template paths in `tailwind.config.js`:**
      ```javascript
      /** @type {import('tailwindcss').Config} */
      module.exports = {
        content: [
          "./src/**/*.{js,jsx,ts,tsx}",
          "./public/index.html"
        ],
        theme: {
          extend: {},
        },
        plugins: [],
      }
      ```
   
   4. **Replace the contents of `src/index.css` with:**
      ```css
      @tailwind base;
      @tailwind components;
      @tailwind utilities;
      ```
   
   5. **Make sure `src/index.css` is imported in `src/index.js`:**
      ```javascript
      import React from 'react';
      import ReactDOM from 'react-dom/client';
      import './index.css';  // This line should be here
      import App from './App';
      
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(<App />);
      ```
   
   6. **Restart your development server:**
      ```bash
      npm start
      ```

   **If you encounter PostCSS errors:**
   
   Some Create React App versions have compatibility issues. Try this approach:
   
   1. **Remove existing installations:**
      ```bash
      npm uninstall tailwindcss postcss autoprefixer
      ```
   
   2. **Install specific compatible versions:**
      ```bash
      npm install -D tailwindcss@3.3.0 postcss@8.4.31 autoprefixer@10.4.16
      ```
   
   3. **Follow steps 2-6 above**
   
   **Alternative: Using Craco (if PostCSS issues persist)**
   
   If you continue having PostCSS configuration issues:
   
   1. **Install Craco:**
      ```bash
      npm install -D @craco/craco
      ```
   
   2. **Create `craco.config.js` in your project root:**
      ```javascript
      module.exports = {
        style: {
          postcss: {
            plugins: [
              require('tailwindcss'),
              require('autoprefixer'),
            ],
          },
        },
      }
      ```
   
   3. **Update your `package.json` scripts:**
      ```json
      {
        "scripts": {
          "start": "craco start",
          "build": "craco build",
          "test": "craco test"
        }
      }
      ```

4. **Excel File Setup**

### Required Columns
Your Excel file must contain these exact column headers:

| Column Name | Description | Example |
|-------------|-------------|---------|
| `Title` | Video title | "React Tutorial" |
| `Description` | Video description | "Learn React basics..." |
| `Duration` | Video length | "5:32" or 332 (seconds) |
| `Published At` | Publication date | "2024-01-15" |
| `Tags` | Video tags | "tutorial,react,javascript" |
| `Thumbnail Path` | Local image path | "./thumbnails/video1.jpg" |
| `Video URL` | Link to video | "https://youtube.com/watch?v=..." |

### File Structure
```
video-gallery/
├── public/
│   ├── videos.xlsx          ← Your Excel file
│   └── thumbnails/          ← Thumbnail images folder
│       ├── video1.jpg
│       ├── video2.jpg
│       └── ...
├── src/
│   ├── App.js              ← Video gallery component
│   └── ...
├── scripts/
│   └── youtube_processor.py ← YouTube channel data extractor
└── package.json
```

### Using YouTube Channel Processor

The `youtube_processor.py` script can automatically create an Excel file from a YouTube channel:

1. **Install Required Dependencies:**
   ```bash
   pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib pandas openpyxl requests pillow
   ```

2. **Set Up Google API Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project
   - Enable YouTube Data API v3
   - Create OAuth 2.0 credentials
   - Download credentials and save as `credentials.json` in the scripts folder

3. **Run the Script:**
   ```bash
   python scripts/youtube_processor.py @channelname --operations export-excel --output-file public/videos.xlsx
   ```
   
   Options:
   - Use channel username, handle (@channel), or channel ID
   - `--batch-size` to set number of videos per request (default: 50)
   - `--no-confirm` to skip confirmation prompts
   - `--fail-on-error` to stop on first error
   - `--output-file` to specify Excel file location

   Example:
   ```bash
   python scripts/youtube_processor.py @Fireship --operations export-excel --output-file public/videos.xlsx
   ```

4. **Thumbnails:**
   - The script will download thumbnails to `public/thumbnails/`
   - Excel file will contain correct relative paths to thumbnails

### Thumbnail Setup

**Option A: Relative Paths (Recommended)**
1. Copy your thumbnail images to `public/thumbnails/`
2. Update Excel thumbnail paths to: `./thumbnails/imagename.jpg`

**Option B: Absolute Paths**
- Use full file paths (may have browser security limitations)

5. **Running the Application**

1. **Start the development server:**
   ```bash
   npm start
   ```

2. **Open your browser:**
   - Automatically opens to `http://localhost:3000`
   - Or manually navigate to the URL

## Usage

### Loading Videos
- **Automatic**: App loads `./videos.xlsx` by default on startup
- **Custom Path**: Enter different file path and click "Load File"
- **Upload Alternative**: Use the file upload option if needed

### Interacting with Videos
- **Watch**: Click "Watch" button to open video URL in new tab
- **Mark as Watched**: Click "Watched" button to remove video from list
- **Hover Effects**: Hover over thumbnails for play overlay

### Language Support
- **Hebrew Text**: Automatically aligned right-to-left
- **English Text**: Automatically aligned left-to-right
- **Mixed Content**: Each text element adapts individually

## Configuration

### Default File Path
To change the default Excel file path, modify this line in `App.js`:
```javascript
const [filePath, setFilePath] = useState('./videos.xlsx'); // Change path here
```

### Styling Customization
The component uses Tailwind CSS classes. Modify the className attributes to customize appearance.

## Troubleshooting

### Common Issues

**"Cannot read file" error:**
- Verify Excel file location and name
- Ensure file isn't open in Excel
- Check file permissions

**Thumbnails not displaying:**
- Confirm images are in `public/thumbnails/`
- Use relative paths starting with `./`
- Verify image file extensions match Excel data

**Videos not opening:**
- Check Video URL column has valid URLs
- URLs must start with `http://` or `https://`

**Hebrew text alignment issues:**
- Ensure Excel file uses UTF-8 encoding
- App automatically detects Hebrew characters

### Excel File Example
```
Title               | Description        | Duration | Published At | Tags          | Thumbnail Path        | Video URL
React Basics        | Introduction to... | 5:32     | 2024-01-15   | tutorial,react| ./thumbnails/vid1.jpg | https://...
הדרכת React        | מבוא ל-React...    | 3:45     | 2024-01-20   | הדרכה         | ./thumbnails/vid2.jpg | https://...
```

## Dependencies

- **xlsx**: Excel file reading and parsing
- **lucide-react**: Modern icon library for UI elements
- **React**: Frontend framework (included with Create React App)
- **Tailwind CSS**: Utility-first CSS framework (built into component)

## Technical Notes

- Uses `window.fs.readFile` API for local file access
- Automatic language detection via Hebrew Unicode range
- Responsive grid layout (1-3 columns based on screen width)
- In-memory state management (no persistence between sessions)

## Browser Support

- Modern browsers with ES6+ support
- Local file system access required
- Desktop-optimized (wide screen recommended)

## License

This project is provided as-is for local use.

---

**Enjoy your video gallery! 🎬**