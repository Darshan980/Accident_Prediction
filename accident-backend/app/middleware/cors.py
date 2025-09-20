# middleware/cors.py - Custom CORS Middleware
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from config.settings import is_allowed_origin

logger = logging.getLogger(__name__)

class CustomCORSMiddleware(BaseHTTPMiddleware):
    """Custom CORS middleware that handles dynamic Vercel URLs"""
    
    def __init__(self, app, **kwargs):
        super().__init__(app)
        self.allow_credentials = True
        self.allow_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]
        self.allow_headers = [
            "Accept", "Accept-Language", "Content-Language", "Content-Type",
            "Authorization", "X-Requested-With", "X-CSRFToken", "X-Custom-Header",
            "Origin", "User-Agent", "DNT", "Cache-Control", "X-Mx-ReqToken",
            "Keep-Alive", "If-Modified-Since"
        ]
        self.expose_headers = [
            "Content-Length", "Content-Type", "Content-Disposition",
            "X-Total-Count", "X-Page-Count"
        ]
        self.max_age = 86400
    
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        
        # Handle preflight requests
        if request.method == "OPTIONS":
            if origin and is_allowed_origin(origin):
                response = Response()
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = ", ".join(self.allow_methods)
                response.headers["Access-Control-Allow-Headers"] = ", ".join(self.allow_headers)
                response.headers["Access-Control-Max-Age"] = str(self.max_age)
                logger.info(f"✅ CORS preflight allowed for origin: {origin}")
                return response
            else:
                logger.warning(f"❌ CORS preflight rejected for origin: {origin}")
                return Response(status_code=400)
        
        # Handle actual requests
        response = await call_next(request)
        
        if origin and is_allowed_origin(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Expose-Headers"] = ", ".join(self.expose_headers)
            logger.debug(f"✅ CORS headers added for origin: {origin}")
        
        return response
