import subprocess
import logging
from typing import Tuple, Optional
from services.system_service import SystemService

class DockerService:
    def __init__(self, system_service: SystemService):
        self.system_service = system_service
        self.logger = logging.getLogger(__name__)
        self.os_type = self.system_service.get_system_info()['os']

    def get_status(self) -> dict:
        """Get complete Docker status"""
        installed = self._is_installed()
        return {
            'installed': installed,
            'version': self._get_version() if installed else None,
            'os': self.os_type,
            'requires_privileges': not self.system_service._check_privileges()
        }

    def _is_installed(self) -> bool:
        """Check if Docker is installed"""
        try:
            result = subprocess.run(
                ['docker', '--version'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            return result.returncode == 0 and 'Docker version' in result.stdout
        except Exception as e:
            self.logger.error(f"Docker check failed: {e}")
            return False

    def _get_version(self) -> Optional[str]:
        """Get Docker version"""
        try:
            result = subprocess.run(
                ['docker', '--version'],
                capture_output=True,
                text=True
            )
            return result.stdout.strip()
        except Exception as e:
            self.logger.error(f"Version check failed: {e}")
            return None

    def install(self) -> Tuple[bool, str]:
        """Install Docker"""
        if self._is_installed():
            return False, "Docker is already installed"
        
        try:
            if self.os_type == 'windows':
                return self._install_windows()
            elif self.os_type == 'linux':
                return self._install_linux()
            return False, f"Unsupported OS: {self.os_type}"
        except Exception as e:
            return False, str(e)
        
    def update(self) -> Tuple[bool, str]:
        """Update Docker to latest version"""
        try:
            if self.os_type == 'windows':
                return self._install_windows()  # Same as install on Windows
            elif self.os_type == 'linux':
                return self._update_linux()
            return False, f"Unsupported OS: {self.os_type}"
        except Exception as e:
            return False, str(e)

    def _install_windows(self) -> Tuple[bool, str]:
        """Windows-specific installation"""
        # Simplified - would use actual installer in production
        subprocess.run(['winget', 'install', 'Docker.DockerDesktop'], check=True)
        return True, "Docker installed successfully"

    def _install_linux(self) -> Tuple[bool, str]:
        """Linux-specific installation"""
        cmds = [
            ['sudo', 'apt-get', 'update'],
            ['sudo', 'apt-get', 'install', '-y', 'docker-ce'],
            ['sudo', 'systemctl', 'enable', 'docker'],
            ['sudo', 'systemctl', 'start', 'docker']
        ]
        for cmd in cmds:
            subprocess.run(cmd, check=True)
        return True, "Docker installed successfully"

    def _update_linux(self) -> Tuple[bool, str]:
        """Linux-specific update"""
        cmds = [
            ['sudo', 'apt-get', 'update'],
            ['sudo', 'apt-get', 'upgrade', '-y', 'docker-ce']
        ]
        for cmd in cmds:
            subprocess.run(cmd, check=True)
        return True, "Docker updated successfully"
    
    def uninstall(self) -> Tuple[bool, str]:
        """Uninstall Docker appropriate for the OS"""
        try:
            if self.os_type == 'windows':
                return self._uninstall_windows()
            elif self.os_type == 'linux':
                return self._uninstall_linux()
            return False, f"Unsupported OS: {self.os_type}"
        except Exception as e:
            return False, str(e)

    def _uninstall_windows(self) -> Tuple[bool, str]:
        """Windows-specific uninstallation"""
        try:
            subprocess.run(['winget', 'uninstall', 'Docker.DockerDesktop'], check=True)
            return True, "Docker uninstalled successfully"
        except subprocess.CalledProcessError as e:
            return False, f"Failed to uninstall Docker: {e}"

    def _uninstall_linux(self) -> Tuple[bool, str]:
        """Linux-specific uninstallation"""
        try:
            cmds = [
                ['sudo', 'apt-get', 'remove', '-y', 'docker-ce'],
                ['sudo', 'apt-get', 'purge', '-y', 'docker-ce'],
                ['sudo', 'rm', '-rf', '/var/lib/docker']
            ]
            for cmd in cmds:
                subprocess.run(cmd, check=True)
            return True, "Docker uninstalled successfully"
        except subprocess.CalledProcessError as e:
            return False, f"Failed to uninstall Docker: {e}"