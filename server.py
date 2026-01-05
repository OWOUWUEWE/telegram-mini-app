from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl

class CORSHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == '__main__':
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, CORSHTTPRequestHandler)
    
    # Для HTTPS (нужно для Telegram Web Apps)
    # httpd.socket = ssl.wrap_socket(
    #     httpd.socket,
    #     certfile='path/to/cert.pem',
    #     keyfile='path/to/key.pem',
    #     server_side=True
    # )
    
    print("Сервер запущен на http://localhost:8000")
    print("Для Telegram Mini App нужен HTTPS!")
    httpd.serve_forever()