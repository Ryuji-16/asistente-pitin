import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Aplica los parches necesarios en @builderbot/provider-baileys para:
 * 1. Permitir la recepción de mensajes en grupos de WhatsApp (@g.us).
 * 2. Permitir que los comandos enviados desde el propio número del bot sean recibidos (emitOwnEvents: true).
 * 3. Habilitar la conexión con grupos en la configuración de Baileys (groupsIgnore: false).
 */
export function patchBaileysProvider() {
    const rootDir = path.resolve(__dirname, '..');
    const targetFiles = [
        path.join(rootDir, 'node_modules', '@builderbot', 'provider-baileys', 'dist', 'index.cjs'),
        path.join(rootDir, 'node_modules', '@builderbot', 'provider-baileys', 'dist', 'index.mjs'),
    ];

    let count = 0;

    for (const file of targetFiles) {
        if (!fs.existsSync(file)) continue;

        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        // 1. Desbloquear grupos en baileyIsValidNumber
        if (content.includes('const regexGroup = /\\@g.us\\b/gm;')) {
            content = content.replace(
                /const regexGroup = \/\\@g\.us\\b\/gm;\s*const exist = rawNumber\.match\(regexGroup\);\s*return !exist;/,
                'return true;'
            );
            modified = true;
        }

        // 2. Habilitar emisión de eventos propios (fromMe: true)
        if (content.includes('emitOwnEvents: false')) {
            content = content.replace('emitOwnEvents: false', 'emitOwnEvents: true');
            modified = true;
        }

        // 3. Desactivar ignorar grupos por defecto en Baileys
        if (content.includes('groupsIgnore: true')) {
            content = content.replace('groupsIgnore: true', 'groupsIgnore: false');
            modified = true;
        }

        if (modified) {
            try {
                fs.writeFileSync(file, content, 'utf8');
                count++;
            } catch (err) {
                console.error(`[Aviso] No se pudo escribir parche en ${file}:`, err.message);
            }
        }
    }

    if (count > 0) {
        console.log(`[OK] Parche de soporte de grupos de WhatsApp verificado (${count} archivo(s) optimizado(s)).`);
    }
}

// Ejecutar inmediatamente
patchBaileysProvider();
