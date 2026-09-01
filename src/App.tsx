import { useEffect, useMemo, useRef, useState } from 'react'
import { usePokemonApi, type PokemonSuggestion, type PokemonSummary } from './hooks/usePokemonApi'
import './App.css'

const typeColors: Record<string, string> = {
  normal: '#a8a77a',
  fire: '#ee8130',
  water: '#6390f0',
  electric: '#f7d02c',
  grass: '#7ac74c',
  ice: '#96d9d6',
  fighting: '#c22e28',
  poison: '#a33ea1',
  ground: '#e2bf65',
  flying: '#a98ff3',
  psychic: '#f95587',
  bug: '#a6b91a',
  rock: '#b6a136',
  ghost: '#735797',
  dragon: '#6f35fc',
  dark: '#705746',
  steel: '#b7b7ce',
  fairy: '#d685ad',
}

function App() {
  const { getRandomPokemon, searchPokemon, getSuggestions } = usePokemonApi()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<PokemonSummary[]>([])
  const [popular, setPopular] = useState<PokemonSummary[]>([])
  const [suggestions, setSuggestions] = useState<PokemonSuggestion[]>([])
  const [_, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let active = true

    const loadPopular = async () => {
      const random = await getRandomPokemon(12)
      if (active) {
        setPopular(random)
      }
    }

    loadPopular()
    return () => {
      active = false
    }
  }, [getRandomPokemon])

  useEffect(() => {
    let active = true

    const loadSuggestions = async () => {
      const query = search.trim()
      if (!query) {
        setSuggestions([])
        setSelectedIndex(-1)
        return
      }

      const nextSuggestions = await getSuggestions(query)
      if (active) {
        setSuggestions(nextSuggestions)
        setSelectedIndex(-1)
      }
    }

    const timeoutId = window.setTimeout(loadSuggestions, 250)

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [getSuggestions, search])

  const handleSubmit = async (value?: string) => {
    const query = (value ?? search).trim()
    if (!query) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const matches = await searchPokemon(query)
      setResults(matches)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (value: string) => {
    setSearch(value)
    setSuggestions([])
    void handleSubmit(value)
  }

  const displayResults = useMemo(() => {
    if (results.length > 0) return results
    return popular
  }, [popular, results])

  return (
    <main className="pokedex-app">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar glass-panel">
        <div className="title-block">
          <h1>Pokédex</h1>
          <p className="subtitle">Pokemon Search</p>
        </div>
      </header>

      <section className="search-block glass-panel">
        <div className="search-shell">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="search-icon">
            <path d="M10.5 3a7.5 7.5 0 0 1 5.9 12.8l4.4 4.4 1.4-1.4-4.4-4.4A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={search}
            placeholder="Busca por nombre, número o tipo..."
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                  handleSuggestionClick(suggestions[selectedIndex].value)
                  return
                }
                void handleSubmit()
              }

              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setSelectedIndex((current) => Math.min(current + 1, suggestions.length - 1))
              }

              if (event.key === 'ArrowUp') {
                event.preventDefault()
                setSelectedIndex((current) => Math.max(current - 1, 0))
              }
            }}
            aria-label="Buscar Pokémon"
            autoComplete="off"
            spellCheck={false}
          />

          <button type="button" className="search-button" onClick={() => void handleSubmit()}>
            Buscar
          </button>
        </div>

        {suggestions.length > 0 && (
          <ul className="suggestions" role="listbox" aria-label="Sugerencias de Pokémon">
            {suggestions.map((suggestion, index) => (
              <li key={`${suggestion.kind}-${suggestion.value}`}>
                <button
                  type="button"
                  className={index === selectedIndex ? 'active' : ''}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    handleSuggestionClick(suggestion.value)
                  }}
                >
                  <span className="suggestion-kind">{suggestion.kind}</span>
                  {suggestion.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-grid">
        {displayResults.map((pokemon) => (
          <article key={pokemon.id} className="pokemon-card glass-panel">
            <div className="card-image-wrap">
              <img src={pokemon.image} alt={pokemon.name} className="pokemon-image" />
            </div>

            <div className="card-body">
              <div className="card-header-row">
                <span className="pokemon-id">#{String(pokemon.id).padStart(3, '0')}</span>
                <span className="pokemon-name">{pokemon.name}</span>
              </div>

              <div className="type-row">
                {pokemon.types.map((type) => (
                  <span
                    key={`${pokemon.id}-${type}`}
                    className="pokemon-type"
                    style={{ backgroundColor: typeColors[type] ?? '#8a8a8a' }}
                  >
                    {type}
                  </span>
                ))}
              </div>

              <dl className="stats-grid">
                <div>
                  <dt>Altura</dt>
                  <dd>{pokemon.height / 10} m</dd>
                </div>
                <div>
                  <dt>Peso</dt>
                  <dd>{pokemon.weight / 10} kg</dd>
                </div>
              </dl>

              <div className="ability-list">
                {pokemon.abilities.slice(0, 3).map((ability) => (
                  <span key={`${pokemon.id}-${ability}`} className="ability-pill">
                    {ability}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      <footer className="site-footer">
        <span>Created by Carlos Ignacio Olano Mares ❤️</span>
        <span>Powered By React GitHub Vercel and PokeApi</span>
      </footer>
    </main>
  )
}

export default App
