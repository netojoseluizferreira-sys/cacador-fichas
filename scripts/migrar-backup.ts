import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { closeDbPool, getDb } from "../src/db";
import {
  cronicaSubgrupos,
  escudoMestre,
  fichas,
  rolagensJogadoresPublicas,
  rolagensPrivadas,
  rolagensPublicas,
  users,
} from "../src/db/schema";
import type {
  FichaDados,
  ItemIniciativa,
  RegistroRolagemFicha,
  ResultadoRolagemMestre,
} from "../src/types/ficha";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

interface BackupFicha {
  id: string;
  user_id?: string | null;
  owner_email: string;
  nome?: string;
  sistema?: string;
  dados: FichaDados;
  created_at?: string;
  updated_at?: string;
}

interface BackupEscudoMestre {
  id?: number;
  mestre_email?: string;
  ficha_ids?: string[];
  notas?: string;
  iniciativa?: ItemIniciativa[];
  turno?: number;
  updated_at?: string;
}

interface BackupSubgrupo {
  id: string;
  nome: string;
  ficha_ids?: string[];
  desespero?: number;
  perigo?: number;
  created_at?: string;
  updated_at?: string;
}

interface BackupRolagemMestre {
  id: string;
  mestre_email?: string;
  descricao?: string;
  resultado: ResultadoRolagemMestre;
  created_at?: string;
}

interface BackupRolagemJogador {
  id: string;
  user_id?: string | null;
  owner_email: string;
  ficha_id?: string | null;
  rolagem_id: string;
  subgrupo_id?: string | null;
  subgrupo_nome?: string;
  personagem?: string;
  jogador?: string;
  descricao?: string;
  resultado: RegistroRolagemFicha;
  created_at?: string;
  updated_at?: string;
}

interface BackupPayload {
  exportado_em?: string;
  fichas?: BackupFicha[];
  escudo_mestre?: BackupEscudoMestre[];
  cronica_subgrupos?: BackupSubgrupo[];
  rolagens_publicas?: BackupRolagemMestre[];
  rolagens_privadas?: BackupRolagemMestre[];
  rolagens_jogadores_publicas?: BackupRolagemJogador[];
}

function resolverCaminhoBackup(): string {
  const candidatos = [
    process.argv[2],
    "backup-cacador.json",
    "backup-banco.json",
  ].filter(Boolean) as string[];

  for (const candidato of candidatos) {
    const absoluto = path.resolve(process.cwd(), candidato);
    if (fs.existsSync(absoluto)) {
      return absoluto;
    }
  }

  throw new Error(
    "Arquivo de backup não encontrado. Coloque `backup-cacador.json` (ou `backup-banco.json`) na raiz do projeto ou informe o caminho como argumento."
  );
}

function extrairPayloadBackup(bruto: unknown): BackupPayload {
  if (Array.isArray(bruto) && bruto.length > 0) {
    const primeiro = bruto[0] as Record<string, unknown>;
    if (primeiro && typeof primeiro === "object" && "backup_completo" in primeiro) {
      return primeiro.backup_completo as BackupPayload;
    }
    return primeiro as BackupPayload;
  }

  if (bruto && typeof bruto === "object") {
    const obj = bruto as Record<string, unknown>;
    if ("backup_completo" in obj && obj.backup_completo) {
      return obj.backup_completo as BackupPayload;
    }
    return obj as BackupPayload;
  }

  throw new Error("Formato de backup inválido.");
}

function parseData(valor?: string): Date {
  if (!valor) {
    return new Date();
  }
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? new Date() : data;
}

