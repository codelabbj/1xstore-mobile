import { CapacitorUpdater } from '@capgo/capacitor-updater';

// Compare semantic versions (e.g., 1.2.3)
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}

export async function checkForUpdates() {
  try {
    const response = await fetch('https://1xstore-mobile-app.vercel.app/releases/manifest.json');
    const manifest = await response.json();

    // Get current version from package.json or localStorage
    const localVersion = localStorage.getItem('app_version') || '0.1.0';
    
    // Compare versions properly
    const comparison = compareVersions(manifest.version, localVersion);
    
    if (comparison > 0) {
      // Remote version is newer
      console.log(`New version ${manifest.version} found (current: ${localVersion}), downloading...`);
      
      const result = await CapacitorUpdater.download({
        url: manifest.url,
        version: manifest.version,
      });

      if (result.status === 'success') {
        await CapacitorUpdater.set({ id: result.id });
        localStorage.setItem('app_version', manifest.version);
        alert('New version installed! Restarting app...');
        await CapacitorUpdater.reload();
      }
    } else if (comparison === 0) {
      console.log('App is already up to date (version:', localVersion, ')');
      // Update localStorage to ensure it's set correctly
      localStorage.setItem('app_version', localVersion);
    } else {
      console.log('Local version is newer than remote (local:', localVersion, 'remote:', manifest.version, ')');
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
}
