// Prepara el proyecto Android que genera Capacitor ("npx cap add android"):
// copia la configuración de Firebase, el sonido de alarma, los íconos, agrega los
// permisos de ubicación/notificaciones y fija la firma para que las
// actualizaciones del APK se instalen encima de la versión anterior.
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const android = path.join(raiz, 'android');
const app = path.join(android, 'app');
const res = path.join(app, 'src', 'main', 'res');
const manifestRuta = path.join(app, 'src', 'main', 'AndroidManifest.xml');

function fallar(mensaje) {
  console.error('\n❌ ' + mensaje + '\n');
  process.exit(1);
}

function copiarCarpeta(origen, destino) {
  fs.mkdirSync(destino, { recursive: true });
  for (const nombre of fs.readdirSync(origen)) {
    const o = path.join(origen, nombre);
    const d = path.join(destino, nombre);
    if (fs.statSync(o).isDirectory()) copiarCarpeta(o, d);
    else fs.copyFileSync(o, d);
  }
}

// 1) Firebase
const google = path.join(raiz, 'google-services.json');
if (!fs.existsSync(google)) {
  fallar('Falta el archivo app-android/google-services.json (se descarga desde Firebase). Subilo al repositorio y volvé a ejecutar.');
}
const config = JSON.parse(fs.readFileSync(google, 'utf8'));
const paquetes = (config.client || []).map(c => c.client_info && c.client_info.android_client_info && c.client_info.android_client_info.package_name);
if (!paquetes.includes('com.jmmotocourier.repartidor')) {
  fallar('El google-services.json no es de la app "com.jmmotocourier.repartidor". En Firebase, registrá la app Android con ese nombre de paquete exacto y descargá el archivo de nuevo. Paquetes que trae: ' + paquetes.join(', '));
}
fs.copyFileSync(google, path.join(app, 'google-services.json'));

// 2) Sonido de alarma e íconos
fs.mkdirSync(path.join(res, 'raw'), { recursive: true });
fs.copyFileSync(path.join(raiz, 'resources', 'alarma.wav'), path.join(res, 'raw', 'alarma.wav'));
const anydpi = path.join(res, 'mipmap-anydpi-v26');
if (fs.existsSync(anydpi)) fs.rmSync(anydpi, { recursive: true, force: true });
for (const carpeta of fs.readdirSync(path.join(raiz, 'resources'))) {
  const origen = path.join(raiz, 'resources', carpeta);
  if (fs.statSync(origen).isDirectory()) copiarCarpeta(origen, path.join(res, carpeta));
}

// 3) Manifest: permisos y ajustes de notificaciones de Firebase
let manifest = fs.readFileSync(manifestRuta, 'utf8');
const permisos = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.WAKE_LOCK',
  'android.permission.VIBRATE'
];
const lineasPermisos = permisos
  .filter(p => !manifest.includes(`android:name="${p}"`))
  .map(p => `    <uses-permission android:name="${p}" />`)
  .join('\n');
if (lineasPermisos) manifest = manifest.replace('</manifest>', lineasPermisos + '\n</manifest>');
const metas = `
        <meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@drawable/ic_stat_jm" />
        <meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/jm_naranja" />
        <meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="pedidos" />
    `;
if (!manifest.includes('default_notification_channel_id')) manifest = manifest.replace('</application>', metas + '</application>');
fs.writeFileSync(manifestRuta, manifest);

// 4) Textos y colores
const stringsRuta = path.join(res, 'values', 'strings.xml');
let strings = fs.readFileSync(stringsRuta, 'utf8');
strings = strings.replace('</resources>', `    <string name="capacitor_background_geolocation_notification_channel_name">JMMotocourier activo</string>
    <string name="capacitor_background_geolocation_notification_icon">drawable/ic_stat_jm</string>
    <string name="capacitor_background_geolocation_notification_color">#f97316</string>
</resources>`);
fs.writeFileSync(stringsRuta, strings);
fs.writeFileSync(path.join(res, 'values', 'colores_jm.xml'),
  '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="jm_naranja">#f97316</color>\n</resources>\n');

// 5) Firma fija (para poder actualizar el APK sin desinstalar) y versión
const gradleRuta = path.join(app, 'build.gradle');
let gradle = fs.readFileSync(gradleRuta, 'utf8');
if (!gradle.includes('jmmotocourier-firma')) {
  gradle = gradle.replace(/^android \{\s*$/m, `android {
    // jmmotocourier-firma
    signingConfigs {
        debug {
            storeFile file("../../debug.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
    }`);
}
const version = process.env.APP_VERSION_CODE || '1';
gradle = gradle.replace(/versionCode \d+/, `versionCode ${version}`).replace(/versionName "[^"]*"/, `versionName "1.0.${version}"`);
fs.writeFileSync(gradleRuta, gradle);

console.log('✅ Proyecto Android preparado.');