async function migrarBackup(): Promise<void> {
  const caminhoArquivo = resolverCaminhoBackup();
  console.log(`Lendo backup em: ${caminhoArquivo}`);

  const conteudo = fs.readFileSync(caminhoArquivo, "utf-8");
  const json = JSON.parse(conteudo) as unknown;
  const backup = extrairPayloadBackup(json);

  const listaFichas = backup.fichas ?? [];
  const listaEscudo = backup.escudo_mestre ?? [];
  const listaSubgrupos = backup.cronica_subgrupos ?? [];
  const listaPublicas = backup.rolagens_publicas ?? [];
  const listaPrivadas = backup.rolagens_privadas ?? [];
  const listaJogadores = backup.rolagens_jogadores_publicas ?? [];

  const db = getDb();

  await db.transaction(async (tx) => {
    const usuariosExistentes = await tx.select().from(users);
    const mapaUsuariosPorEmail = new Map<string, string>();
    for (const u of usuariosExistentes) {
      mapaUsuariosPorEmail.set(u.email.trim().toLowerCase(), u.id);
    }

    const idsFichasValidas = new Set<string>();

    // 1. Fichas (preservando id UUID e owner_email originais)
    for (const item of listaFichas) {
      const emailNormalizado = item.owner_email.trim().toLowerCase();
      const userIdVinculado = mapaUsuariosPorEmail.get(emailNormalizado) ?? null;
      idsFichasValidas.add(item.id);

      await tx
        .insert(fichas)
        .values({
          id: item.id,
          userId: userIdVinculado,
          ownerEmail: item.owner_email.trim(),
          nome: item.nome || "Ficha sem nome",
          sistema: item.sistema || "Caçador: A Revanche 5ª Edição",
          dados: item.dados,
          createdAt: parseData(item.created_at),
          updatedAt: parseData(item.updated_at),
        })
        .onConflictDoUpdate({
          target: fichas.id,
          set: {
            userId: userIdVinculado,
            ownerEmail: item.owner_email.trim(),
            nome: item.nome || "Ficha sem nome",
            sistema: item.sistema || "Caçador: A Revanche 5ª Edição",
            dados: item.dados,
            updatedAt: parseData(item.updated_at),
          },
        });
    }

    // 2. Escudo do Mestre (preservando ficha_ids originais)
    for (const item of listaEscudo) {
      const idEscudo = item.id ?? 1;
      await tx
        .insert(escudoMestre)
        .values({
          id: idEscudo,
          mestreEmail:
            item.mestre_email ||
            process.env.ADMIN_EMAIL ||
            "netojoseluizferreira@gmail.com",
          fichaIds: Array.isArray(item.ficha_ids) ? item.ficha_ids : [],
          notas: item.notas ?? "",
          iniciativa: Array.isArray(item.iniciativa) ? item.iniciativa : [],
          turno: Number(item.turno ?? 0),
          updatedAt: parseData(item.updated_at),
        })
        .onConflictDoUpdate({
          target: escudoMestre.id,
          set: {
            mestreEmail:
              item.mestre_email ||
              process.env.ADMIN_EMAIL ||
              "netojoseluizferreira@gmail.com",
            fichaIds: Array.isArray(item.ficha_ids) ? item.ficha_ids : [],
            notas: item.notas ?? "",
            iniciativa: Array.isArray(item.iniciativa) ? item.iniciativa : [],
            turno: Number(item.turno ?? 0),
            updatedAt: parseData(item.updated_at),
          },
        });
    }

    // 3. Subgrupos da crônica (preservando id UUID e ficha_ids originais)
    const idsSubgruposValidos = new Set<string>();
    for (const item of listaSubgrupos) {
      idsSubgruposValidos.add(item.id);
      await tx
        .insert(cronicaSubgrupos)
        .values({
          id: item.id,
          nome: item.nome,
          fichaIds: Array.isArray(item.ficha_ids) ? item.ficha_ids : [],
          desespero: Number(item.desespero ?? 0),
          perigo: Number(item.perigo ?? 0),
          createdAt: parseData(item.created_at),
          updatedAt: parseData(item.updated_at),
        })
        .onConflictDoUpdate({
          target: cronicaSubgrupos.id,
          set: {
            nome: item.nome,
            fichaIds: Array.isArray(item.ficha_ids) ? item.ficha_ids : [],
            desespero: Number(item.desespero ?? 0),
            perigo: Number(item.perigo ?? 0),
            updatedAt: parseData(item.updated_at),
          },
        });
    }

    // 4. Rolagens públicas do mestre
    for (const item of listaPublicas) {
      await tx
        .insert(rolagensPublicas)
        .values({
          id: item.id,
          mestreEmail:
            item.mestre_email ||
            process.env.ADMIN_EMAIL ||
            "netojoseluizferreira@gmail.com",
          descricao: item.descricao || "Rolagem pública",
          resultado: item.resultado,
          createdAt: parseData(item.created_at),
        })
        .onConflictDoUpdate({
          target: rolagensPublicas.id,
          set: {
            mestreEmail:
              item.mestre_email ||
              process.env.ADMIN_EMAIL ||
              "netojoseluizferreira@gmail.com",
            descricao: item.descricao || "Rolagem pública",
            resultado: item.resultado,
            createdAt: parseData(item.created_at),
          },
        });
    }

    // 5. Rolagens privadas do mestre
    for (const item of listaPrivadas) {
      await tx
        .insert(rolagensPrivadas)
        .values({
          id: item.id,
          mestreEmail:
            item.mestre_email ||
            process.env.ADMIN_EMAIL ||
            "netojoseluizferreira@gmail.com",
          descricao: item.descricao || "Rolagem privada",
          resultado: item.resultado,
          createdAt: parseData(item.created_at),
        })
        .onConflictDoUpdate({
          target: rolagensPrivadas.id,
          set: {
            mestreEmail:
              item.mestre_email ||
              process.env.ADMIN_EMAIL ||
              "netojoseluizferreira@gmail.com",
            descricao: item.descricao || "Rolagem privada",
            resultado: item.resultado,
            createdAt: parseData(item.created_at),
          },
        });
    }

    // 6. Rolagens públicas dos jogadores
    for (const item of listaJogadores) {
      const emailNormalizado = item.owner_email.trim().toLowerCase();
      const userIdVinculado = mapaUsuariosPorEmail.get(emailNormalizado) ?? null;
      const fichaIdSeguro =
        item.ficha_id && idsFichasValidas.has(item.ficha_id) ? item.ficha_id : null;
      const subgrupoIdSeguro =
        item.subgrupo_id && idsSubgruposValidos.has(item.subgrupo_id)
          ? item.subgrupo_id
          : null;

      await tx
        .insert(rolagensJogadoresPublicas)
        .values({
          id: item.id,
          userId: userIdVinculado,
          ownerEmail: item.owner_email.trim(),
          fichaId: fichaIdSeguro,
          rolagemId: String(item.rolagem_id),
          subgrupoId: subgrupoIdSeguro,
          subgrupoNome: item.subgrupo_nome ?? "",
          personagem: item.personagem || "Ficha sem nome",
          jogador: item.jogador ?? "",
          descricao: item.descricao || "Rolagem",
          resultado: item.resultado,
          createdAt: parseData(item.created_at),
          updatedAt: parseData(item.updated_at),
        })
        .onConflictDoUpdate({
          target: rolagensJogadoresPublicas.id,
          set: {
            userId: userIdVinculado,
            ownerEmail: item.owner_email.trim(),
            fichaId: fichaIdSeguro,
            rolagemId: String(item.rolagem_id),
            subgrupoId: subgrupoIdSeguro,
            subgrupoNome: item.subgrupo_nome ?? "",
            personagem: item.personagem || "Ficha sem nome",
            jogador: item.jogador ?? "",
            descricao: item.descricao || "Rolagem",
            resultado: item.resultado,
            updatedAt: parseData(item.updated_at),
          },
        });
    }
  });

  console.log("Migração concluída com sucesso dentro de transação única:");
  console.log(`- Fichas: ${listaFichas.length}`);
  console.log(`- Escudo do Mestre: ${listaEscudo.length}`);
  console.log(`- Subgrupos da Crônica: ${listaSubgrupos.length}`);
  console.log(`- Rolagens Públicas (Mestre): ${listaPublicas.length}`);
  console.log(`- Rolagens Privadas (Mestre): ${listaPrivadas.length}`);
  console.log(`- Rolagens Públicas (Jogadores): ${listaJogadores.length}`);
}

migrarBackup()
  .catch((erro) => {
    console.error("Falha na migração do backup:", erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDbPool();
  });
