import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        //executablePath: '/usr/bin/google-chrome',     //linux com google chrome
    },
});

let isWhatsAppReady = false;

client.initialize().catch(error => {
    console.error('Erro ao inicializar o cliente WhatsApp:', error);
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
});

client.once('ready', () => {
    console.log('Cliente está pronto!');
    isWhatsAppReady = true;
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

export async function sendWhatsAppMessage(phone: string, clientName: string, filePath: string) {
    if (!isWhatsAppReady) {
        console.warn('WhatsApp ainda não está pronto. Aguardando...');
        return;
    }

    const formattedNumber = formatPhoneNumberWapp(phone);
    if (!formattedNumber) {
         console.warn(`Número de telefone inválido para WhatsApp: ${phone}. Mensagem para ${clientName} não enviada.`);
         throw new Error("Número de telefone inválido para WhatsApp.");
    }

    const media = MessageMedia.fromFilePath(filePath);
    const message = `Olá ${clientName}, segue o seu relatório do Pit Stop Golf.`;
    try {
        await client.sendMessage(formattedNumber, media, { caption: message });
        console.log(`Mensagem enviada para ${clientName} (${formattedNumber})`);
    } catch (error) {
        console.error(`Erro ao enviar mensagem para ${clientName} (${formattedNumber}):`, error);
        throw error;
    }
}

function formatPhoneNumberWapp(phone: string) {
    let rawPhone = phone.replace(/\D/g, ""); // Remove caracteres não numéricos
    if (!rawPhone.startsWith("55")) {
      rawPhone = "55" + rawPhone;
    }
    if (rawPhone.length === 13 && rawPhone[4] === "9") {
      rawPhone = rawPhone.slice(0, 4) + rawPhone.slice(5);
    }
    return `${rawPhone}@c.us`;
};