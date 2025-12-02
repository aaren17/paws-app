import { useEffect, useRef, useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import './App.css'

type CatCard = {
  id: string
  url: string
}

const TOTAL_CATS = 12
const SWIPE_ANIMATION_MS = 240
const INITIAL_READY_COUNT = 3

const generateDeck = (count: number): CatCard[] => {
  const deckId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return Array.from({ length: count }, (_, index) => ({
    id: `${deckId}-${index}`,
    url: `https://cataas.com/cat?width=560&height=720&format=jpg&deck=${deckId}-${index}`,
  }))
}

const App = () => {
  const [cats, setCats] = useState<CatCard[]>(() => generateDeck(TOTAL_CATS))
  const [activeIndex, setActiveIndex] = useState(0)
  const [liked, setLiked] = useState<CatCard[]>([])
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [dragX, setDragX] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isDeckReady, setDeckReady] = useState(false)
  const [readyCount, setReadyCount] = useState(0)
  const timeoutRef = useRef<number | undefined>(undefined)
  const imagePoolRef = useRef<Map<string, string>>(new Map())
  const inFlightRef = useRef<Set<string>>(new Set())
  const [, forceRerender] = useState(0)

  const releasePool = () => {
    imagePoolRef.current.forEach((objectUrl) => {
      if (objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl)
      }
    })
    imagePoolRef.current.clear()
    inFlightRef.current.clear()
  }

  const currentCat = cats[activeIndex]
  const isComplete = activeIndex >= cats.length

  const handleChoice = (direction: 'left' | 'right') => {
    if (!currentCat || isAnimating || !isDeckReady) return

    const chosenCat = currentCat
    setSwipeDirection(direction)
    setIsAnimating(true)

    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => {
      setActiveIndex((index) => index + 1)
      if (direction === 'right') {
        setLiked((prev) => [...prev, chosenCat])
      }
      setSwipeDirection(null)
      setDragX(0)
      setIsAnimating(false)
      timeoutRef.current = undefined
    }, SWIPE_ANIMATION_MS)
  }

  const resetDeck = () => {
    window.clearTimeout(timeoutRef.current)
    releasePool()
    setCats(generateDeck(TOTAL_CATS))
    setActiveIndex(0)
    setLiked([])
    setSwipeDirection(null)
    setDragX(0)
    setIsAnimating(false)
    setDeckReady(false)
    setReadyCount(0)
    timeoutRef.current = undefined
  }

  useEffect(() => {
    return () => {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
      releasePool()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const cache = imagePoolRef.current
    const inFlight = inFlightRef.current
    setDeckReady(false)
    setReadyCount(0)

    const loadDeck = async () => {
      const fetchJobs = cats.map(async (cat) => {
        const url = cat?.url
        if (!url || cache.has(url)) {
          if (!cancelled) {
            setReadyCount((count) => count + 1)
          }
          return
        }

        inFlight.add(url)
        try {
          const response = await fetch(url)
          if (!response.ok) throw new Error('Failed to fetch cat image')
          const blob = await response.blob()
          if (!cancelled) {
            const objectUrl = URL.createObjectURL(blob)
            cache.set(url, objectUrl)
            forceRerender((version) => version + 1)
          }
        } catch {
          if (!cancelled) {
            cache.set(url, url)
            forceRerender((version) => version + 1)
          }
        } finally {
          inFlight.delete(url)
          if (!cancelled) {
            setReadyCount((count) => count + 1)
          }
        }
      })

      await Promise.all(fetchJobs)
      if (!cancelled) {
        setDeckReady(true)
      }
    }

    if (cats.length > 0) {
      loadDeck()
    } else {
      setDeckReady(true)
    }

    return () => {
      cancelled = true
    }
  }, [cats])

  useEffect(() => {
    const threshold = Math.min(INITIAL_READY_COUNT, cats.length)
    if (!isDeckReady && threshold > 0 && readyCount >= threshold) {
      setDeckReady(true)
    }
  }, [readyCount, cats.length, isDeckReady])

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      if (!currentCat || isAnimating) return
      const { deltaX, dir } = eventData
      const directionalOffset = dir === 'Left' ? -Math.abs(deltaX) : Math.abs(deltaX)
      setDragX(directionalOffset)
    },
    onSwipedLeft: () => handleChoice('left'),
    onSwipedRight: () => handleChoice('right'),
    onSwiped: () => {
      if (!swipeDirection) {
        setDragX(0)
      }
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
    delta: 60,
  })

  const upcomingCats = cats.slice(activeIndex, activeIndex + 3)

  const likeActive = swipeDirection === 'right' || dragX > 60
  const nopeActive = swipeDirection === 'left' || dragX < -60

  const shouldAnimate = Boolean(swipeDirection)
  const shouldReset = !shouldAnimate && dragX === 0
  const activeStyle = (() => {
    const baseRotation =
      swipeDirection === 'right' ? 18 : swipeDirection === 'left' ? -18 : dragX / 14
    const baseTranslateX =
      swipeDirection === 'right' ? 520 : swipeDirection === 'left' ? -520 : dragX

    return {
      transform: `translate3d(${baseTranslateX}px, 0, 0) rotate(${baseRotation}deg)`,
      transition: shouldAnimate
        ? `transform ${SWIPE_ANIMATION_MS}ms ease-out`
        : shouldReset
          ? 'transform 150ms ease-out'
          : 'none',
    }
  })()

  return (
    <div className="app">
      <header className="app__header">
        <h1>Paws &amp; Preferences</h1>
        <p>Swipe right to save the cats you adore, swipe left to skip to the next fluffball.</p>
      </header>

      {!isDeckReady ? (
        <div className="loading" role="status" aria-live="polite">
          <div className="loading__spinner" />
          <p>Summoning 12 fabulous felines...</p>
        </div>
      ) : !isComplete ? (
        <>
          <div className="app__status" role="status" aria-live="polite">
            <span>
              Cat {activeIndex + 1} of {cats.length}
            </span>
            <span>{liked.length} liked</span>
          </div>

          <div className="card-stack">
            {upcomingCats.map((cat, index) => {
              const isActive = index === 0
              const layerIndex = upcomingCats.length - index
              const depthTransform = {
                transform: `scale(${1 - index * 0.05}) translateY(${index * 18}px)`,
              }
              const cardClasses = [
                'cat-card',
                isActive ? 'cat-card--active' : 'cat-card--queued',
                likeActive && isActive ? 'cat-card--show-like' : '',
                nopeActive && isActive ? 'cat-card--show-nope' : '',
              ]
                .filter(Boolean)
                .join(' ')

              const cardStyle = isActive
                ? { ...activeStyle, zIndex: layerIndex }
                : { ...depthTransform, zIndex: layerIndex }

              const cachedSrc = imagePoolRef.current.get(cat.url)
              const isImageReady = Boolean(cachedSrc)
              const displaySrc = cachedSrc ?? cat.url

              return (
                <div
                  key={cat.id}
                  className={cardClasses}
                  style={cardStyle}
                  {...(isActive ? handlers : {})}
                >
                  <div className="cat-card__media">
                    <img
                      src={displaySrc}
                      alt="Adorable cat ready for adoption"
                      loading={isActive ? 'eager' : 'lazy'}
                    />
                    {!isImageReady && <div className="cat-card__skeleton" />}
                  </div>
                  <div className="cat-card__indicator cat-card__indicator--like">LIKE</div>
                  <div className="cat-card__indicator cat-card__indicator--nope">NOPE</div>
                </div>
              )
            })}

            {!currentCat && <div className="card-placeholder" />}
          </div>

          <div className="controls">
            <button
              type="button"
              className="controls__button controls__button--skip"
              onClick={() => handleChoice('left')}
              disabled={!currentCat || isAnimating || !isDeckReady}
            >
              Skip
            </button>
            <button
              type="button"
              className="controls__button controls__button--like"
              onClick={() => handleChoice('right')}
              disabled={!currentCat || isAnimating || !isDeckReady}
            >
              Love it
            </button>
          </div>
        </>
      ) : (
        <section className="summary" aria-live="polite">
          <h2>
            You liked {liked.length} out of {cats.length}
          </h2>
          {liked.length > 0 ? (
            <>
              <p>Here are the kitties that stole your heart.</p>
              <div className="summary__grid">
                {liked.map((cat) => (
                  <div key={cat.id} className="summary__thumb">
                    <img src={imagePoolRef.current.get(cat.url) ?? cat.url} alt="Favourite cat" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p>No favourites yet — ready to give it another go?</p>
          )}

          <button
            type="button"
            className="controls__button controls__button--reset"
            onClick={resetDeck}
          >
            Start over
          </button>
        </section>
      )}
    </div>
  )
}

export default App
