# main.py - FIXED CORS Configuration (relevant section only)

# Get CORS origins
cors_origins = get_cors_origins()
logger.info(f"CORS origins configured: {cors_origins}")

# OPTION 1: SECURE CORS with credentials (RECOMMENDED for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # NO wildcards here
    allow_credentials=True,      # Keep this for authenticated requests
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=[
        "Accept",
        "Accept-Language", 
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-CSRFToken",
        "Origin",
        "User-Agent",
        "Cache-Control",
    ],
    expose_headers=[
        "Content-Length",
        "Content-Type", 
        "Content-Disposition",
    ],
    max_age=86400
)

# ALTERNATIVE OPTION 2: If you need wildcard support, disable credentials
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],         # Wildcard allowed
#     allow_credentials=False,     # Must be False with wildcards  
#     allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
#     allow_headers=["*"],         # Can use wildcard headers too
#     expose_headers=[
#         "Content-Length",
#         "Content-Type",
#         "Content-Disposition",
#     ],
#     max_age=86400
# )

# Remove the OPTIONS handler as FastAPI/CORS middleware handles this
# @app.options("/{full_path:path}")  <-- DELETE THIS HANDLER

# Update error handlers to not add duplicate CORS headers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions - let CORS middleware handle headers"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error": "HTTP Exception"}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions - let CORS middleware handle headers"""
    logger.error(f"Unhandled exception on {request.url}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error", 
            "error": str(exc),
            "path": str(request.url)
        }
    )
