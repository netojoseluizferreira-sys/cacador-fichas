import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  AmeacaCronica,
  FichaDados,
  ItemIniciativa,
  MapaTaticoEstado,
  RegistroRolagemFicha,
  ResultadoRolagemMestre,
} from "@/types/ficha";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("users_email_idx").on(table.email)]
);

export const fichas = pgTable(
  "fichas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    ownerEmail: text("owner_email").notNull(),
    nome: text("nome").notNull().default("Ficha sem nome"),
    sistema: text("sistema").notNull().default("Caçador: A Revanche 5ª Edição"),
    dados: jsonb("dados").$type<FichaDados>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("fichas_user_id_idx").on(table.userId),
    index("fichas_owner_email_idx").on(table.ownerEmail),
    index("fichas_updated_at_idx").on(table.updatedAt),
  ]
);

export const escudoMestre = pgTable("escudo_mestre", {
  id: integer("id").primaryKey().default(1),
  mestreEmail: text("mestre_email").notNull().default("netojoseluizferreira@gmail.com"),
  fichaIds: uuid("ficha_ids")
    .array()
    .notNull()
    .default(sql`'{}'::uuid[]`),
  notas: text("notas").notNull().default(""),
  iniciativa: jsonb("iniciativa")
    .$type<ItemIniciativa[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  turno: integer("turno").notNull().default(0),
  iniciativaVisibilidade: text("iniciativa_visibilidade")
    .notNull()
    .default("invisivel"),
  iniciativaDefinida: boolean("iniciativa_definida").notNull().default(false),
  ameacas: jsonb("ameacas")
    .$type<AmeacaCronica[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  mapaTatico: jsonb("mapa_tatico")
    .$type<MapaTaticoEstado>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cronicaSubgrupos = pgTable(
  "cronica_subgrupos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    fichaIds: uuid("ficha_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    desespero: integer("desespero").notNull().default(0),
    perigo: integer("perigo").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("cronica_subgrupos_ficha_ids_idx").using("gin", table.fichaIds)]
);

export const rolagensPublicas = pgTable(
  "rolagens_publicas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mestreEmail: text("mestre_email").notNull().default("netojoseluizferreira@gmail.com"),
    descricao: text("descricao").notNull().default("Rolagem pública"),
    resultado: jsonb("resultado").$type<ResultadoRolagemMestre>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("rolagens_publicas_created_at_idx").on(table.createdAt)]
);

export const rolagensPrivadas = pgTable(
  "rolagens_privadas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mestreEmail: text("mestre_email").notNull().default("netojoseluizferreira@gmail.com"),
    descricao: text("descricao").notNull().default("Rolagem privada"),
    resultado: jsonb("resultado").$type<ResultadoRolagemMestre>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("rolagens_privadas_created_at_idx").on(table.createdAt)]
);

export const rolagensJogadoresPublicas = pgTable(
  "rolagens_jogadores_publicas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    ownerEmail: text("owner_email").notNull(),
    fichaId: uuid("ficha_id").references(() => fichas.id, { onDelete: "cascade" }),
    rolagemId: text("rolagem_id").notNull(),
    subgrupoId: uuid("subgrupo_id").references(() => cronicaSubgrupos.id, {
      onDelete: "set null",
    }),
    subgrupoNome: text("subgrupo_nome").notNull().default(""),
    personagem: text("personagem").notNull().default("Ficha sem nome"),
    jogador: text("jogador").notNull().default(""),
    descricao: text("descricao").notNull().default("Rolagem"),
    resultado: jsonb("resultado").$type<RegistroRolagemFicha>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("rolagens_jogadores_publicas_ficha_rolagem_uniq").on(
      table.fichaId,
      table.rolagemId
    ),
    index("rolagens_jogadores_publicas_created_at_idx").on(table.createdAt),
    index("rolagens_jogadores_publicas_subgrupo_idx").on(
      table.subgrupoId,
      table.createdAt
    ),
  ]
);
