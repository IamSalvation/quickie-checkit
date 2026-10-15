import * as faceapi from '@vladmandic/face-api'

let modelsLoaded = false
let modelsLoading: Promise<void> | null = null

const MODEL_URL = '/models'

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return
  if (modelsLoading) return modelsLoading

  modelsLoading = (async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])
    modelsLoaded = true
    console.log('[faceRecognition] Models loaded')
  })()

  return modelsLoading
}

const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 416,
  scoreThreshold: 0.5,
})

export const MIN_FACE_HEIGHT_RATIO = 0.2

export interface ExtractEmbeddingResult {
  embedding: number[]
  faceHeightRatio: number
}

export async function extractEmbeddingWithMeta(
  image: HTMLImageElement
): Promise<ExtractEmbeddingResult | null> {
  await loadFaceModels()

  const detection = await faceapi
    .detectSingleFace(image, DETECTOR_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) return null

  const box = detection.detection.box
  const faceHeightRatio = box.height / image.height

  return {
    embedding: Array.from(detection.descriptor),
    faceHeightRatio,
  }
}

export async function extractEmbedding(
  image: HTMLImageElement
): Promise<number[] | null> {
  const result = await extractEmbeddingWithMeta(image)
  if (!result) return null
  if (result.faceHeightRatio < MIN_FACE_HEIGHT_RATIO) return null
  return result.embedding
}

export async function extractAllEmbeddings(
  image: HTMLImageElement
): Promise<number[][]> {
  await loadFaceModels()

  const detections = await faceapi
    .detectAllFaces(image, DETECTOR_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptors()

  return detections.map((d) => Array.from(d.descriptor))
}

export function embeddingDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must be the same length')
  }
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

export function distanceToScore(distance: number): number {
  const score = Math.max(0, Math.min(1, 1 - distance / 1.2))
  return Math.round(score * 1000) / 1000
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = url
  })
}