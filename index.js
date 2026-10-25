const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { MercadoPagoConfig, PreApproval } = require('mercadopago');

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID; // ID del grupo privado (-100xxxxxxx)
const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const SERVER_URL = process.env.SERVER_URL; // URL que te dará Render

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const client = new MercadoPagoConfig({ accessToken: MP_TOKEN });
const preapproval = new PreApproval(client);

// Comando /start en Telegram
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const preference = await preapproval.create({
      body: {
        reason: "Suscripción VIP Lishotwife",
        external_reference: chatId.toString(),
        payer_email: "jr850509@gmail.com",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 107, // Precio mensual en MXN (cámbialo si deseas)
          currency_id: "MXN"
        },
        back_url: "https://t.me/lishotwife_VIP_bot"
      }
    });

    const initPoint = preference.init_point;

    bot.sendMessage(chatId, "🔥 **Bienvenido al VIP de Lishotwife** 🔥\n\nAcceso exclusivo mensual. Haz clic en el botón de abajo para suscribirte:", {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: "💳 Suscribirme ($107 MXN/mes)", url: initPoint }]
        ]
      }
    });
  } catch (error) {
    console.error("Error creando suscripción:", error);
    bot.sendMessage(chatId, "Ocurrió un error al generar tu link de pago. Inténtalo de nuevo más tarde.");
  }
});

// Webhook para recibir notificaciones de pago de Mercado Pago
app.post('/webhook', async (req, res) => {
  const { type, action, data } = req.body;

  if (type === 'subscription_preapproval' || action === 'created') {
    try {
      const subId = data.id;
      const subscriptionData = await preapproval.get({ id: subId });
      const userTelegramId = subscriptionData.external_reference;
      const status = subscriptionData.status;

      if (status === 'authorized' && userTelegramId) {
        // Generar enlace de invitación de un solo uso
        const inviteLink = await bot.createChatInviteLink(CHAT_ID, {
          member_limit: 1,
          expire_date: Math.floor(Date.now() / 1000) + 86400 // Expira en 24h
        });

        bot.sendMessage(userTelegramId, `🎉 ¡Pago de suscripción verificado!\n\nÚnete aquí a tu grupo exclusivo:\n${inviteLink.invite_link}`);
      } else if (status === 'cancelled' || status === 'paused') {
        // Si cancela la suscripción, se expulsa del grupo
        await bot.banChatMember(CHAT_ID, userTelegramId);
        await bot.unbanChatMember(CHAT_ID, userTelegramId); // Desbloquea para que pueda volver a pagar si quiere
        bot.sendMessage(userTelegramId, "Tu suscripción ha finalizado y el acceso al grupo VIP se ha revocado.");
      }
    } catch (err) {
      console.error("Error procesando webhook:", err);
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
