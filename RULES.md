# 🧩 Reglas de Desarrollo - Asistente Pitín

> *"No queremos código que simplemente funcione; queremos código que sea modular, predecible y fácil de mantener por cualquier desarrollador."*

---

### 1. Separación estricta de responsabilidades (Modularidad)
El proyecto debe mantenerse organizado en capas desacopladas:
- **`src/config/`**: Constantes, variables de entorno, configuración de WhatsApp y datos maestros del negocio.
- **`src/services/`**: Toda la lógica de negocio, persistencia de datos (store) y procesamiento de información.
- **`src/flows/`**: Un archivo independiente por cada flujo de conversación (bienvenida, ofertas, pedidos, pagos, administración, etc.).
- **`src/utils/`**: Funciones auxiliares puras (formateadores de fecha, moneda, limpiadores de texto y logger).
- **`src/data/`**: Archivos de persistencia local (ej. `store.json`).
- **`assets/`**: Archivos multimedia (imágenes, audios, comprobantes).

**Prohibido:** Colocar lógica de base de datos o lógica pesada de negocio dentro de los flujos o en `app.js`.

---

### 2. Antes de agregar código, revisar si ya existe
Antes de crear una nueva función, servicio o flujo, verifica si la lógica ya está implementada en `src/services/` o `src/utils/`. Reutiliza en lugar de duplicar.

---

### 3. Código limpio y sin código muerto
Si un flujo, función, constante o archivo queda en desuso al implementar una nueva característica, elimínalo de inmediato tras verificar que no rompa dependencias.

---

### 4. Cambios quirúrgicos
Modificar únicamente el módulo o servicio específico involucrado en el requerimiento. No rehacer código funcional que no guarda relación con la tarea.

---

### 5. Convención de commits atómicos
Utilizar el estándar Conventional Commits:
- `feat:` Nuevas funcionalidades (ej: flujos, servicios).
- `fix:` Corrección de errores o ajustes de protocolo.
- `refactor:` Reestructuración de código sin alterar comportamiento externo.
- `style:` Ajustes de formato o textos en los mensajes.
- `docs:` Modificaciones a README o documentación técnica.

---

### 6. Probar antes de comitear
Verificar que los archivos pasen la revisión de sintaxis con `node --check` y que el bot inicie correctamente sin excepciones ni conflictos de puertos.
