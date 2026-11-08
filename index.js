const TelegramBot = require('node-telegram-bot-api');
const { MercadoPagoConfig, PreApproval } = require('mercadopago');
const express = require('express');

// Configuración del servidor Express para Render
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Credenciales y Tokens
const TELEGRAM_TOKEN = '8643196780:AAFebIUz869JdePz5XkqnVe2FE2V38UsmIk';

// Inicializar Bot de Telegram (con manejo de errores para evitar caídas)
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.on('polling_error', (error) => {
  console.log('Error de Telegram (Polling):', error.code);
});

// Inicializar cliente de Mercado Pago
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-tu-token-aqui' 
});

// Ruta de prueba para el navegador (Health Check de Render)
app.get('/', (req, res) => {
  res.send('Bot de Telegram y Webhook de Mercado Pago funcionando correctamente.');
});

// Escuchador seguro para el comando /start
bot.onText(/^\/start$/i, async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'Amigo(a)';

  try {
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
        payer_email: "jr850509@gmail.com"
      }
    };

    const response = await preApproval.create(subscriptionData);
    const paymentUrl = response.init_point;

    const welcomeMessage = `¡Hola, ${userName}! 🤖 Bienvenid(a).\n\nPara acceder al contenido exclusivo y al grupo privado, adquiere tu suscripción mensual por solo $107 MXN (cobro automático cada mes).\n\nHaz clic en el siguiente enlace seguro para pagar:\n${paymentUrl}`;

    await bot.sendMessage(chatId, welcomeMessage);
  } catch (error) {
    console.error('Error al generar el link de pago:', error.message || error);
    await bot.sendMessage(chatId, 'Ocurrió un error al conectar con la pasarela de pagos. Por favor, intenta de nuevo en un momento.');
  }
});

// Endpoint para recibir Webhooks de Mercado Pago
app.post('/webhook', async (req, res) => {
  const event = req.body;
  console.log('Webhook recibido:', JSON.stringify(event));
  res.status(200).send('Webhook procesado');
});

// Iniciar servidor Express
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
