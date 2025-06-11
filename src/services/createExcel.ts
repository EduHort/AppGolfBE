import admin from 'firebase-admin';
import { FirestoreData } from '../types/types';
import path from 'path';
import ExcelJS from 'exceljs';

// --- INICIALIZAÇÃO ---
import serviceAccount from "../../firebase-service-account-key.json";

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const db = admin.firestore();
const questionarioCollectionRef = db.collection('questionario');
const querySucesso = questionarioCollectionRef.where('status', '==', 'sucesso');
const excelName = 'questionarios.xlsx';
const excelPath = path.join(__dirname, '..', '..', excelName);

const generateExcel = async () => {
    try {
        const snapshot = await querySucesso.get();

        if (snapshot.empty) {
            console.log("Nenhum documento encontrado para o relatório.");
            throw new Error("Nenhum dado encontrado para gerar o relatório.");
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Questionários');

        worksheet.columns = [
            { header: 'Status Processamento', key: 'status', width: 15 },
            { header: 'Data Envio', key: 'enviadoEm', width: 20 },
            // --- Dados da Pesquisa (do objeto surveyData) ---
            { header: 'Funcionário', key: 'funcionario', width: 20 },
            { header: 'Clube', key: 'clube', width: 25 },
            { header: 'Cidade', key: 'cidade', width: 20 },
            { header: 'Estado', key: 'estado', width: 10 },
            { header: 'Nome Cliente', key: 'clienteNome', width: 30 },
            { header: 'Telefone Cliente', key: 'clienteFone', width: 20 },
            { header: 'Email Cliente', key: 'clienteEmail', width: 30 },
            { header: 'Clube Cliente', key: 'clienteClube', width: 30 },
            { header: 'Cidade Cliente', key: 'clienteCidade', width: 30 },
            { header: 'Estado Cliente', key: 'clienteEstado', width: 30 },
            { header: 'Marca Carrinho', key: 'carrinhoMarca', width: 15 },
            { header: 'Modelo Carrinho', key: 'carrinhoModelo', width: 15 },
            { header: 'Num Carrinho', key: 'carrinhoNumero', width: 15 },
            { header: 'Cor Carrinho', key: 'carrinhoCor', width: 15 },
            { header: 'Marca Bateria', key: 'batMarca', width: 20 },
            { header: 'Tipo Bateria', key: 'batTipo', width: 15 },
            { header: 'Tensão Bateria', key: 'batTensao', width: 15 },
            { header: 'Qtd Bateria', key: 'batQtd', width: 10 },
            { header: 'Verif: Caixa', key: 'verifCaixa', width: 15 },
            { header: 'Verif: Parafusos', key: 'verifParafusos', width: 15 },
            { header: 'Verif: Terminais', key: 'verifTerminais', width: 15 },
            { header: 'Verif: Polos', key: 'verifPolos', width: 15 },
            { header: 'Verif: Nível', key: 'verifNivel', width: 15 },
            { header: 'Verif: Tensões', key: 'verifTensoes', width: 30 },
            { header: 'Verif: Densidade', key: 'verifDensidade', width: 30 },
            { header: 'Comentário', key: 'comentario', width: 40 },
            // --- Metadados do Processamento ---
            { header: 'PDF Gerado', key: 'pdfGerado', width: 12 },
            { header: 'Status Email', key: 'emailStatus', width: 15 },
            { header: 'Status WhatsApp', key: 'whatsStatus', width: 15 },
            { header: 'Data Processamento Fim', key: 'processadoFimEm', width: 20 },
            { header: 'Mensagem Erro', key: 'mensagemErro', width: 40 },
        ];

        // Formata o cabeçalho
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        snapshot.docs.forEach((doc) => {
            const data = doc.data() as FirestoreData; // Usa seu tipo

            // Função auxiliar para formatar Timestamp ou retornar vazio
            const formatTimestamp = (ts: any): string => {
                if (ts && typeof ts.toDate === 'function') {
                    // Formato mais legível ou use toISOString() se preferir
                    return ts.toDate().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                }
                return '';
            };

            worksheet.addRow({
                status: data.status ?? '',
                enviadoEm: formatTimestamp(data.enviadoEm),
                // --- Dados da Pesquisa ---
                // Lembre-se de usar 'data.surveyData.' por causa da sua estrutura
                funcionario: data.surveyData?.usuario.nome ?? '',
                clube: data.surveyData?.usuario.clube ?? '',
                cidade: data.surveyData?.usuario.cidade ?? '',
                estado: data.surveyData?.usuario.estado ?? '',
                clienteNome: data.surveyData?.cliente?.nome ?? '',
                clienteFone: data.surveyData?.cliente?.fone ?? '',
                clienteEmail: data.surveyData?.cliente?.email ?? '',
                clienteClube: data.surveyData?.cliente?.clube ?? '',
                clienteCidade: data.surveyData?.cliente?.cidade ?? '',
                clienteEstado: data.surveyData?.cliente?.estado ?? '',
                carrinhoMarca: data.surveyData?.carrinho?.marca ?? '',
                carrinhoModelo: data.surveyData?.carrinho?.modelo ?? '',
                carrinhoNumero: data.surveyData?.carrinho?.numero ?? '',
                carrinhoCor: data.surveyData?.carrinho?.cor ?? '',
                batMarca: data.surveyData?.carrinho?.marcaBat ?? '',
                batTipo: data.surveyData?.carrinho?.tipo ?? '',
                batTensao: data.surveyData?.carrinho?.tensao ?? '',
                batQtd: data.surveyData?.carrinho?.quantidade ?? '',
                verifCaixa: data.surveyData?.verificarBateria?.caixa ?? '',
                verifParafusos: data.surveyData?.verificarBateria?.parafusos ?? '',
                verifTerminais: data.surveyData?.verificarBateria?.terminais ?? '',
                verifPolos: data.surveyData?.verificarBateria?.polos ?? '',
                verifNivel: data.surveyData?.verificarBateria?.nivel ?? '',
                verifTensoes: data.surveyData?.tensao?.join(', ') ?? '', // Junta o array
                verifDensidade: data.surveyData?.densidade?.join(', ') ?? '', // Junta o array
                comentario: data.surveyData?.comentario ?? '',
                // --- Metadados ---
                pdfGerado: data.pdfGerado === true ? 'Sim' : (data.pdfGerado === false ? 'Não' : ''),
                emailStatus: data.emailStatus ?? '', // Usa o nome correto do status
                whatsStatus: data.whatsStatus ?? '', // Usa o nome correto do status
                processadoFimEm: formatTimestamp(data.processadoFimEm),
                mensagemErro: data.mensagemErro ?? '',
            });
        });

        await workbook.xlsx.writeFile(excelPath);
        console.log(`Excel gerado com sucesso em: ${excelPath}`);
    }
    catch (error) {
        console.error("Erro ao gerar o Excel:", error);
        throw new Error("Erro ao gerar o Excel.");
    }
}

generateExcel();