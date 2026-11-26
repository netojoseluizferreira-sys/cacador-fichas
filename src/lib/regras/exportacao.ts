import type {
  FichaDados,
  ItemComPontos,
  ItemDistincao,
  ItemTrunfo,
} from "@/types/ficha";
import { nomePorId } from "./constantes";

function blocoGrupo(titulo: string, grupo: Record<string, number>): string {
  const linhas = Object.entries(grupo).map(
    ([id, valorItem]) => `${nomePorId(id)}: ${valorItem}`
  );
  return `${titulo}\n${linhas.join("\n")}`;
}

function listaTexto(lista: string[]): string {
  const filtrada = lista.map((item) => item.trim()).filter(Boolean);
  return filtrada.length
    ? filtrada.map((item) => `- ${item}`).join("\n")
    : "Nenhum.";
}

function descricaoItemTexto(item: { resumo?: string }): string {
  return item.resumo ? `\n  Descrição: ${item.resumo}` : "";
}

function listaItensComPontos(lista: ItemComPontos[]): string {
  return lista.length
    ? lista
        .map((item) => {
          const detalhe = item.detalhe ? ` - ${item.detalhe}` : "";
          const categoria = item.categoria ? ` [${item.categoria}]` : "";
          return `- ${item.nome} (${item.pontos})${categoria}${detalhe}${descricaoItemTexto(item)}`;
        })
        .join("\n")
    : "Nenhum.";
}

function listaItens(lista: Array<ItemTrunfo | ItemDistincao>): string {
  return lista.length
    ? lista
        .map((item) => {
          const detalhe = item.detalhe ? ` - ${item.detalhe}` : "";
          const categoria = item.categoria ? ` [${item.categoria}]` : "";
          const trunfo =
            "trunfo" in item && item.trunfo ? ` - Trunfo: ${item.trunfo}` : "";
          return `- ${item.nome}${categoria}${trunfo}${detalhe}${descricaoItemTexto(item)}`;
        })
        .join("\n")
    : "Nenhum.";
}

function textoTrilhaDano(caixas?: string[]): string {
  if (!Array.isArray(caixas) || !caixas.length) {
    return "Sem dano marcado.";
  }
  return caixas.map((marcador) => marcador || "[ ]").join(" ");
}

export function gerarTextoFicha(
  ficha: FichaDados,
  opcoes?: { modoCriacao?: boolean }
): string {
  const linha = "-".repeat(58);
  const emCriacao = opcoes?.modoCriacao ?? !ficha.estado.finalizada;
  const blocoXp = emCriacao
    ? ""
    : `\nXP total: ${ficha.estados.xpTotal}\nXP gasto: ${ficha.estados.xpGasto}\nXP disponível: ${ficha.estados.xpDisponivel}`;

  return `
${linha}
CAÇADOR: A REVANCHE - 5ª EDIÇÃO
FICHA DE PERSONAGEM
${linha}

ESTADO
Status: ${ficha.estado.finalizada ? "Finalizada" : "Em criação"}${blocoXp}

IDENTIDADE
Nome: ${ficha.identidade.nome || "Não informado"}
Jogador: ${ficha.identidade.jogador || "Não informado"}
Crônica: ${ficha.identidade.cronica || "Não informado"}
Narrador: ${ficha.identidade.narrador || "Não informado"}
Conceito: ${ficha.identidade.conceito || "Não informado"}
Célula: ${ficha.identidade.celula || "Não informado"}
Ambição: ${ficha.identidade.ambicao || "Não informado"}
Desejo: ${ficha.identidade.desejo || "Não informado"}

CREDO E ÍMPETO
Credo: ${ficha.cacador.credo || "Não informado"}
Ímpeto: ${ficha.cacador.impeto || "Não informado"}
Descrição: ${ficha.cacador.descricaoImpeto || "Não informado"}

PILARES
${listaTexto(ficha.pilares)}

ATRIBUTOS
${blocoGrupo("Físicos", ficha.atributos.fisicos)}
${blocoGrupo("Sociais", ficha.atributos.sociais)}
${blocoGrupo("Mentais", ficha.atributos.mentais)}

ESTADOS DERIVADOS
Caixinhas de Vitalidade: ${ficha.estados.vitalidadeCaixas ?? ficha.estados.vitalidadeMaxima}
Caixinhas de Força de Vontade: ${ficha.estados.forcaDeVontadeCaixas ?? ficha.estados.forcaDeVontadeMaxima}
Vitalidade atual: ${textoTrilhaDano(ficha.dano?.vitalidade)}
Força de Vontade atual: ${textoTrilhaDano(ficha.dano?.vontade)}
Subgrupo da crônica: ${ficha.estados.subgrupoCronica || "Nenhum"}
Desespero: ${ficha.estados.desespero ?? 0}
Perigo: ${ficha.estados.perigo ?? 0}

HABILIDADES
${blocoGrupo("Físicas", ficha.habilidades.fisicas)}
${blocoGrupo("Sociais", ficha.habilidades.sociais)}
${blocoGrupo("Mentais", ficha.habilidades.mentais)}

ESPECIALIZAÇÕES
Livre: ${ficha.especializacoes.livre || "Nenhuma"}
Ciência: ${ficha.especializacoes.ciencia || "Nenhuma"}
Erudição: ${ficha.especializacoes.academicos || "Nenhuma"}
Ofícios: ${ficha.especializacoes.oficios || "Nenhuma"}
Performance: ${ficha.especializacoes.performance || "Nenhuma"}

VANTAGENS
${listaItensComPontos(ficha.vantagens)}

DEFEITOS
${listaItensComPontos(ficha.defeitos)}

TRUNFOS
${listaItens(ficha.trunfos)}

DISTINÇÕES
${listaItens(ficha.distincoes)}

MAPA DE RELACIONAMENTOS
${ficha.mapaRelacionamentos || "Nenhum."}

EQUIPAMENTOS
${ficha.equipamentos.equipamentos || "Nenhum."}

ARMAS
${ficha.equipamentos.armas || "Nenhuma."}

A CAÇADA
Presa: ${ficha.cacada.presa || "Não informado"}
Local: ${ficha.cacada.local || "Não informado"}
Pistas: ${ficha.cacada.pistas || "Nenhuma."}
Consequências: ${ficha.cacada.consequencias || "Nenhuma."}

ANOTAÇÕES
${ficha.anotacoes || "Nenhuma."}
`.trim();
}

export function nomeArquivoSeguro(nome?: string): string {
  return (nome || "ficha-cacador-a-revanche")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
