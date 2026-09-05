function obtenerDesgloseTarifa(distanciaKm) {
  const distancia = Number(distanciaKm) || 0;
  let tarifaBase;
  let kmAdicionales = 0;
  let costoKmAdicionales = 0;
  if (distancia <= 5) {
    tarifaBase = 20000;
  } else if (distancia <= 7) {
    tarifaBase = 25000;
  } else if (distancia <= 10) {
    tarifaBase = 30000;
  } else if (distancia <= 13) {
    tarifaBase = 40000;
  } else {
    tarifaBase = 50000;
    if (distancia > 16) {
      kmAdicionales = distancia - 16;
      costoKmAdicionales = kmAdicionales * 4000;
    }
  }
  return {
    tarifaBase,
    kmAdicionales,
    costoKmAdicionales,
    tarifaMotoCourier: tarifaBase + costoKmAdicionales
  };
}

function obtenerTarifa(distanciaKm) {
  return obtenerDesgloseTarifa(distanciaKm).tarifaMotoCourier;
}

async function calcularDistanciaOSRM(lat1, lng1, lat2, lng2) {
  const controlador = new AbortController();
  const tiempoMaximo = setTimeout(() => controlador.abort(), 12000);
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}`;
    const respuesta = await fetch(url, { signal: controlador.signal });
    if (!respuesta.ok) {
      throw new Error('OSRM no respondió correctamente');
    }
    const datos = await respuesta.json();
    if (!datos.routes || !datos.routes[0]) {
      throw new Error('Ruta no disponible');
    }
    return Math.max(1, Math.round(datos.routes[0].distance / 1000));
  } catch (error) {
    console.error('No fue posible calcular la ruta real con OSRM.', error);
    return null;
  } finally {
    clearTimeout(tiempoMaximo);
  }
}

function actualizarFormularioServicio() {
  const tipoServicio = document.getElementById('tipoServicio').value;
  const grupoMontoPedido = document.getElementById('grupoMontoPedido');
  if (tipoServicio === 'encargo') {
    grupoMontoPedido.classList.remove('hidden');
  } else {
    grupoMontoPedido.classList.add('hidden');
    document.getElementById('montoPedido').value = '';
  }
  calcularTarifa();
}

async function calcularTarifa() {
  if (!puntoRetiro || !puntoEntrega) {
    document.getElementById('desgloseTarifa').classList.add('hidden');
    return;
  }
  const tipoServicio = document.getElementById('tipoServicio').value;
  const montoCompra = parseInt(document.getElementById('montoPedido').value) || 0;
  const distanciaKm = await calcularDistanciaOSRM(
    puntoRetiro.lat, puntoRetiro.lng,
    puntoEntrega.lat, puntoEntrega.lng
  );
  if (distanciaKm === null) {
    alert('Error calculando distancia');
    return;
  }
  const desgloseViaje = obtenerDesgloseTarifa(distanciaKm);
  const tarifaMotoflow = desgloseViaje.tarifaMotoCourier;
  const esEncargo = tipoServicio === 'encargo';
  const comisionEncargo = esEncargo ? Math.round(montoCompra * 0.02) : 0;
  const totalCobro = tarifaMotoflow + (esEncargo ? montoCompra + comisionEncargo : 0);
  document.getElementById('distanciaKm').textContent = distanciaKm;
  document.getElementById('desgloseTarifaBase').textContent = desgloseViaje.tarifaBase.toLocaleString('es-PY');
  document.getElementById('desgloseKmAdicionales').textContent =
    `${desgloseViaje.kmAdicionales.toLocaleString('es-PY')} km × 4.000 = ${desgloseViaje.costoKmAdicionales.toLocaleString('es-PY')}`;
  document.getElementById('desgloseTarifaMoto').textContent = tarifaMotoflow.toLocaleString('es-PY');
  document.getElementById('desgloseMonto').textContent = montoCompra.toLocaleString('es-PY');
  document.getElementById('desgloseComision').textContent = comisionEncargo.toLocaleString('es-PY');
  document.getElementById('desgloseTotal').textContent = totalCobro.toLocaleString('es-PY');
  document.getElementById('filaMontoCompra').classList.toggle('hidden', !esEncargo);
  document.getElementById('filaComision').classList.toggle('hidden', !esEncargo);
  document.getElementById('filaKmAdicionales').classList.toggle('hidden', desgloseViaje.kmAdicionales <= 0);
  document.getElementById('desgloseTarifa').classList.remove('hidden');
}