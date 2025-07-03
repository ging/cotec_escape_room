# Cotec Escape Room

This project is an escape room web app with a Node.js + Express backend and a MongoDB database for storing results.

## Prerequisites
- Node.js (v16 or higher recommended)
- npm (comes with Node.js)
- MongoDB instance (local or remote)

## Setup

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd cotec_escape_room
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

- Copy `template.env` to `.env`:

```bash
cp template.env .env
```
- Edit `.env`.



1. **Start the server**

```bash
node server.js
```

The server will start on [http://localhost:3000](http://localhost:3000) by default.

## Usage
- Open `http://localhost:3000` in your browser.
- The app will prompt for your email if not already stored.
- Play the escape rooms and submit codes to unlock rooms.
- Results are stored in MongoDB when a room is completed.

## Project Structure
- `server.js` — Express backend and API
- `index.html`, `escape_*.html` — Frontend pages
- `script.js` — Frontend logic
- `styles.css` — Styles
- `.env` — Environment variables (not committed)

## License
See [LICENSE.md](LICENSE.md) 