import { Client, LocalAuth, Contact } from 'whatsapp-web.js';
import * as XLSX from 'xlsx';
import qrcode from 'qrcode-terminal';

// Inicializa o cliente com autenticação local (sessão salva)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
});

// Mostra o QR Code no terminal (primeira autenticação)
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

// Confirma login
client.on('ready', async () => {
    console.log('✅ Cliente pronto! Coletando contatos...');

    const contacts: Contact[] = await client.getContacts();
    const savedContacts = contacts.filter(contact => !contact.isGroup && contact.isMyContact);

    // Monta os dados para o Excel
    const data = savedContacts.map((c) => ({
        Nome_Contato: c.name || '',
        Nome_Whats: c.pushname || '',
        Número: c.id.user,
        É_Negócio: c.isBusiness ? 'Sim' : 'Não',
    }));

    // Cria a planilha
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contatos');

    // Salva o arquivo
    const fileName = 'contatos-whatsapp.xlsx';
    XLSX.writeFile(wb, fileName);

    console.log(`📁 Contatos exportados para: ${fileName}`);
    process.exit(0);
});

client.initialize();
