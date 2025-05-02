import admin from 'firebase-admin';
import { FirestoreData } from './types/survey.types';
import { generatePDF } from './services/pdf.service';
import { sendEmail } from './services/email.service';
import { sendWhatsAppMessage } from './services/whatsapp.service';

// --- INICIALIZAÇÃO ---
import serviceAccount from "../firebase-service-account-key.json";

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const db = admin.firestore();
const questionarioCollectionRef = db.collection('questionario');
const queryPendente = questionarioCollectionRef.where('status', '==', 'pendente');

console.log("Backend Listener (Firestore Only) iniciado. Aguardando novos questionários pendentes...");

// --- CONTROLE DE PROCESSAMENTO SEQUENCIAL ---
const processingQueue: FirebaseFirestore.QueryDocumentSnapshot[] = [];
let isProcessing = false;

const processNext = async () => {
    if (isProcessing || processingQueue.length === 0) return;

    isProcessing = true;
    const docSnapshot = processingQueue.shift();
    if (!docSnapshot) {
        isProcessing = false;
        return;
    }

    const docId = docSnapshot.id;
    const data = docSnapshot.data() as FirestoreData;
    const docRef = docSnapshot.ref;

    console.log(`\n[${new Date().toISOString()}] Processando item: ${docId}`);

    try {
        await docRef.update({
            status: 'processando',
            processadoInicioEm: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[${docId}] Status atualizado para 'processando'.`);

        if (!data.surveyData.cliente?.nome || !data.surveyData.cliente?.fone) {
            throw new Error(`Dados essenciais do cliente ausentes no questionário ${docId}.`);
        }

        // Gerar PDF
        let pdfResult: { pdfPath: string, safeName: string } | null = null;
        try {
            console.log(`[${docId}] Gerando PDF...`);
            pdfResult = await generatePDF(data.surveyData);
            console.log(`[${docId}] PDF gerado: ${pdfResult.pdfPath}`);
        } catch (pdfError) {
            console.error(`[${docId}] ERRO AO GERAR PDF:`, pdfError);
            throw new Error(`Falha ao gerar PDF: ${(pdfError as Error).message}`);
        }

        // Enviar Email
        let emailStatus = 'nao_aplicavel';
        if (data.surveyData.cliente?.email) {
            try {
                console.log(`[${docId}] Enviando email para ${data.surveyData.cliente.email}...`);
                await sendEmail(data.surveyData.cliente.email, data.surveyData.cliente.nome, pdfResult.safeName, pdfResult.pdfPath);
                emailStatus = 'sucesso';
                console.log(`[${docId}] Email enviado com sucesso.`);
            } catch (emailError) {
                console.error(`[${docId}] ERRO AO ENVIAR EMAIL:`, emailError);
                emailStatus = 'erro';
            }
        }

        // Enviar WhatsApp
        let whatsStatus = 'nao_enviado';
        if (data.surveyData.cliente?.fone) {
            try {
                console.log(`[${docId}] Enviando WhatsApp para ${data.surveyData.cliente.fone}...`);
                await sendWhatsAppMessage(data.surveyData.cliente.fone, data.surveyData.cliente.nome, pdfResult.pdfPath);
                whatsStatus = 'sucesso';
                console.log(`[${docId}] WhatsApp enviado com sucesso.`);
            } catch (whatsError) {
                console.error(`[${docId}] ERRO AO ENVIAR WHATSAPP:`, whatsError);
                whatsStatus = 'erro';
            }
        } else {
            whatsStatus = 'sem_numero';
        }

        await docRef.update({
            status: 'sucesso',
            pdfGerado: true,
            emailStatus: emailStatus,
            whatsStatus: whatsStatus,
            processadoFimEm: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[${docId}] Processamento concluído com SUCESSO.`);

    } catch (error: any) {
        console.error(`[${docId}] ERRO DURANTE PROCESSAMENTO:`, error);
        try {
            await docRef.update({
                status: 'erro',
                mensagemErro: error.message || 'Erro desconhecido durante o processamento no backend.',
                processadoFimEm: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`[${docId}] Status do item atualizado para ERRO no Firestore.`);
        } catch (updateError) {
            console.error(`[${docId}] ERRO CRÍTICO: Não foi possível atualizar o status de erro no Firestore:`, updateError);
        }
    } finally {
        isProcessing = false;
        processNext(); // Continua com o próximo item na fila
    }
};

// --- LISTENER DO FIRESTORE ---
const unsubscribe = queryPendente.onSnapshot(querySnapshot => {
    querySnapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
            processingQueue.push(change.doc);
            processNext();
        }
    });
}, err => {
    console.error("Erro fatal no listener do Firestore:", err);
    unsubscribe();
});

// --- GERENCIAMENTO DO PROCESSO ---
process.on('SIGINT', () => {
    console.log("\nRecebido SIGINT. Desligando listener...");
    unsubscribe();
    console.log("Listener desligado. Saindo.");
    process.exit(0);
});
