from flask import Flask, jsonify, request, render_template
from controllers.docker_controller import DockerController

app = Flask(__name__, static_folder='static', static_url_path='/static')
controller = DockerController()

@app.route('/')
def index():
    return render_template('pages/index.html')

@app.route('/api/check', methods=['GET'])
def check_docker():
    return controller.get_status()

@app.route('/api/install', methods=['POST'])
def install_docker():
    return controller.install()

@app.route('/api/update', methods=['POST'])
def update_docker():
    return controller.update()

@app.route('/api/uninstall', methods=['POST'])
def uninstall_docker():
    return controller.uninstall()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)