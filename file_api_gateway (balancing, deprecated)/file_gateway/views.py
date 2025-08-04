import os
import requests
from django.http import JsonResponse, HttpResponse
from django.views import View
from django.conf import settings
from pathlib import Path

def get_file_servers():
    if not SERVERS_FILE.exists():
        raise FileNotFoundError(f"Server list file not found: {SERVERS_FILE}")
    with open(SERVERS_FILE, "r") as f:
        return [line.strip() for line in f if line.strip()]

def server_has_movie(server_url, movie_id):
    url = f"{server_url}/movies/{movie_id}/"
    try:
        response = requests.head(url, timeout=2)
        return response.status_code == 200
    except:
        return False

def get_server_with_most_free_space(servers):
    results = []
    for server in servers:
        try:
            resp = requests.get(f"{server}/health/", timeout=3)
            if resp.status_code == 200:
                data = resp.json()
                free_space = data.get("free_space_mb", 0)
                results.append((server, free_space))
        except Exception as e:
            print(f"Error contacting server {server}: {e}")
            continue
    if not results:
        return None
    return max(results, key=lambda x: x[1])[0]

class ProxyView(View):
    def dispatch(self, request, movie_id, type_code, *args, **kwargs):
        servers = get_file_servers()

        for server in servers:
            if server_has_movie(server, movie_id):
                return self.proxy_request(request, server, movie_id, type_code)

        target_server = get_server_with_most_free_space(servers)
        if not target_server:
            return JsonResponse({"error": "No available file server"}, status=503)

        return self.proxy_request(request, target_server, movie_id, type_code)

    def proxy_request(self, request, server_url, movie_id, type_code):
        target_url = f"{server_url}/upload/{movie_id}/{type_code}/"

        headers = {
            key: value for (key, value) in request.headers.items()
            if key.lower() not in ('host', 'content-length')
        }

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            headers["Authorization"] = auth_header

        try:
            response = requests.request(
                method=request.method,
                url=target_url,
                headers=headers,
                data=request.body,
                params=request.GET,
                cookies=request.COOKIES,
                allow_redirects=False
            )
            return HttpResponse(
                content=response.content,
                status=response.status_code,
                content_type=response.headers.get("Content-Type")
            )
        except Exception as e:
            return JsonResponse({"error": "Proxy request failed", "details": str(e)}, status=500)