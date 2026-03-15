const fs = require('node:fs')

const BASE_URL = 'https://www.mysgroad.com'
const SEED_PATH = '/traffic-cam/sg-pie'
const OUTPUT_PATH = 'web/src/data/mysgroadCatalog.ts'
const CONCURRENCY = 6

function parseOptions(html) {
  return [...html.matchAll(/<option[^>]+value="([^"]+)"[^>]*>([^<]+)<\/option>/gi)]
    .map((match) => ({
      path: match[1].trim(),
      label: match[2].trim(),
    }))
    .filter((option) => option.path && option.path !== '/fav')
    .filter((option, index, all) => all.findIndex((entry) => entry.path === option.path) === index)
}

function parseCameraCards(html) {
  return [...html.matchAll(/<img class="img-responsive" alt="([^"]+)" src="([^"]+)" \/>[\s\S]*?href="\/add-fav\/([^"/]+)\/road"/gi)]
    .map((match) => ({
      alt: match[1].trim(),
      imagePath: match[2].trim(),
      favoriteKey: match[3].trim(),
    }))
}

function cleanCameraLabel(alt) {
  return alt
    .replace(/\s*Traffic CCTV Camera,\s*Updated On .*$/i, '')
    .replace(/\s*Traffic CCTV Camera$/i, '')
    .trim()
}

function cleanAreaLabel(label) {
  return label.replace(/\s+\([^)]+\)\s*$/, '').trim()
}

function toNetworkCode(path) {
  const slug = path.split('/').pop() || path
  return slug.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toUpperCase()
}

function inferMalaysiaState(path, label) {
  const lowerLabel = label.toLowerCase()
  const lowerPath = path.toLowerCase()

  if (lowerPath.includes('/jb-') || lowerLabel.includes('johor') || lowerLabel.includes('ciq') || lowerLabel.includes('skudai') || lowerLabel.includes('tebrau')) {
    return 'Johor'
  }

  if (lowerPath.includes('/kl-')) {
    return 'Kuala Lumpur'
  }

  if (lowerLabel.includes('penang')) {
    return 'Pulau Pinang'
  }

  if (lowerLabel.includes('senai') || lowerLabel.includes('desaru') || lowerLabel.includes('second link')) {
    return 'Johor'
  }

  return 'Multi-State'
}

function classifyRoute(path, label) {
  const lowerPath = path.toLowerCase()
  const lowerLabel = label.toLowerCase()
  const networkCode = toNetworkCode(path)

  if (
    lowerPath.startsWith('/traffic-cam/sg-') ||
    lowerPath === '/sg-checkpoint' ||
    lowerPath === '/woodlands-checkpoint' ||
    lowerPath === '/tuas-checkpoint'
  ) {
    const isCheckpoint = lowerLabel.includes('checkpoint')
    const isSentosa = lowerLabel.includes('sentosa')

    return {
      country: 'Singapore',
      state: 'Singapore',
      area: cleanAreaLabel(label),
      category: isCheckpoint ? 'checkpoint' : isSentosa ? 'landmark' : lowerLabel.includes('expressway') ? 'highway' : 'street',
      purpose: isCheckpoint ? 'checkpoint' : isSentosa ? 'landmark' : lowerLabel.includes('expressway') ? 'highway' : 'street',
      sourceGroup: isCheckpoint ? 'Singapore Checkpoints' : 'Singapore',
      networkCode,
    }
  }

  if (lowerPath.startsWith('/traffic-cam/jb-')) {
    return {
      country: 'Malaysia',
      state: 'Johor',
      area: cleanAreaLabel(label),
      category: 'city',
      purpose: 'street',
      sourceGroup: 'Johor Bahru',
      networkCode,
    }
  }

  if (lowerPath.startsWith('/traffic-cam/kl-')) {
    const isStreet = lowerLabel.startsWith('jalan')
    return {
      country: 'Malaysia',
      state: 'Kuala Lumpur',
      area: cleanAreaLabel(label),
      category: isStreet ? 'city' : 'highway',
      purpose: isStreet ? 'street' : 'highway',
      sourceGroup: 'Kuala Lumpur',
      networkCode,
    }
  }

  if (lowerPath.startsWith('/traffic-cam/highway-')) {
    const isBridge = lowerLabel.includes('bridge')
    const isTunnel = lowerLabel.includes('smart')
    return {
      country: 'Malaysia',
      state: inferMalaysiaState(path, label),
      area: cleanAreaLabel(label),
      category: 'highway',
      purpose: isBridge ? 'landmark' : isTunnel ? 'transport' : 'highway',
      sourceGroup: 'Malaysia Highways',
      networkCode,
    }
  }

  return {
    country: 'Malaysia',
    state: 'Malaysia',
    area: cleanAreaLabel(label),
    category: 'city',
    purpose: 'street',
    sourceGroup: 'mySGRoad',
    networkCode,
  }
}

function toStableId(favoriteKey) {
  return favoriteKey.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toUpperCase()
}

async function fetchRouteCatalog(route) {
  const response = await fetch(`${BASE_URL}${route.path}`)
  if (!response.ok) {
    return []
  }

  const html = await response.text()
  const cards = parseCameraCards(html)
  if (cards.length === 0) {
    return []
  }

  const routeMeta = classifyRoute(route.path, route.label)

  return cards.map((card) => ({
    id: toStableId(card.favoriteKey),
    name: cleanCameraLabel(card.alt),
    imageUrl: card.imagePath.startsWith('http') ? card.imagePath : `${BASE_URL}${card.imagePath}`,
    relayPath: `/proxy/mysgroad${route.path}`,
    routePath: route.path,
    routeLabel: route.label,
    ...routeMeta,
  }))
}

async function mapWithConcurrency(items, limit, worker) {
  const results = []
  let index = 0

  async function runWorker() {
    while (index < items.length) {
      const current = items[index]
      index += 1
      const value = await worker(current)
      results.push(...value)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => runWorker()))
  return results
}

function renderFile(entries) {
  const body = JSON.stringify(entries, null, 2)
  return `export interface MySGRoadCatalogEntry {\n  id: string\n  name: string\n  country: 'Singapore' | 'Malaysia'\n  state: string\n  area: string\n  category: string\n  purpose: string\n  imageUrl: string\n  relayPath: string\n  routePath: string\n  routeLabel: string\n  sourceGroup: string\n  networkCode: string\n}\n\nexport const MYSGROAD_CAMERA_CATALOG: MySGRoadCatalogEntry[] = ${body} as MySGRoadCatalogEntry[]\n`
}

async function main() {
  const seedResponse = await fetch(`${BASE_URL}${SEED_PATH}`)
  const seedHtml = await seedResponse.text()
  const routes = parseOptions(seedHtml)
  const catalog = await mapWithConcurrency(routes, CONCURRENCY, fetchRouteCatalog)
  const unique = Array.from(new Map(catalog.map((entry) => [entry.id, entry])).values())
    .sort((left, right) => {
      if (left.country !== right.country) return left.country.localeCompare(right.country)
      if (left.state !== right.state) return left.state.localeCompare(right.state)
      if (left.area !== right.area) return left.area.localeCompare(right.area)
      return left.name.localeCompare(right.name)
    })

  fs.writeFileSync(OUTPUT_PATH, renderFile(unique))
  console.log(`Generated ${unique.length} mySGRoad camera entries`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
