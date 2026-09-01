import { useCallback, useRef } from 'react'

export interface PokemonSummary {
  id: number
  name: string
  image: string
  types: string[]
  height: number
  weight: number
  stats: Array<{ name: string; value: number }>
  abilities: string[]
}

export interface PokemonSuggestion {
  value: string
  label: string
  kind: 'pokemon' | 'type' | 'number'
}

interface PokemonListResponse {
  results: Array<{ name: string; url: string }>
}

interface PokemonTypeResponse {
  pokemon: Array<{ pokemon: { name: string } }>
}

const BASE_URL = 'https://pokeapi.co/api/v2'
const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'grass',
  'electric',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
]

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`No se pudo cargar la información de ${url}`)
  }

  return (await response.json()) as T
}

function mapPokemon(pokemon: any): PokemonSummary {
  return {
    id: pokemon.id,
    name: pokemon.name,
    image:
      pokemon.sprites?.other?.['official-artwork']?.front_default ??
      pokemon.sprites?.front_default ??
      '',
    types: pokemon.types?.map((entry: any) => entry.type.name) ?? [],
    height: pokemon.height,
    weight: pokemon.weight,
    stats:
      pokemon.stats?.map((entry: any) => ({
        name: entry.stat.name,
        value: entry.base_stat,
      })) ?? [],
    abilities: pokemon.abilities?.map((entry: any) => entry.ability.name) ?? [],
  }
}

export function usePokemonApi() {
  const catalogRef = useRef<Array<{ id: number; name: string }>>([])

  const ensureCatalog = useCallback(async () => {
    if (catalogRef.current.length > 0) {
      return catalogRef.current
    }

    const data = await fetchJson<PokemonListResponse>(`${BASE_URL}/pokemon?limit=1000`)
    const nextCatalog = data.results.map((item, index) => ({
      id: index + 1,
      name: item.name,
    }))

    catalogRef.current = nextCatalog
    return nextCatalog
  }, [])

  const getPokemonByName = useCallback(async (name: string): Promise<PokemonSummary> => {
    const pokemon = await fetchJson<any>(`${BASE_URL}/pokemon/${name.toLowerCase()}`)
    return mapPokemon(pokemon)
  }, [])

  const getPokemonById = useCallback(async (id: number): Promise<PokemonSummary> => {
    const pokemon = await fetchJson<any>(`${BASE_URL}/pokemon/${id}`)
    return mapPokemon(pokemon)
  }, [])

  const getSuggestions = useCallback(
    async (query: string): Promise<PokemonSuggestion[]> => {
      const trimmed = query.trim().toLowerCase()

      if (!trimmed) {
        return []
      }

      const catalog = await ensureCatalog()
      const suggestions: PokemonSuggestion[] = []

      if (/^\d+$/.test(trimmed)) {
        const id = Number(trimmed)
        if (id > 0 && id <= catalog.length) {
          const pokemon = catalog.find((entry) => entry.id === id)
          if (pokemon) {
            suggestions.push({
              value: String(pokemon.id),
              label: `#${pokemon.id} · ${pokemon.name}`,
              kind: 'number',
            })
          }
        }
      }

      const nameMatches = catalog.filter(
        (entry) => entry.name.includes(trimmed) || entry.name.startsWith(trimmed),
      )

      nameMatches.slice(0, 5).forEach((entry) => {
        suggestions.push({
          value: entry.name,
          label: `#${entry.id} · ${entry.name}`,
          kind: 'pokemon',
        })
      })

      const typeMatches = POKEMON_TYPES.filter((type) => type.includes(trimmed)).slice(0, 3)
      typeMatches.forEach((type) => {
        suggestions.push({
          value: type,
          label: `Tipo · ${type}`,
          kind: 'type',
        })
      })

      return suggestions.slice(0, 6)
    },
    [ensureCatalog],
  )

  const searchPokemon = useCallback(
    async (query: string): Promise<PokemonSummary[]> => {
      const trimmed = query.trim().toLowerCase()

      if (!trimmed) {
        return []
      }

      if (/^\d+$/.test(trimmed)) {
        const pokemon = await getPokemonById(Number(trimmed))
        return [pokemon]
      }

      const catalog = await ensureCatalog()
      const exactMatch = catalog.find((entry) => entry.name === trimmed)

      if (exactMatch) {
        return [await getPokemonByName(exactMatch.name)]
      }

      if (POKEMON_TYPES.includes(trimmed)) {
        const typeData = await fetchJson<PokemonTypeResponse>(`${BASE_URL}/type/${trimmed}`)
        const names = typeData.pokemon.map((entry) => entry.pokemon.name)
        const results = await Promise.all(names.map((name) => getPokemonByName(name)))
        return results
      }

      const partialMatches = catalog.filter((entry) => entry.name.includes(trimmed)).slice(0, 8)

      if (partialMatches.length === 0) {
        return []
      }

      const results = await Promise.all(
        partialMatches.map((entry) => getPokemonByName(entry.name)),
      )
      return results
    },
    [ensureCatalog, getPokemonById, getPokemonByName],
  )

  const getRandomPokemon = useCallback(
    async (count = 10): Promise<PokemonSummary[]> => {
      const catalog = await ensureCatalog()
      const selectedIds = new Set<number>()
      const total = catalog.length

      while (selectedIds.size < count && selectedIds.size < total) {
        const randomId = Math.floor(Math.random() * total) + 1
        selectedIds.add(randomId)
      }

      const ids = Array.from(selectedIds)
      const results = await Promise.all(ids.map((id) => getPokemonById(id)))
      return results
    },
    [ensureCatalog, getPokemonById],
  )

  return {
    getRandomPokemon,
    searchPokemon,
    getSuggestions,
  }
}
