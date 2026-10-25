const TelegramBot = require('node-telegram-bot-api');
const { MercadoPagoConfig, PreApproval } = require('mercadopago');
const express = require('express');

// Configuración del servidor Express para Render (necesario para mantener el servicio activo y recibir webhooks)
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Credenciales y Tokens
const TELEGRAM_TOKEN = '8643196780:AAFebIUz869JdePz5XkqnVe2FE2V38UsmIk';
const TARGET_CHAT_ID = '-1008903979668';

// Inicializar Bot de Telegram
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Inicializar cliente de Mercado Pago (reemplaza con tu Access Token de producción si es necesario)
// Si usas variables de entorno, asegúrate de configurarlas en Render.
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-tu-token-aqui' 
});

// Ruta de prueba para el navegador (Health Check de Render)
app.get('/', (req, res) => {
  res.send('Bot de Telegram y Webhook de Mercado Pago funcionando correctamente.');
});

// Comando /start en Telegram
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'Amigo(a)';

  try {
    // Generador de enlace de suscripción recurrente en Mercado Pago
    // Nota: 'payer_email' es requerido por la API de preaprobaciones (preapproval)
    const preApproval = new PreApproval(client);
    
    const subscriptionData = {
      body: {
        reason: "Suscripción Mensual VIP - Lishotwife",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 107,
          currency_id: "MXN"
        },
        back_url: "https://lishotwife-bot.onrender.com",
        payer_email: "jr850509@gmail.com" // Email requerido para evitar errores de validación en MP
      }
    };

    // Creando la preferencia de suscripción
    const response = await preApproval.create(subscriptionData);
    const paymentUrl = response.init_point;

    const welcomeMessage = `¡Hola, ${userName}! 🤖 Bienvenid(a).\n\nPara acceder al contenido exclusivo y al grupo privado, adquiere tu suscripción mensual por solo $107 MXN (cobro automático cada mes).\n\nHaz clic en el siguiente enlace seguro para pagar:\n${paymentUrl}`;

    await bot.sendMessage(chatId, welcomeMessage);
  } catch (error) {
    console.error('Error al generar el link de pago:', error);
    await bot.sendMessage(chatId, 'Ocurrió un error al generar tu enlace de pago. Por favor, intenta más tarde.');
  }
});

// Endpoint para recibir Webhooks de Mercado Pago (Pagos y Suscripciones)
app.post('/webhook', async (req, res) => {
  const event = req.body;
  console.log('Webhook recibido:', JSON.stringify(event));

  try {
    // Aquí puedes manejar la lógica cuando el pago se aprueba para generar el enlace de invitación a Telegram:
    // bot.createChatInviteLink(TARGET_CHAT_ID, { member_limit: 1, expire_date: ... })
    
    res.status(200).send('Webhook procesado');
  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.status(500).send('Error interno');
  }
});

// Iniciar servidor Express
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
