"use client";

function carregarImagemDeArquivo(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!arquivo.type.startsWith("image/")) {
      reject(
        new Error(
          "Selecione um arquivo de imagem válido (PNG, JPG, WebP, GIF)."
        )
      );
      return;
    }

    const leitor = new FileReader();
    leitor.onerror = () =>
      reject(new Error("Erro ao ler o arquivo de imagem."));
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Imagem inválida ou corrompida."));
      img.src = String(leitor.result || "");
    };
    leitor.readAsDataURL(arquivo);
  });
}

function exportarCanvasOtimizado(
  canvas: HTMLCanvasElement,
  qualidade: number
): string {
  const webp = canvas.toDataURL("image/webp", qualidade);
  if (webp.startsWith("data:image/webp")) {
    return webp;
  }
  return canvas.toDataURL("image/jpeg", qualidade);
}

/**
 * Lê as dimensões reais de uma imagem (dataURL ou URL externa) para calcular proporção do grid.
 */
export function obterDimensoesImagem(
  src: string
): Promise<{ largura: number; altura: number }> {
  return new Promise((resolve, reject) => {
    if (!src.trim()) {
      reject(new Error("Nenhuma imagem informada."));
      return;
    }
    const img = new Image();
    img.onload = () => {
      const largura = img.naturalWidth || img.width;
      const altura = img.naturalHeight || img.height;
      if (!largura || !altura) {
        reject(new Error("Não foi possível ler as dimensões da imagem."));
        return;
      }
      resolve({ largura, altura });
    };
    img.onerror = () =>
      reject(new Error("Não foi possível carregar a imagem informada."));
    img.src = src;
  });
}

/**
 * Redimensiona e comprime uma imagem de mapa do computador (máx. 1440px, WebP)
 * para salvamento rápido e estável no banco de dados.
 */
export async function comprimirImagemMapa(arquivo: File): Promise<string> {
  const img = await carregarImagemDeArquivo(arquivo);
  const maxDim = 1440;
  let largura = img.naturalWidth || img.width;
  let altura = img.naturalHeight || img.height;

  if (largura > maxDim || altura > maxDim) {
    const proporcao = Math.min(maxDim / largura, maxDim / altura);
    largura = Math.max(1, Math.round(largura * proporcao));
    altura = Math.max(1, Math.round(altura * proporcao));
  }

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Não foi possível processar a imagem no navegador.");
  }

  ctx.drawImage(img, 0, 0, largura, altura);
  return exportarCanvasOtimizado(canvas, 0.76);
}

/**
 * Faz recorte quadrado centralizado (160x160) e comprime em WebP para retratos de Tokens.
 */
export async function comprimirImagemToken(arquivo: File): Promise<string> {
  const img = await carregarImagemDeArquivo(arquivo);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const menorLado = Math.min(w, h);
  const sx = Math.floor((w - menorLado) / 2);
  const sy = Math.floor((h - menorLado) / 2);

  const destino = 160;
  const canvas = document.createElement("canvas");
  canvas.width = destino;
  canvas.height = destino;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Não foi possível processar a imagem do token.");
  }

  ctx.drawImage(img, sx, sy, menorLado, menorLado, 0, 0, destino, destino);
  return exportarCanvasOtimizado(canvas, 0.84);
}
