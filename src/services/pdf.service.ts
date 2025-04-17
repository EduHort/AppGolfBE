import { PDFDocument, StandardFonts } from 'pdf-lib';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';
import fs from 'fs/promises';
import path from 'path';
import slugify from "slugify";
import { SurveyData } from '../types/survey.types';

const width = 780; // Largura da imagem do gráfico
const height = 510; // Altura da imagem do gráfico
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback: (ChartJS) => {
    ChartJS.defaults.font.family = 'Arial'; // Fonte padrão se não usar plugin
}});

async function generateChartImage(voltages: string[]): Promise<Buffer> {
    // Converte strings para números, tratando possíveis erros
    const numericData = voltages.map(v => parseFloat(v) || 0); // Usa 0 se não for número

    const configuration: ChartConfiguration<"bar"> = {
        type: "bar",
        data: {
            labels: ["Bat 1", "Bat 2", "Bat 3", "Bat 4", "Bat 5", "Bat 6", "Bat 7", "Bat 8"],
            datasets: [
                {
                    data: numericData,
                    backgroundColor: "rgba(0, 0, 255, 0.6)",
                },
            ],
        },
        options: {
            plugins: {
                legend: {
                    display: false
                }
            },
            layout: {
                padding: {
                    top: 10 // Evita que labels fiquem fora do gráfico
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: { weight: "bold", size: 28 },
                        color: "black"
                    },
                    grid: {
                        display: false // Remove as linhas de grade no eixo X
                    }
                },
                y: {
                    ticks: {
                        display: false // Remove os valores do eixo Y
                    },
                    grid: {
                        display: false // Remove as linhas de grade no eixo Y
                    }
                }
            }
        },
        plugins: [{
            id: 'customLabels',
            afterDraw: (chart: any) => {
                const ctx = chart.ctx;
                ctx.save();
                ctx.font = 'bold 28px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                chart.data.datasets[0].data.forEach((value: number, index: number) => {
                    if (value === 0) return; // Pula valores zero
                    
                    const meta = chart.getDatasetMeta(0);
                    const x = meta.data[index].x;
                    const y = meta.data[index].y - 15; // Posiciona um pouco acima da barra
                    
                    ctx.fillStyle = 'black';
                    ctx.fillText(`${value}V`, x, y);
                });
                ctx.restore();
            }
        }]
    };

    try {
        const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
        return buffer;
    } catch (error) {
        console.error("Erro ao renderizar gráfico:", error);
        throw error; 
    }
}

export async function generatePDF(surveyData: SurveyData, questionarioId: number): Promise<{ pdfPath: string; safeName: string }> {
    try {
        const hasComments = surveyData.comentario?.comentario && surveyData.comentario.comentario.trim() !== '';
        const templateFileName = hasComments ? 'RelatorioC.pdf' : 'Relatorio.pdf';
        const templatePath = path.resolve(__dirname, '..', '..', 'templates', templateFileName);

        const safeClientName = slugify(surveyData.cliente.nome, {
            lower: true,
            strict: true,
            replacement: "_", 
        });
        const outputFileName = `Relatorio_${safeClientName}_${questionarioId}.pdf`;
        const outputDir = path.resolve(__dirname, '..', '..', 'generated_pdfs');
        const outputPath = path.join(outputDir, outputFileName);
        
        // Carrega o PDF base
        const existingPdfBytes = await fs.readFile(templatePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const form = pdfDoc.getForm();

        // Carrega as fontes padrão do PDF
        const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Função auxiliar para definir o texto e a fonte
        function setText(field: string, text: string | null | undefined, isBold = false) {
            const valueToSet = text || ""; // Define um valor padrão se o texto for nulo ou indefinido
            try {
                const textField = form.getTextField(field);
                textField.setText(valueToSet);
                textField.updateAppearances(isBold ? boldFont : regularFont);
            } catch (e) {
                console.warn(`Aviso: Campo PDF "${field}" não encontrado no template.`);
            }
        }

        // Preenche os campos do PDF
        // Campos em negrito
        setText("nome", surveyData.cliente.nome, true); // Campo Negrito
        setText("clube", surveyData.inicio.clube, true); // Campo Negrito

        setText("email", surveyData.cliente.email);
        setText("fone", formatPhoneNumberPDF(surveyData.cliente.fone));
        setText("data", new Date().toLocaleDateString("pt-BR", { year: 'numeric', month: '2-digit', day: '2-digit'}));
        setText("cidade", `${surveyData.inicio.cidade} - ${surveyData.inicio.estado}`);
        setText("marca", surveyData.carrinho.marca);
        setText("modelo", surveyData.carrinho.modelo);
        setText("numero", surveyData.carrinho.numero);
        setText("marcaBat", surveyData.bateria.marcaBat);
        setText("quantidade", surveyData.bateria.quantidade);
        setText("tipo", surveyData.bateria.tipo);
        setText("tensao", surveyData.bateria.tensao);
        setText("caixa", surveyData.verificarBateria.caixa);
        setText("parafusos", surveyData.verificarBateria.parafusos);
        setText("terminais", surveyData.verificarBateria.terminais);
        setText("polos", surveyData.verificarBateria.polos);
        setText("nivel", surveyData.verificarBateria.nivel);

        if (hasComments) {
            setText("comentarios", surveyData.comentario?.comentario);
        }

        const chartImage = await generateChartImage(surveyData.verificarTensao.tensao);

        const y = hasComments ? 365 : 165; // Ajusta a posição Y da imagem com base na presença de comentários

        // Adiciona a imagem do gráfico ao PDF
        const image = await pdfDoc.embedPng(chartImage);
        const page = pdfDoc.getPages()[0];
        page.drawImage(image, {
            x: 310,
            y: y,
            width: 260,
            height: 170
        });

        // Achata os campos do formulário para impedir edição
        form.flatten();
        
        await fs.mkdir(outputDir, { recursive: true }); // Cria a pasta se não existir

        const modifiedPdfBytes = await pdfDoc.save();
        await fs.writeFile(outputPath, modifiedPdfBytes);

        return {
            pdfPath: outputPath,
            safeName: safeClientName,
        };
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        throw error;
    }
}

function formatPhoneNumberPDF(phone: string) {
    let rawPhone = phone.replace(/\D/g, ""); // Remove tudo que não for número
  
    if (rawPhone.length === 11 && rawPhone.startsWith("55")) {
        rawPhone = rawPhone.slice(2); // Remove o código do país se já estiver presente
    }
  
    if (rawPhone.length === 10) {
        return `(${rawPhone.slice(0, 2)}) ${rawPhone.slice(2, 6)}-${rawPhone.slice(6)}`;
    } else if (rawPhone.length === 11) {
        return `(${rawPhone.slice(0, 2)}) 9 ${rawPhone.slice(3, 7)}-${rawPhone.slice(7)}`;
    }
  
    return phone; // Retorna o original se não bater com os formatos esperados
  };