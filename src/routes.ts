// src/routes.ts
import { Router, Request, Response } from 'express';
import { prisma } from './lib/prisma';
import { SurveyData } from './types/survey.types';
import { generatePDF } from './services/pdf.service';
import { sendEmail } from './services/email.service';
import { sendWhatsAppMessage } from './services/whatsapp.service';

// Cria um roteador do Express
export const routes = Router();

// Rota POST para receber os dados do questionário
routes.post('/survey', async (req: Request, res: Response) => {
    try {
        // 1. Extrai os dados do corpo da requisição
        const surveyData = req.body as SurveyData; // Faz o cast para nossa interface

        // 2. Validação básica
        // Verifica se os objetos principais existem
        if (!surveyData || !surveyData.inicio || !surveyData.cliente || !surveyData.carrinho || !surveyData.bateria || !surveyData.verificarBateria || !surveyData.verificarTensao || !surveyData.comentario) {
            return res.status(400).json({ message: 'Dados incompletos ou em formato inválido.' });
        }
        // Você poderia adicionar validações mais específicas aqui (ex: verificar tipos, campos obrigatórios dentro dos objetos)

        // 3. Mapeia os dados recebidos para o formato do modelo Prisma `Questionario`
        const dataToSave = {
            // Dados do Cliente
            nome: surveyData.cliente.nome,
            email: surveyData.cliente?.email, // Prisma aceita undefined para campos opcionais (?)
            telefone: surveyData.cliente.fone,
            // Dados de Inicio
            clube: surveyData.inicio.clube,
            cidade: surveyData.inicio.cidade,
            estado: surveyData.inicio.estado,
            funcionario: surveyData.inicio.usuario,
            // Dados do Carrinho
            marca_carrinho: surveyData.carrinho.marca,
            modelo_carrinho: surveyData.carrinho?.modelo,
            numero_carrinho: surveyData.carrinho?.numero,
            // Dados da Bateria
            marca_bateria: surveyData.bateria.marcaBat,
            quantidade_bateria: surveyData.bateria.quantidade,
            tipo_bateria: surveyData.bateria.tipo,
            tensao_bateria: surveyData.bateria.tensao,
            // Dados da Verificação da Bateria
            caixa_bateria: surveyData.verificarBateria.caixa,
            parafusos: surveyData.verificarBateria.parafusos,
            terminais: surveyData.verificarBateria.terminais,
            polos: surveyData.verificarBateria.polos,
            nivel_bateria: surveyData.verificarBateria.nivel,
            // Dados da Verificação de Tensão (precisa ser stringificado)
            tensoes: JSON.stringify(surveyData.verificarTensao.tensao), // Convertendo array para string JSON
            // Comentário
            comentario: surveyData.comentario?.comentario,
            // 'data' será definido automaticamente pelo @default(now()) no Prisma
        };

        // 4. Salva os dados no banco de dados usando Prisma
        const novoQuestionario = await prisma.questionario.create({
            data: dataToSave,
        });

        let responseMsg = `Questionário salvo com sucesso`;
        let pdfResult: { pdfPath: string, safeName: string } | null = null;

        try {
            pdfResult = await generatePDF(surveyData, novoQuestionario.id);
            console.log(`[${novoQuestionario.id}] PDF gerado com sucesso: ${pdfResult.pdfPath}`);
        } catch (pdfError) {
            console.error(`[${novoQuestionario.id}] ERRO AO GERAR PDF:`, pdfError);
            responseMsg += `\nMas não foi possivel gerar o PDF`;
        }

        if(pdfResult) {
            if(surveyData.cliente.email) {
                try {
                    await sendEmail(surveyData.cliente.email, surveyData.cliente.nome, pdfResult.safeName, pdfResult.pdfPath);
                    responseMsg += `\nEmail enviado com sucesso.`;
                } catch (emailError) {
                    console.error(`[${novoQuestionario.id}] ERRO AO ENVIAR EMAIL:`, emailError);
                    responseMsg += `\nEmail não enviado.`;
                }
            }

            // Envia o PDF via WhatsApp
            try {
                await sendWhatsAppMessage(surveyData.cliente.fone, surveyData.cliente.nome, pdfResult.pdfPath);
                responseMsg += `\nWhatsApp enviado com sucesso.`;
            } catch (whatsError) {
                console.error(`[${novoQuestionario.id}] ERRO AO ENVIAR WHATSAPP:`, whatsError);
                responseMsg += `\nWhatsApp não enviado.`;
            }
        }

        // 5. Responde ao cliente com sucesso (Status 201 - Created)
        return res.status(201).json({
            message: responseMsg,
            id: novoQuestionario.id
        });

    } catch (error) {
        console.error('Erro ao salvar questionário:', error);

        // 6. Responde ao cliente com erro (Status 500 - Internal Server Error)
        if (!res.headersSent) {
           res.status(500).json({ message: 'Erro interno crítico ao processar a requisição.' });
        }
    }
});
