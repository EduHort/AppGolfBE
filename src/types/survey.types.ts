import { FieldValue, Timestamp } from "firebase/firestore";

export interface Inicio {
    usuario: string;
    cidade: string;
    estado: string;
    clube: string;
}

export interface Cliente {
    nome: string;
    fone: string;
    email?: string | null;
}

export interface Carrinho {
    marca: string;
    modelo?: string | null;
    numero?: string | null;
}

export interface Bateria {
    marcaBat: string;
    tipo: string;
    tensao: string;
    quantidade: string;
}

export interface VerificarBateria {
    caixa: string;
    parafusos: string;
    terminais: string;
    polos: string;
    nivel: string;
}

export interface VerificarTensao {
    tensao: string[];
}

export interface Comentario {
    comentario?: string | null;
}

export interface SurveyData {
    inicio: Inicio;
    cliente: Cliente;
    carrinho: Carrinho;
    bateria: Bateria;
    verificarBateria: VerificarBateria;
    verificarTensao: VerificarTensao;
    comentario: Comentario;
}

export interface FirestoreData {
    surveyData: SurveyData;
    status: 'pendente' | 'processando' | 'sucesso' | 'erro';
    Email?: 'nao_aplicavel' | 'sucesso' | 'erro';
    whatsapp?: 'nao_enviado' | 'sucesso' | 'erro';
    enviadoEm: Timestamp | FieldValue;
    processadoInicioEm?: Timestamp;
    processadoFimEm?: Timestamp;
    pdfGerado?: boolean;
    mensagemErro?: string;
}

export interface OfflineSurveyItem {
    id: string;
    savedAt: string;
    name: string;
    payload: SurveyData;
    status: 'pending' | 'syncing' | 'failed';
    originalKey?: string;
}