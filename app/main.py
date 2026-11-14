from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .routers.api import router as api_router

STATIC_DIR = Path(__file__).resolve().parent / "static"


def create_app() -> FastAPI:
    app = FastAPI(
        title="Footy Predictions",
        version="0.1.0",
        description="Fixtures, results, standings and market odds for football competitions.",
    )
    app.include_router(api_router, prefix="/api")

    # A real server route, so /sipoc works on direct visits and refreshes.
    @app.get("/sipoc", include_in_schema=False)
    def sipoc_page() -> FileResponse:
        return FileResponse(STATIC_DIR / "sipoc.html", media_type="text/html")

    # Mounted last so /api and /sipoc take precedence over the static site.
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="site")
    return app


app = create_app()
