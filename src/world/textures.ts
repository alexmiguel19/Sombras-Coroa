import * as THREE from 'three';

/**
 * Texturas geradas em canvas: não precisam de ficheiros de imagem e pesam pouco.
 * Mais tarde podem ser substituídas por texturas reais (CC0) sem mudar o resto do código.
 */

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
}

// Gerador pseudo-aleatório com semente, para as texturas serem sempre iguais.
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function shade(base: [number, number, number], v: number): string {
  return `rgb(${base.map((c) => Math.max(0, Math.min(255, Math.round(c * v)))).join(',')})`;
}

/** Lajes de pedra para o chão. */
export function stoneFloor(repeat: [number, number]): THREE.CanvasTexture {
  return canvasTexture(512, 512, (g) => {
    const r = rng(7);
    g.fillStyle = '#4a4036';
    g.fillRect(0, 0, 512, 512);
    const size = 128;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const off = (y % 2) * (size / 2);
        g.fillStyle = shade([150, 136, 116], 0.8 + r() * 0.35);
        g.fillRect(x * size + off + 3, y * size + 3, size - 6, size - 6);
        g.fillRect(x * size + off - 512 + 3, y * size + 3, size - 6, size - 6);
        for (let i = 0; i < 40; i++) {
          g.fillStyle = `rgba(0,0,0,${r() * 0.08})`;
          g.fillRect(x * size + off + r() * size, y * size + r() * size, 2 + r() * 8, 2 + r() * 8);
        }
      }
    }
  }, repeat);
}

/** Paredes de blocos de pedra. */
export function stoneWall(repeat: [number, number]): THREE.CanvasTexture {
  return canvasTexture(512, 512, (g) => {
    const r = rng(42);
    g.fillStyle = '#3b342c';
    g.fillRect(0, 0, 512, 512);
    const bw = 128, bh = 64;
    for (let y = 0; y < 512 / bh; y++) {
      for (let x = -1; x < 512 / bw + 1; x++) {
        const off = (y % 2) * (bw / 2);
        g.fillStyle = shade([168, 154, 132], 0.75 + r() * 0.3);
        g.fillRect(x * bw + off + 3, y * bh + 3, bw - 6, bh - 6);
      }
    }
    for (let i = 0; i < 600; i++) {
      g.fillStyle = `rgba(0,0,0,${r() * 0.07})`;
      g.fillRect(r() * 512, r() * 512, 3 + r() * 10, 2 + r() * 5);
    }
  }, repeat);
}

/** Tapete vermelho com orla dourada. */
export function carpet(): THREE.CanvasTexture {
  return canvasTexture(128, 512, (g) => {
    g.fillStyle = '#7a1414';
    g.fillRect(0, 0, 128, 512);
    g.strokeStyle = '#c9a24a';
    g.lineWidth = 8;
    g.strokeRect(10, -10, 108, 532);
    g.fillStyle = '#5e0e0e';
    for (let y = 30; y < 512; y += 60) {
      g.beginPath();
      g.moveTo(64, y);
      g.lineTo(84, y + 20);
      g.lineTo(64, y + 40);
      g.lineTo(44, y + 20);
      g.closePath();
      g.fill();
    }
  });
}

/**
 * Estandarte com as armas de Portugal (versão simplificada):
 * cinco escudetes azuis em cruz sobre branco, bordadura vermelha com castelos.
 */
export function royalBanner(): THREE.CanvasTexture {
  return canvasTexture(256, 512, (g) => {
    g.fillStyle = '#b01e1e';
    g.fillRect(0, 0, 256, 512);
    // Escudo
    const sx = 38, sy = 70, sw = 180, sh = 240;
    g.fillStyle = '#c62828';
    g.beginPath();
    g.moveTo(sx, sy);
    g.lineTo(sx + sw, sy);
    g.lineTo(sx + sw, sy + sh * 0.6);
    g.quadraticCurveTo(sx + sw, sy + sh, sx + sw / 2, sy + sh);
    g.quadraticCurveTo(sx, sy + sh, sx, sy + sh * 0.6);
    g.closePath();
    g.fill();
    // Campo branco
    const ix = sx + 24, iy = sy + 24, iw = sw - 48, ih = sh - 52;
    g.fillStyle = '#f4f1ea';
    g.beginPath();
    g.moveTo(ix, iy);
    g.lineTo(ix + iw, iy);
    g.lineTo(ix + iw, iy + ih * 0.6);
    g.quadraticCurveTo(ix + iw, iy + ih, ix + iw / 2, iy + ih);
    g.quadraticCurveTo(ix, iy + ih, ix, iy + ih * 0.6);
    g.closePath();
    g.fill();
    // Castelos dourados na bordadura
    g.fillStyle = '#e0b84a';
    const castles: [number, number][] = [[sx + 4, sy + 6], [sx + sw / 2 - 8, sy + 4], [sx + sw - 20, sy + 6], [sx + 4, sy + 90], [sx + sw - 20, sy + 90], [sx + 22, sy + 190], [sx + sw - 38, sy + 190]];
    for (const [x, y] of castles) {
      g.fillRect(x, y + 6, 16, 12);
      g.fillRect(x, y, 4, 8);
      g.fillRect(x + 6, y, 4, 8);
      g.fillRect(x + 12, y, 4, 8);
    }
    // Quinas
    const cx = ix + iw / 2, cy = iy + ih / 2 - 6;
    const q = (x: number, y: number) => {
      g.fillStyle = '#1f3c8c';
      g.beginPath();
      g.moveTo(x - 16, y - 20);
      g.lineTo(x + 16, y - 20);
      g.lineTo(x + 16, y + 6);
      g.quadraticCurveTo(x + 16, y + 20, x, y + 22);
      g.quadraticCurveTo(x - 16, y + 20, x - 16, y + 6);
      g.closePath();
      g.fill();
      g.fillStyle = '#f4f1ea';
      for (const [dx, dy] of [[-7, -10], [7, -10], [0, -2], [-7, 6], [7, 6]]) g.fillRect(x + dx - 2, y + dy - 2, 4, 4);
    };
    q(cx, cy - 48);
    q(cx - 40, cy);
    q(cx, cy);
    q(cx + 40, cy);
    q(cx, cy + 48);
    // Franja
    g.fillStyle = '#e0b84a';
    for (let x = 0; x < 256; x += 16) g.fillRect(x, 490, 8, 22);
  });
}

