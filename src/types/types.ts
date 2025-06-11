import { FieldValue, Timestamp } from "firebase/firestore";

export interface Usuario {
    nome: string;
    cidade: string;
    estado: string;
    clube: string;
}

export interface Cliente {
    nome: string;
    fone: string;
    email?: string | null;
    clube: string;
    cidade: string;
    estado: string;
    id?: string;
    enviadoEm?: Timestamp | FieldValue;
    atualizadoEm?: Timestamp;
}

export interface Carrinho {
    marca: string;
    modelo?: string | null;
    numero?: string | null;
    cor?: string | null;
    marcaBat: string;
    tipo: string;
    tensao: string;
    quantidade: string;
    dono: string;
    id?: string;
    enviadoEm?: Timestamp | FieldValue;
    atualizadoEm?: Timestamp;
}

interface VerificarBateria {
    caixa: string;
    parafusos: string;
    terminais: string;
    polos: string;
    nivel: string;
}

export interface TabsData {
    tensao: string[];
    comentario?: string | null;
    densidade?: string[] | null;
    verificarBateria: VerificarBateria;
}

export interface SurveyData extends TabsData {
    usuario: Usuario;
    carrinho: Carrinho;
    cliente: Cliente;
}

export interface FirestoreData {
    surveyData: SurveyData;
    status: 'pendente' | 'processando' | 'sucesso' | 'erro';
    emailStatus?: 'nao_aplicavel' | 'sucesso' | 'erro';
    whatsStatus?: 'nao_enviado' | 'sucesso' | 'erro';
    enviadoEm: Timestamp | FieldValue;
    processadoInicioEm?: Timestamp;
    processadoFimEm?: Timestamp;
    pdfGerado?: boolean;
    mensagemErro?: string;
    atualizadoEm?: Timestamp;
    id?: string;
}

export interface OfflineSurveyItem {
    id: string;
    savedAt: string;
    name: string;
    payload: SurveyData;
    status: 'pendente' | 'processando' | 'erro';
    originalKey?: string;
}
