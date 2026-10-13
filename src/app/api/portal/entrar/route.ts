import { NextResponse, type NextRequest } from "next/server";

import {
  COOKIE_PORTAL,
  validarCodigoParaEntrada,
} from "@/server/portal/sessao";

// Entrada do cidadão (#73, ADR-0012): GET (form de digitação ou link/QR)
// troca o código por cookie HttpOnly e redireciona para o percurso. Sem JS,
// sem server action; falha sempre cai no mesmo erro genérico de /portal.

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const resultado = await validarCodigoParaEntrada(
    params.get("acesso") ?? "",
    params.get("pts"),
  );

  if (!resultado.ok) {
    // Location relativo: `request.url`/`nextUrl` carrega o host de bind
    // (0.0.0.0) no standalone e atrás de proxy — o navegador resolve relativo.
    return new NextResponse(null, {
      status: 302,
      headers: { location: "/portal?erro=1" },
    });
  }

  // Sem PTS ainda não há percurso a abrir: volta para /portal, que com a
  // sessão ativa mostra "aguardando avaliação" (sem erro de código).
  const destino = resultado.ptsId ? `/portal/${resultado.ptsId}` : "/portal";
  const resposta = new NextResponse(null, {
    status: 302,
    headers: { location: destino },
  });
  resposta.cookies.set(COOKIE_PORTAL, resultado.codigo, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.max(
      0,
      Math.floor((resultado.validoAte.getTime() - Date.now()) / 1000),
    ),
  });
  return resposta;
}