/** Pergaminho com um mapa esboçado, para a mesa de guerra. */
export function tableMap(): THREE.CanvasTexture {
  return canvasTexture(512, 384, (g) => {
    g.fillStyle = '#e8d6a8';
    g.fillRect(0, 0, 512, 384);
    g.fillStyle = '#9fb0a8';
    g.fillRect(0, 0, 512, 384);
    g.fillStyle = '#dcc590';
    g.beginPath();
    const pts = [[60, 40], [250, 30], [470, 60], [500, 100], [430, 200], [410, 300], [330, 360], [200, 360], [90, 345], [55, 260], [45, 140]];
    g.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
    g.closePath();
    g.fill();
    g.strokeStyle = '#6b4a1e';
    g.lineWidth = 3;
    g.stroke();
    g.setLineDash([6, 6]);
    g.beginPath();
    g.moveTo(80, 95);
    g.lineTo(140, 92);
    g.lineTo(130, 200);
    g.lineTo(140, 340);
    g.stroke();
    g.setLineDash([]);
    g.strokeStyle = 'rgba(80,50,20,0.5)';
    g.lineWidth = 10;
    g.strokeRect(0, 0, 512, 384);
  });
}

/** Relva com pequenas variações e tufos. */
export function grass(repeat: [number, number]): THREE.CanvasTexture {
  return canvasTexture(256, 256, (g) => {
    const r = rng(11);
    g.fillStyle = '#5d7a3a';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = shade([93, 122, 58], 0.75 + r() * 0.5);
      g.fillRect(r() * 256, r() * 256, 2, 3 + r() * 5);
    }
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(120,95,50,${0.1 + r() * 0.15})`;
      g.beginPath();
      g.arc(r() * 256, r() * 256, 4 + r() * 12, 0, Math.PI * 2);
      g.fill();
    }
  }, repeat);
}

/** Terra batida (caminhos do acampamento). */
export function dirt(repeat: [number, number]): THREE.CanvasTexture {
  return canvasTexture(256, 256, (g) => {
    const r = rng(23);
    g.fillStyle = '#8a6c46';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = shade([138, 108, 70], 0.7 + r() * 0.5);
      g.fillRect(r() * 256, r() * 256, 2 + r() * 4, 2 + r() * 4);
    }
  }, repeat);
}

/** Lona das tendas, com riscas. */
export function tentCloth(stripe: string, base = '#e9dcc0'): THREE.CanvasTexture {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = stripe;
    for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 32, 256);
    g.fillStyle = 'rgba(0,0,0,0.06)';
    for (let y = 0; y < 256; y += 4) g.fillRect(0, y, 256, 1);
  });
}

/** Estandarte de Castela (simplificado): castelo dourado sobre vermelho. */
export function castileBanner(): THREE.CanvasTexture {
  return canvasTexture(256, 384, (g) => {
    g.fillStyle = '#a3161a';
    g.fillRect(0, 0, 256, 384);
    g.fillStyle = '#e0b84a';
    g.fillRect(68, 150, 120, 120);
    for (let x = 68; x < 188; x += 30) g.fillRect(x, 125, 18, 30);
    g.fillRect(108, 95, 40, 60);
    for (let x = 108; x < 148; x += 16) g.fillRect(x, 80, 10, 18);
    g.fillStyle = '#1f3c8c';
    g.fillRect(116, 220, 24, 50);
    g.fillStyle = '#e0b84a';
    for (let x = 0; x < 256; x += 16) g.fillRect(x, 362, 8, 22);
  });
}
