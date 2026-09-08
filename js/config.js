// URL del backend - Se actualiza después del despliegue en Railway
// Por ahora apunta a localhost para pruebas locales
let API_URL = "https://motoflow-backend.onrender.com";
// Si querés probar con Railway después, cambiá por:
// let API_URL = 'https://motoflow-backend-production.up.railway.app/api';

const MAX_PEDIDOS_POR_REPARTIDOR = 3;
const RADIO_CERCANIA_KM = 5;
const CIUDAD_DEL_ESTE = { lat: -25.5095, lng: -54.6132 };