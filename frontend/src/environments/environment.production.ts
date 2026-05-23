// IMPORTANTE: reemplaza BACKEND_URL_RENDER con la URL real que te dé Render
// (algo como https://casa-garcia-backend.onrender.com) y vuelve a desplegar el front.
const BACKEND_URL = 'https://BACKEND_URL_RENDER';

export const environment = {
  production: true,
  apiUrl: `${BACKEND_URL}/api/v1`,
  socketUrl: BACKEND_URL,
  vapidPublicKey: 'BOTIrXo_axp4uSoJ0tIKSvyhD0QJFCJ114lRtqfIfcoEU_TefWmu2jlHfc3oa_m-GJxN__YWVrX5xShe8Er9vag'
};
