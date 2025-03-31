from flask import jsonify, request
from typing import Dict, Tuple
from services.docker_service import DockerService
from services.system_service import SystemService

class DockerController:
    def __init__(self):
        system_service = SystemService()
        self.docker_service = DockerService(system_service)

    def get_status(self) -> Tuple[Dict, int]:
        """Get Docker status"""
        status = self.docker_service.get_status()
        return jsonify(status), 200

    def install(self) -> Tuple[Dict, int]:
        """Install Docker"""
        success, message = self.docker_service.install()
        if success:
            return jsonify({'success': True, 'message': message}), 200
        return jsonify({'success': False, 'message': message}), 400

    def update(self) -> Tuple[Dict, int]:
        """Update Docker"""
        if not self.docker_service._is_installed():
            return jsonify({'success': False, 'message': 'Docker not installed'}), 400
        
        success, message = self.docker_service.update()
        if success:
            return jsonify({'success': True, 'message': message}), 200
        return jsonify({'success': False, 'message': message}), 400

    def uninstall(self) -> Tuple[Dict, int]:
        """Uninstall Docker"""
        if not self.docker_service._is_installed():
            return jsonify({'success': False, 'message': 'Docker not installed'}), 400
        
        success, message = self.docker_service.uninstall()
        if success:
            return jsonify({'success': True, 'message': message}), 200
        return jsonify({'success': False, 'message': message}), 400