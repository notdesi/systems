const WGER_API_BASE = 'https://wger.de/api/v2'
const WGER_ENGLISH_LANGUAGE_ID = 2

/**
 * @param {string} query
 * @returns {Promise<Array<{ value: string, data: { id: number, name: string, category?: string, base_id?: number } }>>}
 */
export async function searchExercises(query) {
  const term = query.trim()
  if (!term) return []
  const url = `${WGER_API_BASE}/exerciseinfo/?language=${WGER_ENGLISH_LANGUAGE_ID}&limit=1000&format=json`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`WGER search failed (${response.status})`)
  }
  const data = await response.json()
  const termLower = term.toLowerCase()
  const results = Array.isArray(data?.results) ? data.results : []

  return results
    .map((exercise) => {
      const englishTranslation =
        exercise?.translations?.find((t) => t?.language === WGER_ENGLISH_LANGUAGE_ID) ??
        exercise?.translations?.[0] ??
        null
      const name = englishTranslation?.name?.trim()
      if (!name || !name.toLowerCase().includes(termLower)) {
        return null
      }
      return {
        value: name,
        data: {
          id: exercise.id,
          name,
          category: exercise?.category?.name,
          base_id: exercise?.variation_group ?? exercise.id,
        },
      }
    })
    .filter(Boolean)
    .slice(0, 40)
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
  const t =
    detail.translations?.find((x) => x.language === WGER_ENGLISH_LANGUAGE_ID) ??
    detail.translations?.[0]
  const name = t?.name?.trim()
  return name || fallback
}
