import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();

/* eslint-disable no-console */
console.log('\n🔑 VAPID keys generadas\n');
console.log('Copia estas líneas en tu archivo .env:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@casa-garcia.local`);
console.log('\n⚠️  Guarda la VAPID_PRIVATE_KEY como un secreto. La pública se expone al cliente.\n');
