from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .routers.api import router as api_router

ROOT = Path(__file__).resolve().parent.parent
SITE_DIR = ROOT / "web" / "out"  # built by `npm run build` in web/
LEGACY_DIR = Path(__file__).resolve().parent / "legacy"  # the SIPOC page and its stylesheets


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

    @app.on_event("startup")
    def _warm_models() -> None:
        from .model_runner import warm_up
        warm_up()

    @app.get("/sipoc", include_in_schema=False)
    def sipoc_page() -> FileResponse:
        return FileResponse(LEGACY_DIR / "sipoc.html", media_type="text/html")

    # Stylesheets for the SIPOC page.
    app.mount("/css", StaticFiles(directory=LEGACY_DIR / "css"), name="legacy-css")

    # Mounted last so /api, /sipoc and /css take precedence over the site.
    # Skipped when the site has not been built (for example in the Vercel function bundle).
    if SITE_DIR.is_dir():
        app.mount("/", StaticFiles(directory=SITE_DIR, html=True), name="site")
    return app


app = create_app()
