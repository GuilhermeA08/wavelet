import { Jimp } from "jimp";
import { intToRGBA } from "@jimp/utils";
import { rgbaToInt } from "@jimp/utils";

function haarWaveletTransform(imageData: number[][]): {
  LL: number[][];
  LH: number[][];
  HL: number[][];
  HH: number[][];
} {
  const rows = imageData.length;
  const cols = imageData[0].length;

  const LL: number[][] = [];
  const LH: number[][] = [];
  const HL: number[][] = [];
  const HH: number[][] = [];

  for (let i = 0; i < rows; i += 2) {
    const llRow: number[] = [];
    const lhRow: number[] = [];
    const hlRow: number[] = [];
    const hhRow: number[] = [];

    for (let j = 0; j < cols; j += 2) {
      const a = imageData[i][j]; // Pixel (i, j)
      const b = imageData[i][j + 1]; // Pixel (i, j+1)
      const c = imageData[i + 1][j]; // Pixel (i+1, j)
      const d = imageData[i + 1][j + 1]; // Pixel (i+1, j+1)

      // Calcula os sub-bandas
      llRow.push((a + b + c + d) / 4); // Média geral (LL)
      lhRow.push((a - b + c - d) / 4); // Diferença horizontal (LH)
      hlRow.push((a + b - c - d) / 4); // Diferença vertical (HL)
      hhRow.push((a - b - c + d) / 4); // Diferença diagonal (HH)
    }

    LL.push(llRow);
    LH.push(lhRow);
    HL.push(hlRow);
    HH.push(hhRow);
  }

  return { LL, LH, HL, HH };
}

function concatenateWaveletBands(
  LL: number[][],
  LH: number[][],
  HL: number[][],
  HH: number[][]
): number[][] {
  const rows = LL.length * 2;
  const cols = LL[0].length * 2;

  const combinedMatrix: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(0)
  );

  // Preenche o quadrante superior esquerdo (LL)
  for (let i = 0; i < LL.length; i++) {
    for (let j = 0; j < LL[0].length; j++) {
      combinedMatrix[i][j] = LL[i][j];
    }
  }

  // Preenche o quadrante superior direito (LH)
  for (let i = 0; i < LH.length; i++) {
    for (let j = 0; j < LH[0].length; j++) {
      combinedMatrix[i][j + LL[0].length] = LH[i][j];
    }
  }

  // Preenche o quadrante inferior esquerdo (HL)
  for (let i = 0; i < HL.length; i++) {
    for (let j = 0; j < HL[0].length; j++) {
      combinedMatrix[i + LL.length][j] = HL[i][j];
    }
  }

  // Preenche o quadrante inferior direito (HH)
  for (let i = 0; i < HH.length; i++) {
    for (let j = 0; j < HH[0].length; j++) {
      combinedMatrix[i + LL.length][j + LL[0].length] = HH[i][j];
    }
  }

  return combinedMatrix;
}

// Uso com Jimp
async function applyHaarWaveletTransform(imagePath: string) {
  const image = await Jimp.read(imagePath);
  const { width, height, data } = image.bitmap;

  // Converte a imagem em escala de cinza (se necessário) e cria a matriz de intensidades
  const grayImage: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4; // Índice RGBA
      const intensity =
        data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114; // Conversão para escala de cinza
      row.push(intensity);
    }
    grayImage.push(row);
  }

  // Aplica a Transformada de Haar
  const { LL, LH, HL, HH } = haarWaveletTransform(grayImage);

  // Concatena as matrizes
  const combinedMatrix = concatenateWaveletBands(LL, LH, HL, HH);

  // console.log("LL:", LL);
  // console.log("LH:", LH);
  // console.log("HL:", HL);
  // console.log("HH:", HH);

  // Crie imagens para visualizar os resultados
  const createImageFromMatrix = async (matrix: number[][], filename: any) => {
    const newImage = new Jimp({
      width: matrix[0].length,
      height: matrix.length,
    });
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        const intensity = Math.max(0, Math.min(255, Math.round(value))); // Garante valores válidos
        newImage.setPixelColor(
          rgbaToInt(intensity, intensity, intensity, 255),
          x,
          y
        );
      });
    });
    await newImage.write(filename);
  };

  await createImageFromMatrix(combinedMatrix, "output_all.jpg");
}

// Chamando a função
applyHaarWaveletTransform("lena_cor.jpg").catch(console.error);
