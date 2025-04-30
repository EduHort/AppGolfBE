import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: '/usr/bin/google-chrome',     //linux com google chrome
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

const WHATSAPP_WAIT_TIMEOUT_MS = 15000; // Tempo máximo de espera (15 segundos)
const WHATSAPP_CHECK_INTERVAL_MS = 2000; // Intervalo entre verificações (2 segundo)

export async function sendWhatsAppMessage(phone: string, clientName: string, filePath: string) {
    if (!isWhatsAppReady) {
        console.warn(`[${clientName}] WhatsApp não está pronto. Aguardando até ${WHATSAPP_WAIT_TIMEOUT_MS / 1000} segundos...`);
        const startTime = Date.now();

        // Loop enquanto não estiver pronto E o tempo limite não foi atingido
        while (!isWhatsAppReady && (Date.now() - startTime < WHATSAPP_WAIT_TIMEOUT_MS)) {
            // Espera pelo intervalo definido
            await delay(WHATSAPP_CHECK_INTERVAL_MS);
            // Não precisa verificar 'isWhatsAppReady' aqui de novo, o 'while' já faz isso na próxima iteração
            console.log(`[${clientName}] Ainda aguardando WhatsApp... (${Math.round((Date.now() - startTime) / 1000)}s)`);
        }

        // Após o loop, verifica uma última vez se ficou pronto
        if (!isWhatsAppReady) {
            // Se ainda não estiver pronto após o tempo limite, lança o erro
            const errorMsg = `Cliente WhatsApp não ficou pronto após ${WHATSAPP_WAIT_TIMEOUT_MS / 1000} segundos. Mensagem não enviada.`;
            console.error(`[${clientName}] ${errorMsg}`);
            throw new Error(errorMsg);
        } else {
            // Se ficou pronto durante a espera
             console.log(`[${clientName}] WhatsApp ficou pronto durante a espera! Prosseguindo com o envio.`);
        }
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

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

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