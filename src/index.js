// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();

// Configuraciones de middleware
app.use(cors({
    origin: [
        'https://web-production-3323.up.railway.app', 
        'http://localhost:3000',
        'http://localhost:5173'
    ],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rutas de autenticación
const authRoutes = require('./controllers/authController');
app.use('/api/auth', authRoutes.router);


// Configuración de WhatsApp API
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Estado temporal de las conversaciones
const conversations = new Map();

// Middleware para servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Rutas de API
app.use('/api/auth', require('./controllers/authController').router);

/ Manejar rutas de React SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en puerto ${PORT}`);
});

// Función para enviar mensajes
async function sendWhatsAppMessage(to, message) {
    try {
        const response = await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            data: {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'text',
                text: {
                    body: message
                }
            }
        });
        console.log('Mensaje enviado:', response.data);
        return response.data;
    } catch (error) {
        const errorData = error.response && error.response.data ? error.response.data : error;
        console.error('Error enviando mensaje:', errorData);
        throw error;
    }
}

// Función para procesar mensajes según el estado de la conversación
async function processMessage(from, message) {
    let conversation = conversations.get(from) || {
        step: 'START',
        data: {}
    };

    let response = '';

    switch (conversation.step) {
        case 'START':
            response = '¡Hola! 👋 Soy TecnoBotv1, tu asistente para tomar medidas.\n\n' +
                      'Por favor, dime tu nombre para comenzar.';
            conversation.step = 'WAITING_NAME';
            break;

        case 'WAITING_NAME':
            conversation.data.name = message;
            response = `Gracias ${message}! 😊\n\n` +
                      'Ahora necesito tu talla de ropa superior (S/M/L/XL/XXL).\n' +
                      'Por favor, indica solo la letra correspondiente.';
            conversation.step = 'WAITING_TOP_SIZE';
            break;

        case 'WAITING_TOP_SIZE':
            const upperSize = message.toUpperCase();
            if (['S', 'M', 'L', 'XL', 'XXL'].includes(upperSize)) {
                conversation.data.topSize = upperSize;
                response = '¡Perfecto! 👍\n\n' +
                          'Ahora necesito tu talla de pantalón (30/32/34/36/38/40/42/44).\n' +
                          'Por favor, indica solo el número.';
                conversation.step = 'WAITING_BOTTOM_SIZE';
            } else {
                response = '❌ Por favor, indica una talla válida (S/M/L/XL/XXL).';
            }
            break;

        case 'WAITING_BOTTOM_SIZE':
            const bottomSize = message.trim();
            if (['30','32','34','36','38','40','42','44'].includes(bottomSize)) {
                conversation.data.bottomSize = bottomSize;
                response = '¡Excelente! 🎉\n\n' +
                          'He registrado los siguientes datos:\n' +
                          `Nombre: ${conversation.data.name}\n` +
                          `Talla Superior: ${conversation.data.topSize}\n` +
                          `Talla Inferior: ${conversation.data.bottomSize}\n\n` +
                          '¿Los datos son correctos? (Responde SI o NO)';
                conversation.step = 'CONFIRM_DATA';
            } else {
                response = '❌ Por favor, indica una talla válida (30/32/34/36/38/40/42/44).';
            }
            break;

        case 'CONFIRM_DATA':
            if (message.toUpperCase() === 'SI') {
                response = '¡Perfecto! 🎊 Tus datos han sido guardados.\n\n' +
                          'Gracias por usar TecnoBotv1. ¿Necesitas algo más? (SI/NO)';
                conversation.step = 'ASK_MORE_HELP';
            } else if (message.toUpperCase() === 'NO') {
                response = 'De acuerdo, empecemos de nuevo.\n\nPor favor, dime tu nombre.';
                conversation.step = 'WAITING_NAME';
                conversation.data = {};
            } else {
                response = '❌ Por favor, responde SI o NO.';
            }
            break;

        case 'ASK_MORE_HELP':
            if (message.toUpperCase() === 'NO') {
                response = '¡Gracias por usar TecnoBotv1! 👋\nQue tengas un excelente día.';
                conversations.delete(from);
            } else if (message.toUpperCase() === 'SI') {
                response = 'De acuerdo, empecemos de nuevo.\n\nPor favor, dime tu nombre.';
                conversation.step = 'WAITING_NAME';
                conversation.data = {};
            } else {
                response = '❌ Por favor, responde SI o NO.';
            }
            break;

        default:
            response = '¡Hola! Parece que hubo un error. Empecemos de nuevo.\n\nPor favor, dime tu nombre.';
            conversation.step = 'WAITING_NAME';
            conversation.data = {};
    }

    conversations.set(from, conversation);
    return response;
}

// Verificación del webhook
app.get('/webhook', (req, res) => {
    const verify_token = process.env.VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    if (mode && token) {
        if (mode === 'subscribe' && token === verify_token) {
            console.log('Webhook verificado correctamente');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// Manejo de mensajes entrantes
app.post('/webhook', async (req, res) => {
    try {
        if (req.body.object) {
            const entry = req.body.entry && req.body.entry[0];
            const changes = entry && entry.changes && entry.changes[0];
            const value = changes && changes.value;
            const messages = value && value.messages && value.messages[0];

            if (messages) {
                const from = messages.from;
                const msg_body = messages.text && messages.text.body;

                console.log('Mensaje recibido de:', from);
                console.log('Contenido:', msg_body);

                const response = await processMessage(from, msg_body);
                await sendWhatsAppMessage(from, response);
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('Error en webhook:', error);
        res.sendStatus(500);
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`TecnoBotv1 ejecutándose en puerto ${PORT}`);
    console.log('Esperando mensajes...');
});
