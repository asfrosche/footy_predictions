from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .routers.api import router as api_router

ROOT = Path(__file__).resolve().parent.parent
LEGACY_STATIC = Path(__file__).resolve().parent / "static"
# The Next.js build (web/out) is the site. If it has not been built, fall back to the old pages.
SITE_DIR = ROOT / "web" / "out" if (ROOT / "web" / "out" / "index.html").exists() else LEGACY_STATIC


def create_app() -> FastAPI:
    app = FastAPI(
        title="Footy Predictions",
        version="0.2.0",
        description="Fixtures, results, standings, market odds and model results for football competitions.",
    )
    # Local Next.js dev server (npm run dev in web/) calls the API from another port.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix="/api")

    # The SIPOC page is still the original static file.
    @app.get("/sipoc", include_in_schema=False)
    def sipoc_page() -> FileResponse:
        return FileResponse(LEGACY_STATIC / "sipoc.html", media_type="text/html")

    # Mounted last so /api and /sipoc take precedence over the site.
    app.mount("/", StaticFiles(directory=SITE_DIR, html=True), name="site")
    return app


app = create_app()
