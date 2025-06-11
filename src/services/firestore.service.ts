import admin from 'firebase-admin';
import { Cliente, Carrinho } from '../types/types'; // Ajuste o caminho se necessário

/**
 * Procura um cliente na coleção 'clientes' pelo número de telefone.
 * @param fone O número de telefone a ser pesquisado.
 * @returns Retorna o objeto Cliente (com ID) se encontrado, senão null.
 */
export const findClientByPhone = async (db: admin.firestore.Firestore, fone: string): Promise<Cliente | null> => {
    try {
        const querySnapshot = await db.collection('clientes').where('fone', '==', fone).limit(1).get();

        if (querySnapshot.empty) {
            return null; // Cliente não encontrado
        }

        const clientDoc = querySnapshot.docs[0];
        return {
            id: clientDoc.id,
            ...clientDoc.data(),
        } as Cliente;
    } catch (error) {
        console.error(`[FirestoreService] Erro ao buscar cliente pelo fone ${fone}:`, error);
        throw new Error('Falha ao consultar banco de dados de clientes.');
    }
};

/**
 * Adiciona um novo cliente à coleção 'clientes'.
 * @param clientData Os dados do cliente vindos do questionário.
 * @returns O ID do novo documento do cliente criado.
 */
export const addClient = async (db: admin.firestore.Firestore, clientData: Cliente): Promise<string> => {
    try {
        // Remove o ID para não tentar salvá-lo no documento
        const { id, ...dataToSave } = clientData;

        const docRef = await db.collection('clientes').add({
            ...dataToSave,
            enviadoEm: admin.firestore.FieldValue.serverTimestamp(),
        });
        return docRef.id;
    } catch (error) {
        console.error('[FirestoreService] Erro ao adicionar novo cliente:', error);
        throw new Error('Falha ao salvar novo cliente no banco de dados.');
    }
};

/**
 * Adiciona um novo carrinho à coleção 'carrinhos', associando-o a um dono.
 * @param cartData Os dados do carrinho vindos do questionário.
 * @param ownerId O ID do documento do cliente (dono do carrinho).
 * @returns O ID do novo documento do carrinho criado.
 */
export const addCart = async (db: admin.firestore.Firestore, cartData: Carrinho, ownerId: string): Promise<string> => {
    try {
        // Remove o ID para não tentar salvá-lo e garante que o 'dono' seja o ID correto
        const { id, dono, ...dataToSave } = cartData;

        const docRef = await db.collection('carrinhos').add({
            ...dataToSave,
            dono: ownerId, // Associa o carrinho ao cliente
            enviadoEm: admin.firestore.FieldValue.serverTimestamp(),
        });
        return docRef.id;
    } catch (error) {
        console.error('[FirestoreService] Erro ao adicionar novo carrinho:', error);
        throw new Error('Falha ao salvar novo carrinho no banco de dados.');
    }
};