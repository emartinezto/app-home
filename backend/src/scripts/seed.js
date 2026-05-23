import { query, closePool } from '../config/db.js';
import { logger } from '../config/logger.js';

const TEMPLATES = [
  // hogar
  { name: 'Cocinar comida', category: 'hogar', frequency: 'diaria', default_weight: 2, default_time_slot: 'manana', display_order: 10 },
  { name: 'Cocinar cena', category: 'hogar', frequency: 'diaria', default_weight: 2, default_time_slot: 'tarde', display_order: 20 },
  { name: 'Recoger cocina comida', category: 'hogar', frequency: 'diaria', default_weight: 1, default_time_slot: 'tarde', display_order: 30 },
  { name: 'Recoger cocina cena', category: 'hogar', frequency: 'diaria', default_weight: 1, default_time_slot: 'tarde', display_order: 40 },
  { name: 'Lavadora', category: 'hogar', frequency: 'semanal', default_weight: 2, default_time_slot: 'flexible', display_order: 100 },
  { name: 'Tender ropa', category: 'hogar', frequency: 'semanal', default_weight: 1, default_time_slot: 'flexible', display_order: 110 },
  { name: 'Planchar', category: 'hogar', frequency: 'semanal', default_weight: 2, default_time_slot: 'flexible', display_order: 120 },
  { name: 'Aspirar y fregar', category: 'hogar', frequency: 'semanal', default_weight: 3, default_time_slot: 'flexible', display_order: 130 },
  { name: 'Limpiar baños', category: 'hogar', frequency: 'semanal', default_weight: 3, default_time_slot: 'flexible', display_order: 140 },
  { name: 'Limpiar cocina a fondo', category: 'hogar', frequency: 'quincenal', default_weight: 3, default_time_slot: 'flexible', display_order: 150 },
  { name: 'Cambiar sábanas', category: 'hogar', frequency: 'quincenal', default_weight: 2, default_time_slot: 'flexible', display_order: 160 },
  { name: 'Compra grande', category: 'hogar', frequency: 'semanal', default_weight: 3, default_time_slot: 'flexible', display_order: 170 },
  { name: 'Compra rápida', category: 'hogar', frequency: 'semanal', default_weight: 1, default_time_slot: 'flexible', display_order: 180 },
  { name: 'Sacar basura', category: 'hogar', frequency: 'diaria', default_weight: 1, default_time_slot: 'tarde', display_order: 190 },
  { name: 'Limpieza profunda mensual', category: 'hogar', frequency: 'mensual', default_weight: 3, default_time_slot: 'flexible', display_order: 200 },

  // cuidados
  { name: 'Llevar al cole', category: 'cuidados', frequency: 'diaria', default_weight: 2, default_time_slot: 'manana', display_order: 300 },
  { name: 'Recoger del cole', category: 'cuidados', frequency: 'diaria', default_weight: 2, default_time_slot: 'tarde', display_order: 310 },
  { name: 'Baño niño/a', category: 'cuidados', frequency: 'diaria', default_weight: 1, default_time_slot: 'tarde', display_order: 320 },
  { name: 'Acostar niño/a', category: 'cuidados', frequency: 'diaria', default_weight: 1, default_time_slot: 'tarde', display_order: 330 },
  { name: 'Preparar mochila', category: 'cuidados', frequency: 'diaria', default_weight: 1, default_time_slot: 'tarde', display_order: 340 },
  { name: 'Actividad extraescolar', category: 'cuidados', frequency: 'semanal', default_weight: 2, default_time_slot: 'tarde', display_order: 350 },

  // perro
  { name: 'Paseo perro mañana', category: 'perro', frequency: 'diaria', default_weight: 1, default_time_slot: 'manana', display_order: 500 },
  { name: 'Paseo perro mediodía', category: 'perro', frequency: 'diaria', default_weight: 1, default_time_slot: 'flexible', display_order: 510 },
  { name: 'Paseo perro noche', category: 'perro', frequency: 'diaria', default_weight: 1, default_time_slot: 'tarde', display_order: 520 },
  { name: 'Comida perro', category: 'perro', frequency: 'diaria', default_weight: 1, default_time_slot: 'flexible', display_order: 530 },
  { name: 'Cepillado perro', category: 'perro', frequency: 'semanal', default_weight: 1, default_time_slot: 'flexible', display_order: 540 },
  { name: 'Baño perro', category: 'perro', frequency: 'mensual', default_weight: 2, default_time_slot: 'flexible', display_order: 550 },
];

async function main() {
  try {
    const existing = await query(`SELECT COUNT(*) AS n FROM task_templates`);
    if (Number(existing[0].n) > 0) {
      logger.info(`task_templates ya tiene ${existing[0].n} filas, no se inserta nada (idempotente)`);
      return;
    }

    for (const t of TEMPLATES) {
      await query(
        `INSERT INTO task_templates (name, category, frequency, default_weight, default_time_slot, display_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [t.name, t.category, t.frequency, t.default_weight, t.default_time_slot, t.display_order],
      );
    }
    logger.info(`✅ Insertadas ${TEMPLATES.length} task_templates`);
  } catch (err) {
    logger.error({ err }, '❌ seed falló');
    process.exitCode = 1;
  } finally {
    await closePool().catch(() => {});
    setTimeout(() => process.exit(process.exitCode ?? 0), 100).unref();
  }
}

main();
