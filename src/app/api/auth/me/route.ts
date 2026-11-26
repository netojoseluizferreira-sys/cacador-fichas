import { NextResponse } from "next/server";
import { obterUsuarioSessao } from "@/lib/auth";

export async function GET() {
  const user = await obterUsuarioSessao();
  return NextResponse.json({ user });
}
