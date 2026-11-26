import { z } from "zod";
import catalogoBruto from "@data/catalogo.json";
import type { ItemComPontos } from "@/types/ficha";

const EntradaComCustoSchema = z.object({
  nome: z.string().min(1),
  categoria: z.string().min(1),
  min: z.number().int().min(0),
  max: z.number().int().min(0),
  valores: z.array(z.number().int()).optional(),
  resumo: z.string().min(1),
});

const EntradaSimplesSchema = z.object({
  nome: z.string().min(1),
  categoria: z.string().min(1),
  resumo: z.string().min(1),
});

const DistincaoCatalogoSchema = z.object({
  nome: z.string().min(1),
  resumo: z.string().min(1),
});

const CatalogoSchema = z.object({
  vantagens: z.array(EntradaComCustoSchema).min(1),
  defeitos: z.array(EntradaComCustoSchema).min(1),
  trunfos: z.array(EntradaSimplesSchema).min(1),
  distincoesPorTrunfo: z.record(z.string(), z.array(DistincaoCatalogoSchema)),
});

export type EntradaCatalogoComCusto = z.infer<typeof EntradaComCustoSchema>;
export type EntradaCatalogoTrunfo = z.infer<typeof EntradaSimplesSchema>;
export type EntradaCatalogoDistincao = z.infer<typeof DistincaoCatalogoSchema>;

const catalogoValidado = CatalogoSchema.parse(catalogoBruto);

export const vantagensCatalogo: ReadonlyArray<EntradaCatalogoComCusto> =
  catalogoValidado.vantagens;
export const defeitosCatalogo: ReadonlyArray<EntradaCatalogoComCusto> =
  catalogoValidado.defeitos;
export const trunfosCatalogo: ReadonlyArray<EntradaCatalogoTrunfo> =
  catalogoValidado.trunfos;
export const distincoesPorTrunfo: Readonly<
  Record<string, ReadonlyArray<EntradaCatalogoDistincao>>
> = catalogoValidado.distincoesPorTrunfo;

export function custoTexto(item: EntradaCatalogoComCusto): string {
  if (item.valores && item.valores.length > 0) {
    return item.valores.length === 1
      ? `${item.valores[0]}`
      : item.valores.join(" ou ");
  }
  return item.min === item.max ? `${item.min}` : `${item.min}-${item.max}`;
}

export function limitePontosPorTipo(tipo: "vantagem" | "defeito"): number {
  return tipo === "vantagem" ? 7 : 2;
}

export function totalPontosItens(lista: ReadonlyArray<ItemComPontos>): number {
  return lista.reduce((soma, item) => soma + Number(item.pontos || 0), 0);
}

export function pontosCatalogoSemAlerta(
  catalogo: EntradaCatalogoComCusto | undefined,
  pontos: number
): number {
  if (!catalogo) {
    return 0;
  }
  if (catalogo.valores && !catalogo.valores.includes(pontos)) {
    return catalogo.valores[0] ?? catalogo.min;
  }
  return Math.max(catalogo.min, Math.min(catalogo.max, pontos));
}

export function validarPontosCatalogo(
  catalogo: EntradaCatalogoComCusto,
  pontos: number
): { ok: true; pontos: number } | { ok: false; erro: string } {
  if (catalogo.valores && !catalogo.valores.includes(pontos)) {
    return {
      ok: false,
      erro: `${catalogo.nome} só aceita ${custoTexto(catalogo)} ponto(s).`,
    };
  }
  const normalizado = Math.max(catalogo.min, Math.min(catalogo.max, pontos));
  return { ok: true, pontos: normalizado };
}

export function excedeLimiteCriacao(
  tipo: "vantagem" | "defeito",
  listaAtual: ReadonlyArray<ItemComPontos>,
  novosPontos: number
): boolean {
  return totalPontosItens(listaAtual) + novosPontos > limitePontosPorTipo(tipo);
}
