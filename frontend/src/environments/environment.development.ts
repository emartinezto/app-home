// En dev usamos la IP/host desde el que se sirve el front, así
// el mismo build funciona en localhost (Mac) y en la IP de red (móvil).
const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const environment = {
  production: false,
  apiUrl: `http://${host}:3000/api/v1`,
  socketUrl: `http://${host}:3000`,
  vapidPublicKey: 'BN-wfzmBJ854Y9zIdf2LeW1v8um6xkKlGIJoCF_zPag8p6uLycmzbVGZwTGnRAHAZYLFI7h0etfH6sb_nKSSDwY'
};
