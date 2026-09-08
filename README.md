# 🍗 Asistente Pitín - Bot de WhatsApp (PitaPollo - Ofertas Trinidad)

¡Bienvenido! Este es el asistente virtual modular y automatizado para la atención de clientes, consulta de precios y toma de pedidos por WhatsApp de **PitaPollo - La Trinidad**.

---

## 🏗️ Arquitectura y Estructura del Proyecto

El código sigue estrictamente las directrices de modularidad y calidad descritas en [`RULES.md`](./RULES.md):

```
asistente pitin/
├── assets/                    # Imágenes de promociones (Alas, Tenders, Muslos, Molido)
├── src/
│   ├── app.js                 # Punto de entrada y servidor HTTP para QR
│   ├── config/
│   │   └── data.js            # Configuración maestra (datos de negocio, cuentas, catálogo base)
│   ├── data/
│   │   └── store.json         # Base de datos local persistente (precios dinámicos, tasa BCV)
│   ├── services/
│   │   ├── storeService.js    # Gestión de persistencia y actualización en caliente de precios
│   │   └── orderService.js    # Validación y generación de resúmenes de pedidos
│   ├── flows/
│   │   ├── index.js           # Exportador central de flujos conversacionales
│   │   ├── admin.flow.js      # Comandos de administración y actualización vía WhatsApp (#precios, #tasa)
│   │   ├── offers.flow.js     # Envío de fotos y lista de precios actualizada dinámicamente
│   │   ├── order.flow.js      # Toma guiada de pedidos (nombre, productos, delivery/tienda)
│   │   ├── payment.flow.js    # Datos bancarios (Pago Móvil Banesco, Zelle, efectivo)
│   │   ├── info.flow.js       # Horarios, ubicación física y delivery
│   │   ├── advisor.flow.js    # Transferencia a un asesor humano
│   │   ├── media.flow.js      # Confirmación al recibir capturas de comprobantes de pago
│   │   └── welcome.flow.js    # Saludo y menú principal
│   └── utils/
│       ├── formatters.js      # Formateo de fechas venezolanas y saneamiento de textos
│       └── logger.js          # Sistema de logs con marcas de tiempo
├── .env.example               # Plantilla de variables de entorno
├── .gitignore                 # Reglas para no versionar credenciales ni sesiones de WhatsApp
├── iniciar_bot.bat            # Acceso directo para iniciar el bot con doble clic
├── package.json
├── README.md
└── RULES.md                   # Normas de desarrollo y buenas prácticas
```

---

## 🚀 ¿Cómo iniciar el bot?

1. En tu **Escritorio**, haz doble clic en el acceso directo:
   👉 **`Asistente Pitin`**
   *(O haz doble clic en `iniciar_bot.bat` dentro de esta carpeta).*
2. Abre tu navegador web en **`http://localhost:3008`** para ver el código QR.
3. En WhatsApp de tu teléfono, entra en **Dispositivos vinculados** y escanea el código.

---

## 🔄 ¿Cómo actualizar precios y la tasa desde WhatsApp?

Ya no necesitas tocar la computadora para cambiar los precios ni la tasa del día:

### 1. Actualizar lista de precios
Cuando la oficina central te envíe la lista de precios por WhatsApp, simplemente reenvíala o escribe:
```text
#precios
🍗 Alas sin Punta: $3.80/kg
🍗 Muslos enteros: $3.20/kg
🥩 Pechuga fresca: $6.50/kg
🥓 Tenders de pollo: $5.00/pack
🥩 Pollo molido: $4.20/kg
```
El bot te confirmará:  
*`✅ ¡LISTA DE PRECIOS Y OFERTAS ACTUALIZADA!`*  
Y todos los clientes verán de inmediato esta nueva lista al pedir las ofertas.

### 2. Actualizar la tasa oficial del día
Solo escribe:
```text
#tasa 65.50
```
El bot actualizará la tasa oficial de inmediato y la mostrará a los clientes.

### 3. Ver cómo quedó la lista
Escribe `#ver` o `#estado` para ver la lista de precios tal como la verán los clientes.

### 4. Usarlo en un grupo de WhatsApp
Puedes crear un grupo con el bot llamado **`actualizaciones`**, escribir `#grupo` una sola vez para registrarlo, y enviar allí todas tus actualizaciones.
