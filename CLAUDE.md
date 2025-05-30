# Claude Instructions for Obsidian Web Clipper

## Project Overview
This is a Chrome extension that clips web pages and saves them as Markdown files for use with Obsidian. The extension converts HTML to Markdown using the Turndown library and adds YAML frontmatter with metadata.

## Key Files
- `manifest.json` - Chrome extension manifest (v3)
- `popup.html` - Extension popup UI
- `popup.js` - Popup logic and main functionality
- `content.js` - Content script for web page interaction
- `turndown.js` - Turndown library for HTML to Markdown conversion

## Technology Stack
- Chrome Extension Manifest V3
- JavaScript (vanilla)
- Turndown library for HTML to Markdown conversion
- File System Access API for saving files

## Development Commands
No specific build commands - this is a vanilla JavaScript Chrome extension.

## Testing
- Load unpacked extension in Chrome developer mode
- Test on various websites to ensure proper content extraction
- Verify file saving functionality works across different browsers

## Code Style
- Use vanilla JavaScript (no frameworks)
- Follow Chrome extension best practices
- Keep code simple and maintainable
- Use Japanese comments where appropriate (project is bilingual)

## Key Features
1. One-click web page saving to Markdown
2. YAML frontmatter generation (title, URL, date)
3. Content extraction and HTML to Markdown conversion
4. File download with user-selectable save location
5. Code block and image preservation

## Important Notes
- Extension uses Chrome's File System Access API for saving
- Content is extracted from the main page content when possible
- Images remain as external URL links in the saved Markdown
- Code blocks preserve language specifications when available