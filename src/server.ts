import express from 'express';
import dotenv from 'dotenv';
import { routes } from './routes';

dotenv.config();

const app = express();

// Middleware para permitir que o Express entenda JSON no corpo das requisições
app.use(express.json());

app.use(routes);

// Define a porta onde o servidor vai rodar
// Pega da variável de ambiente PORT ou usa 5000 como padrão
const PORT = process.env.PORT || 5000;

// Função assíncrona para iniciar o servidor
const startServer = async () => {
    try {
        // Inicia o servidor Express para ouvir na porta definida
        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar o servidor:', error);
        process.exit(1); // Encerra a aplicação se não conseguir iniciar
    }
};

// Chama a função para iniciar o servidor
startServer();