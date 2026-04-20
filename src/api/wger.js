const WGER_API_BASE = 'https://wger.de/api/v2'

/**
 * @param {string} query
 * @returns {Promise<Array<{ value: string, data: { id: number, name: string, category?: string, base_id?: number } }>>}
 */
export async function searchExercises(query) {
  const term = encodeURIComponent(query.trim())
  const url = `${WGER_API_BASE}/exercise/search/?term=${term}&language=english&format=json`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`WGER search failed (${response.status})`)
  }
  const data = await response.json()
  return data.suggestions ?? []
}

/**
 * @param {number|string} id Exercise id from search `data.id`
 * @returns {Promise<object>} Full exerciseinfo object
 */
export async function getExerciseDetail(id) {
  const url = `${WGER_API_BASE}/exerciseinfo/${id}/?format=json`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`WGER exerciseinfo failed (${response.status})`)
  }
  return response.json()
}

/** English translation in wger typically uses language id 2. */
export function pickExerciseNameFromDetail(detail, fallback = 'Exercise') {
  const t = detail.translations?.find((x) => x.language === 2) ?? detail.translations?.[0]
  const name = t?.name?.trim()
  return name || fallback
}
