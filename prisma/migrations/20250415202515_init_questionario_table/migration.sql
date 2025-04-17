-- CreateTable
CREATE TABLE "questionarios" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT NOT NULL,
    "clube" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "marca_carrinho" TEXT NOT NULL,
    "modelo_carrinho" TEXT,
    "numero_carrinho" TEXT,
    "marca_bateria" TEXT NOT NULL,
    "quantidade_bateria" TEXT NOT NULL,
    "tipo_bateria" TEXT NOT NULL,
    "tensao_bateria" TEXT NOT NULL,
    "caixa_bateria" TEXT NOT NULL,
    "parafusos" TEXT NOT NULL,
    "terminais" TEXT NOT NULL,
    "polos" TEXT NOT NULL,
    "nivel_bateria" TEXT NOT NULL,
    "tensoes" TEXT NOT NULL,
    "funcionario" TEXT NOT NULL,
    "comentario" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionarios_pkey" PRIMARY KEY ("id")
);
