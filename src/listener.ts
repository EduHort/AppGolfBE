import admin from 'firebase-admin';
import { FirestoreData } from './types/survey.types';
import { generatePDF } from './services/pdf.service';
import { sendEmail } from './services/email.service';
import { sendWhatsAppMessage } from './services/whatsapp.service';

// --- INICIALIZAÇÃO ---

// Carrega as credenciais da conta de serviço Firebase
import serviceAccount from "../firebase-service-account-key.json";

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

// Obtém a instância do Firestore do Admin SDK
const db = admin.firestore();
const questionarioCollectionRef = db.collection('questionario');

console.log("Backend Listener (Firestore Only) iniciado. Aguardando novos questionários pendentes...");

// --- LISTENER DO FIRESTORE ---
const unsubscribe = questionarioCollectionRef.onSnapshot(querySnapshot => {
    querySnapshot.docChanges().forEach(async (change) => {

        if (change.type === 'added') {
            const docId = change.doc.id; // ID do documento no Firestore
            const data = change.doc.data() as FirestoreData; // Dados do Firestore
            const docRef = change.doc.ref; // Referência ao documento Firestore

            if (data.status === 'pendente') {
                console.log(`\n[${new Date().toISOString()}] Novo questionário PENDENTE detectado: ${docId}`);

                // --- INÍCIO DO PROCESSAMENTO ---
                try {
                    // 1. Marcar como 'processando' no Firestore
                    await docRef.update({
                        status: 'processando',
                        processadoInicioEm: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`[${docId}] Status atualizado para 'processando'.`);

                    // 2. Validação básica (garantir que dados essenciais para serviços existem)
                    if (!data.surveyData.cliente?.nome || !data.surveyData.cliente?.fone) {
                        // Se dados CRÍTICOS para PDF/Email/WhatsApp faltarem
                        throw new Error(`Dados essenciais do cliente ausentes no questionário ${docId}.`);
                    }

                    // 3. Gerar PDF
                    let pdfResult: { pdfPath: string, safeName: string } | null = null;
                    try {
                        console.log(`[${docId}] Gerando PDF...`);
                        pdfResult = await generatePDF(data.surveyData);
                        console.log(`[${docId}] PDF gerado: ${pdfResult.pdfPath}`);
                    } catch (pdfError) {
                        console.error(`[${docId}] ERRO AO GERAR PDF:`, pdfError);
                        throw new Error(`Falha ao gerar PDF: ${(pdfError as Error).message}`);
                    }

                    // 4. Enviar comunicações (SE PDF foi gerado com sucesso)
                    let emailStatus = 'nao_aplicavel'; // Assume que não tem email
                    let whatsStatus = 'nao_enviado';   // Assume que não foi enviado ainda

                    // Envia Email (se houver email)
                    if (data.surveyData.cliente?.email) {
                        try {
                            console.log(`[${docId}] Enviando email para ${data.surveyData.cliente.email}...`);
                            await sendEmail(data.surveyData.cliente.email, data.surveyData.cliente.nome, pdfResult!.safeName, pdfResult!.pdfPath);
                            emailStatus = 'sucesso';
                            console.log(`[${docId}] Email enviado com sucesso.`);
                        } catch (emailError) {
                            console.error(`[${docId}] ERRO AO ENVIAR EMAIL:`, emailError);
                            emailStatus = 'erro';
                        }
                    }

                    // Envia WhatsApp
                    if (data.surveyData.cliente?.fone) {
                         try {
                            console.log(`[${docId}] Enviando WhatsApp para ${data.surveyData.cliente.fone}...`);
                            await sendWhatsAppMessage(data.surveyData.cliente.fone, data.surveyData.cliente.nome, pdfResult!.pdfPath);
                            whatsStatus = 'sucesso';
                            console.log(`[${docId}] WhatsApp enviado com sucesso.`);
                        } catch (whatsError) {
                            console.error(`[${docId}] ERRO AO ENVIAR WHATSAPP:`, whatsError);
                            whatsStatus = 'erro';
                        }
                    } else {
                         // Se não tiver fone, marca como não aplicável ou sem número
                         whatsStatus = 'sem_numero';
                    }


                    // 5. Atualiza o status final no Firestore para 'sucesso'
                    console.log(`[${docId}] Atualizando status final para 'sucesso'.`);
                    await docRef.update({
                        status: 'sucesso',
                        pdfGerado: true,
                        emailStatus: emailStatus,
                        whatsStatus: whatsStatus,
                        processadoFimEm: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`[${docId}] Processamento concluído com SUCESSO.`);

                } catch (error: any) {
                    // --- TRATAMENTO DE ERRO GERAL DO PROCESSAMENTO ---
                    console.error(`[${docId}] ERRO DURANTE PROCESSAMENTO:`, error);

                    // Atualiza o status no Firestore para 'erro'
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
                }
            }
        }
    });
}, err => {
    console.error("Erro fatal no listener do Firestore:", err);
    unsubscribe();
});

// --- GERENCIAMENTO DO PROCESSO ---
process.on('SIGINT', () => {
    console.log("\nRecebido SIGINT. Desligando listener...");
    unsubscribe(); // Cancela o listener do Firestore
    console.log("Listener desligado. Saindo.");
    process.exit(0);
});