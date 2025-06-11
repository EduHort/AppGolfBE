import { PDFDocument, StandardFonts } from 'pdf-lib';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';
import fs from 'fs/promises';
import path from 'path';
import slugify from "slugify";
import { SurveyData } from '../types/types';

const width = 780; // Largura da imagem do gráfico
const height = 510; // Altura da imagem do gráfico
const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width, height, chartCallback: (ChartJS) => {
        ChartJS.defaults.font.family = 'Arial'; // Fonte padrão se não usar plugin
    }
});

async function generateChartImage(
    tensoes: string[],
    densidades: string[] | null | undefined,
    quantidade: number
): Promise<Buffer> {
    // Limita os dados à quantidade especificada
    const limitedTensao = tensoes.slice(0, quantidade).map(v => parseFloat(v) || 0);
    const limitedDensidade = densidades?.slice(0, quantidade).map(v => parseFloat(v) || 0);

    const labels = Array.from({ length: quantidade }, (_, i) => `Bat ${i + 1}`);

    const datasets: any[] = [
        {
            label: "Tensão (V)",
            data: limitedTensao,
            borderColor: "rgba(0, 0, 255, 0.7)",
            backgroundColor: "rgba(0, 0, 255, 0.3)",
            fill: false,
            tension: 0.3,
            pointBackgroundColor: "blue",
            pointRadius: 5
        }
    ];

    if (limitedDensidade && limitedDensidade.some(v => v !== 0)) {
        datasets.push({
            label: "Densidade (U)",
            data: limitedDensidade,
            borderColor: "rgba(0, 128, 0, 0.7)",
            backgroundColor: "rgba(0, 128, 0, 0.3)",
            fill: false,
            tension: 0.3,
            pointBackgroundColor: "green",
            pointRadius: 5
        });
    }

    const configuration: ChartConfiguration<'line'> = {
        type: "line",
        data: {
            labels,
            datasets
        },
        options: {
            responsive: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: { size: 18 },
                        color: 'black'
                    }
                },
                tooltip: {
                    enabled: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: { size: 18, weight: 'bold' },
                        color: "black"
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        display: false
                    },
                    grid: {
                        display: false
                    }
                }
            }
        },
        plugins: [{
            id: 'pointValueLabels',
            afterDatasetsDraw: (chart: any) => {
                const ctx = chart.ctx;
                ctx.save();
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    meta.data.forEach((point: any, index: number) => {
                        const value = dataset.data[index];
                        if (value === 0) return;

                        ctx.fillStyle = dataset.borderColor;
                        ctx.fillText(`${value}`, point.x, point.y - 10);
                    });
                });

                ctx.restore();
            }
        }]
    };

    return await chartJSNodeCanvas.renderToBuffer(configuration);
}

export async function generatePDF(surveyData: SurveyData): Promise<{ pdfPath: string; safeName: string }> {
    try {
        const hasComments = surveyData.comentario && surveyData.comentario.trim() !== '';
        const templateFileName = hasComments ? 'RelatorioC.pdf' : 'Relatorio.pdf';
        const templatePath = path.resolve(__dirname, '..', '..', 'templates', templateFileName);

        const safeClientName = slugify(surveyData.cliente.nome, {
            lower: true,
            strict: true,
            replacement: "_",
        });
        const outputFileName = `Relatorio_${safeClientName}.pdf`;
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
        setText("clube", surveyData.cliente.clube, true); // Campo Negrito

        setText("email", surveyData.cliente.email);
        setText("fone", formatPhoneNumberPDF(surveyData.cliente.fone));
        setText("data", new Date().toLocaleDateString("pt-BR", { year: 'numeric', month: '2-digit', day: '2-digit' }));
        setText("cidade", `${surveyData.cliente.cidade} - ${surveyData.cliente.estado}`);
        setText("marca", surveyData.carrinho.marca);
        setText("modelo", surveyData.carrinho.modelo);
        setText("numero", surveyData.carrinho.numero);
        setText("marcaBat", surveyData.carrinho.marcaBat);
        setText("quantidade", surveyData.carrinho.quantidade);
        setText("tipo", surveyData.carrinho.tipo);
        setText("tensao", surveyData.carrinho.tensao);
        setText("caixa", surveyData.verificarBateria.caixa);
        setText("parafusos", surveyData.verificarBateria.parafusos);
        setText("terminais", surveyData.verificarBateria.terminais);
        setText("polos", surveyData.verificarBateria.polos);
        setText("nivel", surveyData.verificarBateria.nivel);

        if (hasComments) {
            setText("comentarios", surveyData.comentario);
        }

        const chartImage = await generateChartImage(surveyData.tensao, surveyData.densidade, parseInt(surveyData.carrinho.quantidade) || 0);

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