# Focus Forge

Focus Forge is a mobile-friendly productivity dashboard and installable progressive web app. It is built with vanilla HTML, CSS, and JavaScript.

## Features

- Resilient focus and break timers that continue accurately across reloads and backgrounding
- Personal task list with completion progress
- Focus session totals, streak counter, and recent session history
- Local persistence in the current browser
- Install-to-home-screen support, native sharing, and offline app-shell caching
- No third-party runtime assets are required after the app shell has been cached
- Keyboard shortcuts: `Space` starts/pauses the timer; `N` focuses the new-task field

The **Install app** button remains available on mobile and desktop. It opens the native install prompt where supported, or displays browser-specific install steps (including Safari's Share → Add to Home Screen flow on iPhone and iPad).

## Run locally

Serve this folder over HTTP, then open the local URL. For example, with Python installed:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000`. Service workers and installation require HTTPS or localhost; opening `index.html` directly does not enable those features.

## Publish and share

Pushing to `main` runs the GitHub Pages workflow in `.github/workflows/deploy.yml`. Once the workflow finishes, the app is available at:

<https://abioduntoluwani79-commits.github.io/Focus/>

If GitHub Pages has not been enabled for the repository yet, enable it in **Settings → Pages** and select **GitHub Actions** as the build and deployment source. Send the published HTTPS link to others; they can use the browser's **Install app** or **Add to Home Screen** option.

Tasks, timer state, and session history are stored only in each browser's local storage. Sharing the app link does not share or synchronize personal data between devices.
