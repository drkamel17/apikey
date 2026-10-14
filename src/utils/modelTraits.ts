export type ModelTrait = 'text' | 'code' | 'vision' | 'image' | 'video' | 'audio' | 'embedding' | 'reasoning'

const TRAIT_KEYWORDS: { trait: ModelTrait; words: string[] }[] = [
  {
    trait: 'embedding',
    words: ['embed', 'bge-', 'bge_', 'gte-', 'e5-', 'text-embedding', 'textembedding', 'nomic-embed', 'mxbai', 'voyage'],
  },
  {
    trait: 'image',
    words: ['dall-e', 'dalle', 'stable-diffusion', 'sdxl', 'sd3', 'sd-', 'flux', 'imagen', 'ideogram', 'playground-v', 'kandinsky', 'midjourney', 'pixart', 'kolors', 'hidream', 'janus', 'aurora-image', 'image-gen', 'text-to-image', 't2i'],
  },
  {
    trait: 'video',
    words: ['video', 'cogvideo', 'veo', 'sora', 'kling', 'wan2', 'wan-', 'ltx', 'svd', 'stable-video', 'runway', 'pika', 'luma', 'hunyuanvideo', 'mochi', 'seedance', 't2v'],
  },
  {
    trait: 'audio',
    words: ['tts', 'whisper', 'audio', 'speech', 'voice', 'music', 'bark', 'speechify', 'suno', 'kokoro', 'realtime-audio', 'transcribe'],
  },
  {
    trait: 'vision',
    words: ['vision', '-vl', 'vl-', 'llava', 'pixtral', 'qwen-vl', 'qwen2-vl', 'qwen2.5-vl', 'internvl', 'moondream', 'cogvlm', 'minicpm-v', 'idefics', 'molmo', 'glm-4v', 'phi-3-vision', 'phi-4-multimodal', 'smolvlm', 'florence', 'paligemma', 'llama-3.2-11b-vision', 'llama-3.2-90b-vision', 'gemini', 'gpt-4o', 'gpt-4.1', 'gpt-4-turbo', 'claude-3', 'claude-4', 'claude-sonnet', 'claude-opus', 'claude-haiku'],
  },
  {
    trait: 'code',
    words: ['codex', 'code', 'coder', 'codestral', 'qwen-coder', '-cwm', 'starcoder', 'deepseek-coder', 'magistral', 'devstral', 'codewhisperer'],
  },
  {
    trait: 'reasoning',
    words: ['reason', 'deepseek-r1', '-r1', 'r1-', 'qwq', 'qvq', 'thinking', '-think', 'o1-preview', 'o1-mini', 'o1-', 'o3-', 'o3-', 'o4-', 'gpt-5'],
  },
]

export function getModelTraits(modelId: string): ModelTrait[] {
  const id = modelId.toLowerCase()
  const traits = TRAIT_KEYWORDS.filter(({ words }) => words.some((w) => id.includes(w))).map((t) => t.trait)
  if (traits.length === 0) return ['text']
  return traits
}
