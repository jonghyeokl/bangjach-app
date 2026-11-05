// Use the Mac's Wi-Fi address so Expo Go reaches the local API from a phone.
const { execFileSync, spawnSync } = require('node:child_process');
const { networkInterfaces } = require('node:os');

let host = process.env.LOCAL_API_HOST;
if (!host && process.platform === 'darwin') {
  try {
    const route = execFileSync('/sbin/route', ['-n', 'get', 'default'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const iface = route.match(/interface:\s+(\S+)/)?.[1];
    if (iface) {
      host = execFileSync('/usr/sbin/ipconfig', ['getifaddr', iface], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    }
  } catch {
    // A VPN or missing default route may require LOCAL_API_HOST explicitly.
  }
}
if (!host) {
  host = Object.entries(networkInterfaces())
    .filter(([name]) => /^(en\d|eth\d|wlan\d|wi-?fi|ethernet)/i.test(name))
    .flatMap(([, addresses]) => addresses ?? [])
    .find((address) => address.family === 'IPv4' && !address.internal)?.address;
}
if (!host) {
  console.error('LAN 주소를 찾지 못했습니다. LOCAL_API_HOST에 컴퓨터 IP를 지정하세요.');
  process.exit(1);
}
const apiUrl = `http://${host}:8000`;
console.log(`로컬 API: ${apiUrl} (백엔드 실행 및 같은 Wi-Fi 연결 필요)`);
const result = spawnSync(
  process.execPath,
  [require.resolve('expo/bin/cli'), 'start', '--clear', ...process.argv.slice(2)],
  { stdio: 'inherit', env: { ...process.env, EXPO_PUBLIC_API_URL: apiUrl } },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
