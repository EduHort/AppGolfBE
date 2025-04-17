export interface Inicio {
    usuario: string;
    cidade: string;
    estado: string;
    clube: string;
}
export interface Cliente {
    nome: string;
    fone: string;
    email?: string;
}
export interface Carrinho {
    marca: string;
    modelo?: string;
    numero?: string;
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
    comentario?: string;
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