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
const questionariosCollectionRef = db.collection('questionarios');
// --- NOME DO ARQUIVO EXCEL ---
const now = new Date();
const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
const excelName = `questionarios-${formattedDate}.xlsx`;

const excelPath = path.join(__dirname, '..', '..', excelName);

const generateExcel = async () => {
    try {
        const snapshot = await questionariosCollectionRef.get();

        if (snapshot.empty) {
            console.log("Nenhum documento encontrado para o relatório.");
            throw new Error("Nenhum dado encontrado para gerar o relatório.");
        }

        // Agrupar os dados
        const groupedData: {
            [clienteId: string]: {
                cliente: any;
                carrinhos: {
                    [carrinhoId: string]: {
                        carrinho: any;
                        surveys: FirebaseFirestore.DocumentData[];
                    };
                };
            };
        } = {};

        snapshot.docs.forEach(doc => {
            const data = doc.data() as FirestoreData;
            const clienteId = data.surveyData?.cliente.id ?? doc.id; // Usar o ID do documento se não houver cliente.id
            const carrinhoId = data.surveyData?.carrinho.id ?? doc.id; // Usar o ID do documento se não houver carrinho.id

            if (!groupedData[clienteId]) {
                groupedData[clienteId] = {
                    cliente: data.surveyData?.cliente,
                    carrinhos: {}
                };
            }

            if (!groupedData[clienteId].carrinhos[carrinhoId]) {
                groupedData[clienteId].carrinhos[carrinhoId] = {
                    carrinho: data.surveyData?.carrinho,
                    surveys: []
                };
            }

            groupedData[clienteId].carrinhos[carrinhoId].surveys.push(data);
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Relatório Hierárquico');

        const formatTimestamp = (ts: any): string => {
            if (ts && typeof ts.toDate === 'function') {
                return ts.toDate().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            }
            return '';
        };

        let rowIndex = 1;

        Object.entries(groupedData).forEach(([clienteId, clienteData]) => {
            const cliente = clienteData.cliente;

            // Título do Cliente
            worksheet.mergeCells(`A${rowIndex}:J${rowIndex}`);
            const clienteCell = worksheet.getCell(`A${rowIndex}`);
            clienteCell.value = `Cliente: ${cliente?.nome ?? 'Desconhecido'}`;
            clienteCell.font = { bold: true, size: 14 };
            clienteCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFBDE5F8' },
            };
            rowIndex++;

            // Dados do Cliente (com leve indentação)
            const clienteInfo = [
                `Telefone: ${cliente?.fone ?? ''}`,
                `Email: ${cliente?.email ?? ''}`,
                `Cidade: ${cliente?.cidade ?? ''}`,
                `Estado: ${cliente?.estado ?? ''}`,
                `Clube: ${cliente?.clube ?? ''}`
            ];
            clienteInfo.forEach(info => {
                const cell = worksheet.getCell(`A${rowIndex}`);
                cell.value = `   ${info}`;
                cell.font = { italic: true, color: { argb: 'FF444444' } };
                rowIndex++;
            });

            rowIndex++; // espaço

            Object.entries(clienteData.carrinhos).forEach(([carrinhoId, carrinhoData]) => {
                const carrinho = carrinhoData.carrinho;

                // Título do Carrinho
                worksheet.mergeCells(`A${rowIndex}:J${rowIndex}`);
                const carrinhoCell = worksheet.getCell(`A${rowIndex}`);
                carrinhoCell.value = `Carrinho: ${carrinho?.marca ?? ''} - ${carrinho?.modelo ?? ''} - Nº ${carrinho?.numero ?? ''} - Cor ${carrinho?.cor ?? ''}`;
                carrinhoCell.font = { italic: true, size: 12 };
                carrinhoCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFEFEFEF' },
                };
                rowIndex++;

                // Dados do Carrinho
                const carrinhoInfo = [
                    `Marca Bateria: ${carrinho?.marcaBat ?? ''}`,
                    `Tipo: ${carrinho?.tipo ?? ''}`,
                    `Tensão: ${carrinho?.tensao ?? ''}`,
                    `Quantidade: ${carrinho?.quantidade ?? ''}`
                ];
                carrinhoInfo.forEach(info => {
                    worksheet.getCell(`A${rowIndex}`).value = `   ${info}`;
                    rowIndex++;
                });

                rowIndex++; // espaço

                // Cabeçalho da survey
                const headers = [
                    'Data Envio', 'Funcionário', 'Clube', 'Tensões', 'Densidades',
                    'Comentário', 'PDF', 'Status Email', 'Status WhatsApp', 'Processado Em'
                ];

                headers.forEach((header, i) => {
                    const cell = worksheet.getCell(rowIndex, i + 1);
                    cell.value = header;
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF444444' },
                    };
                    cell.alignment = { horizontal: 'center' };
                    cell.border = {
                        top: { style: 'thin' },
                        bottom: { style: 'thin' },
                        left: { style: 'thin' },
                        right: { style: 'thin' },
                    };
                });
                rowIndex++;

                // Dados da survey
                carrinhoData.surveys.forEach(survey => {
                    const data = survey;

                    const rowData = [
                        formatTimestamp(data.enviadoEm),
                        data.surveyData?.usuario?.nome ?? '',
                        data.surveyData?.usuario?.clube ?? '',
                        data.surveyData?.tensao?.join(', ') ?? '',
                        data.surveyData?.densidade?.join(', ') ?? '',
                        data.surveyData?.comentario ?? '',
                        data.pdfGerado === true ? 'Sim' : (data.pdfGerado === false ? 'Não' : ''),
                        data.emailStatus ?? '',
                        data.whatsStatus ?? '',
                        formatTimestamp(data.processadoFimEm)
                    ];

                    rowData.forEach((value, i) => {
                        const cell = worksheet.getCell(rowIndex, i + 1);
                        cell.value = value;
                        cell.border = {
                            top: { style: 'thin' },
                            bottom: { style: 'thin' },
                            left: { style: 'thin' },
                            right: { style: 'thin' },
                        };
                    });

                    rowIndex++;
                });

                rowIndex++; // espaço entre carrinhos
            });

            rowIndex += 2; // espaço entre clientes
        });

        worksheet.columns.forEach(column => {
            column.width = 20;
        });

        await workbook.xlsx.writeFile(excelPath);
        console.log(`Excel gerado com sucesso em: ${excelPath}`);
    }
    catch (error) {
        console.error("Erro ao gerar o Excel:", error);
        throw new Error("Erro ao gerar o Excel.");
    }
};

generateExcel();