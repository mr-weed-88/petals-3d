import * as THREE from 'three'

import type { LineMesh } from '../types/domain'

/* ------------------------------------------------------------------ *
 * Curve sets
 * ------------------------------------------------------------------ */

/** One input curve for a loft, plus whether it forms a closed loop. */
export interface CurveSet {
    guidePoints: THREE.Vector3[]
    isClosed: boolean
}

/**
 * A guide set as it arrives from the various shape generators, each of
 * which names its output differently. `normalizeGuideSetNoNormals` reads
 * whichever key is populated.
 */
export interface GuideSetInput {
    guidePoints?: THREE.Vector3[]
    points?: THREE.Vector3[]
    circlePoints?: THREE.Vector3[]
    squarePoints?: THREE.Vector3[]
    semiCirclePoints?: THREE.Vector3[]
    arcPoints?: THREE.Vector3[]
}

export interface NormalizedGuideSet {
    points: THREE.Vector3[]
    isClosed: boolean
}

/* ------------------------------------------------------------------ *
 * Alignment
 * ------------------------------------------------------------------ */

/**
 * Puts every curve into the same winding and starting position as the
 * first, so corresponding points on adjacent curves line up. Without this
 * the lofted surface twists between curves.
 */
export function alignCurvesForLofting(curveSets: CurveSet[]): CurveSet[] {
    if (curveSets.length < 2) return curveSets

    const aligned: CurveSet[] = [curveSets[0]!]

    for (let i = 1; i < curveSets.length; i++) {
        const prevCurve = aligned[i - 1]!.guidePoints
        const current = curveSets[i]!
        const currentCurve = current.guidePoints

        let alignedPoints = currentCurve

        if (current.isClosed) {
            alignedPoints = alignClosedCurveSeam(currentCurve, prevCurve)
        } else {
            const first = prevCurve[0]
            if (first && currentCurve.length > 0) {
                const dToStart = first.distanceTo(currentCurve[0]!)
                const dToEnd = first.distanceTo(
                    currentCurve[currentCurve.length - 1]!
                )
                if (dToEnd < dToStart) {
                    alignedPoints = [...currentCurve].reverse()
                }
            }
        }

        aligned.push({
            guidePoints: alignedPoints,
            isClosed: current.isClosed,
        })
    }

    return aligned
}

type SeamDirection = 'normal' | 'reversed'

/**
 * Finds the rotation and winding of a closed curve that best matches the
 * previous one, by trying every possible seam position.
 */
function alignClosedCurveSeam(
    currentCurve: THREE.Vector3[],
    previousCurve: THREE.Vector3[]
): THREE.Vector3[] {
    const numPoints = currentCurve.length
    if (numPoints === 0) return currentCurve

    // A closed curve usually repeats its first point at the end. Drop it
    // while rotating, then put it back.
    const isLastDuplicate =
        numPoints > 1 &&
        currentCurve[0]!.distanceTo(currentCurve[numPoints - 1]!) < 0.001

    const workingCurve = isLastDuplicate
        ? currentCurve.slice(0, -1)
        : currentCurve
    const actualLength = workingCurve.length

    let bestRotation = 0
    let bestDirection: SeamDirection = 'normal'
    let minTotalDistance = Infinity

    const reversedCurve = [...workingCurve].reverse()

    const candidates: ReadonlyArray<[SeamDirection, THREE.Vector3[]]> = [
        ['normal', workingCurve],
        ['reversed', reversedCurve],
    ]

    for (const [direction, curve] of candidates) {
        for (let rotation = 0; rotation < actualLength; rotation++) {
            const totalDist = calculateRotatedDistance(
                curve,
                previousCurve,
                rotation
            )
            if (totalDist < minTotalDistance) {
                minTotalDistance = totalDist
                bestRotation = rotation
                bestDirection = direction
            }
        }
    }

    let resultCurve =
        bestDirection === 'reversed' ? reversedCurve : workingCurve

    if (bestRotation > 0) {
        resultCurve = [
            ...resultCurve.slice(bestRotation),
            ...resultCurve.slice(0, bestRotation),
        ]
    }

    if (isLastDuplicate && resultCurve.length > 0) {
        resultCurve = [...resultCurve, resultCurve[0]!.clone()]
    }

    return resultCurve
}

/** Mean distance between sampled pairs at a given seam offset. */
function calculateRotatedDistance(
    curve: THREE.Vector3[],
    referenceCurve: THREE.Vector3[],
    rotation: number
): number {
    const sampleCount = Math.min(20, curve.length, referenceCurve.length)
    if (sampleCount === 0) return Infinity

    let totalDistance = 0

    for (let i = 0; i < sampleCount; i++) {
        const refIdx = Math.floor((i / sampleCount) * referenceCurve.length)
        const currIdx =
            (Math.floor((i / sampleCount) * curve.length) + rotation) %
            curve.length

        const refPoint = referenceCurve[refIdx]
        const currPoint = curve[currIdx]
        if (refPoint && currPoint) {
            totalDistance += refPoint.distanceTo(currPoint)
        }
    }

    return totalDistance / sampleCount
}

/* ------------------------------------------------------------------ *
 * Loop detection
 * ------------------------------------------------------------------ */

interface LoopSegment {
    points: THREE.Vector3[]
    start: THREE.Vector3
    end: THREE.Vector3
    used: boolean
    reversed: boolean
}

export interface CombinedLoop {
    guidePoints: THREE.Vector3[]
}

/**
 * Joins several selected strokes end-to-end into a single closed loop.
 *
 * Returns null unless every stroke is consumed and the chain closes, since
 * a partial chain cannot be lofted.
 */
export function detectAndCombineConnectedLoop(
    lineObjects: LineMesh[]
): CombinedLoop | null {
    if (lineObjects.length < 2) return null

    const OVERLAP_THRESHOLD = 0.01

    const segments: LoopSegment[] = []
    for (const obj of lineObjects) {
        const points = obj.userData.loft_points
        if (!points || points.length < 2) continue
        segments.push({
            points,
            start: points[0]!,
            end: points[points.length - 1]!,
            used: false,
            reversed: false,
        })
    }

    if (segments.length < 2) return null

    const first = segments[0]!
    first.used = true
    const connectedChain: LoopSegment[] = [first]

    let currentEnd = first.end
    let foundNext = true

    while (connectedChain.length < segments.length && foundNext) {
        foundNext = false

        for (const candidate of segments) {
            if (candidate.used) continue

            const distToStart = currentEnd.distanceTo(candidate.start)
            const distToEnd = currentEnd.distanceTo(candidate.end)

            if (distToStart < OVERLAP_THRESHOLD) {
                candidate.used = true
                candidate.reversed = false
                connectedChain.push(candidate)
                currentEnd = candidate.end
                foundNext = true
                break
            }

            if (distToEnd < OVERLAP_THRESHOLD) {
                candidate.used = true
                candidate.reversed = true
                connectedChain.push(candidate)
                currentEnd = candidate.start
                foundNext = true
                break
            }
        }
    }

    if (connectedChain.length !== segments.length) return null

    const isClosed =
        connectedChain[0]!.start.distanceTo(currentEnd) < OVERLAP_THRESHOLD
    if (!isClosed) return null

    const combinedPoints: THREE.Vector3[] = []
    for (const segment of connectedChain) {
        const ordered = segment.reversed
            ? [...segment.points].reverse()
            : segment.points
        // The last point of each segment is the first of the next.
        combinedPoints.push(...ordered.slice(0, -1))
    }

    if (combinedPoints.length === 0) return null
    combinedPoints.push(combinedPoints[0]!.clone())

    return { guidePoints: combinedPoints }
}

/* ------------------------------------------------------------------ *
 * Resampling
 * ------------------------------------------------------------------ */

export interface ResampledCurve {
    points: THREE.Vector3[]
}

/**
 * Forces an even point count by inserting a midpoint, which the surface
 * indexing below relies on.
 */
export function ensureEvenCount(
    points: THREE.Vector3[],
    isClosed: boolean
): ResampledCurve {
    if (points.length === 0) return { points: [] }

    const out = points.slice()
    if (out.length % 2 === 0) return { points: out }

    if (isClosed) {
        const first = out[0]!
        const second = out[1] ?? first
        out.splice(1, 0, new THREE.Vector3().lerpVectors(first, second, 0.5))
        return { points: out }
    }

    // Split the longest span, so the inserted point disturbs the shape least.
    let maxLen = -1
    let maxIdx = 0
    for (let i = 0; i < out.length - 1; i++) {
        const len = out[i]!.distanceTo(out[i + 1]!)
        if (len > maxLen) {
            maxLen = len
            maxIdx = i
        }
    }

    out.splice(
        maxIdx + 1,
        0,
        new THREE.Vector3().lerpVectors(out[maxIdx]!, out[maxIdx + 1]!, 0.5)
    )

    return { points: out }
}

/**
 * Resamples a curve to a fixed point count.
 *
 * Four or more points go through a centripetal Catmull-Rom curve, which
 * preserves circular shapes; fewer fall back to linear interpolation
 * because the spline needs the extra control points.
 */
export function resampleCurveNoNormals(
    points: THREE.Vector3[],
    targetSegments: number,
    isClosed: boolean
): ResampledCurve {
    if (points.length < 2) return { points: [] }

    if (points.length >= 4) {
        const curve = new THREE.CatmullRomCurve3(
            points,
            isClosed,
            'centripetal',
            0.5
        )
        curve.arcLengthDivisions = targetSegments * 3
        return { points: curve.getSpacedPoints(targetSegments - 1) }
    }

    const sampledPoints: THREE.Vector3[] = []
    const segCount = isClosed ? points.length : points.length - 1
    if (segCount === 0) return { points: points.slice() }

    const perSeg = Math.max(1, Math.floor(targetSegments / segCount))

    for (let i = 0; i < segCount; i++) {
        const p0 = points[i]!
        const p1 = points[(i + 1) % points.length]!
        for (let j = 0; j < perSeg; j++) {
            sampledPoints.push(
                new THREE.Vector3().lerpVectors(p0, p1, j / perSeg)
            )
        }
    }

    while (sampledPoints.length < targetSegments && sampledPoints.length > 0) {
        sampledPoints.push(sampledPoints[sampledPoints.length - 1]!.clone())
    }

    if (sampledPoints.length > targetSegments) {
        sampledPoints.length = targetSegments
    }

    return { points: sampledPoints }
}

const POINT_KEYS: ReadonlyArray<keyof GuideSetInput> = [
    'guidePoints',
    'points',
    'circlePoints',
    'squarePoints',
    'semiCirclePoints',
    'arcPoints',
]

/** Finds whichever point array a guide set populated, and detects closure. */
export function normalizeGuideSetNoNormals(
    guideSet: GuideSetInput
): NormalizedGuideSet {
    let points: THREE.Vector3[] | null = null

    for (const key of POINT_KEYS) {
        const candidate = guideSet[key]
        if (Array.isArray(candidate) && candidate.length > 0) {
            points = [...candidate]
            break
        }
    }

    if (!points) throw new Error('No points found in guide set')

    const isClosed =
        points.length > 2 &&
        points[0]!.distanceTo(points[points.length - 1]!) < 1e-6

    const cleanedPoints = isClosed ? points.slice(0, -1) : points

    if (cleanedPoints.length < 2) {
        throw new Error('Need at least 2 points per curve')
    }

    return { points: cleanedPoints, isClosed }
}

/* ------------------------------------------------------------------ *
 * Surface construction
 * ------------------------------------------------------------------ */

interface LoftSurfaceOptions {
    segments?: number
    /** 0..1. Biases the interpolation toward one guide curve or the other. */
    radial?: number
    /** 0..1. Below 0.5 pinches the middle, above 0.5 bulges it. */
    waist?: number
    subdivisions?: number
}

const lerp = (min: number, max: number, t: number): number =>
    min + (max - min) * t

function createLoftedSurface(
    guideSets: GuideSetInput[],
    {
        segments = 128,
        radial = 0.5,
        waist = 0.5,
        subdivisions = 64,
    }: LoftSurfaceOptions = {}
): THREE.BufferGeometry | null {
    if (guideSets.length < 2) return null

    const normalizedGuideSets = guideSets.map(normalizeGuideSetNoNormals)
    const isClosed = normalizedGuideSets[0]!.isClosed

    const resampledGuides = normalizedGuideSets.map(
        ({ points, isClosed: closed }) =>
            resampleCurveNoNormals(points, segments, closed)
    )

    const numGuides = resampledGuides.length
    const numPointsPerCurve = segments

    // Maximum separation between adjacent curves at each point, used to
    // scale the waist bulge so it stays proportional to the surface.
    const maxDistsPerPair: number[][] = []
    for (let i = 0; i < numGuides - 1; i++) {
        const curve1 = resampledGuides[i]!.points
        const curve2 = resampledGuides[i + 1]!.points
        const maxDists: number[] = []

        for (let j = 0; j < numPointsPerCurve; j++) {
            const p1 = curve1[j]
            const p2 = curve2[j]
            maxDists.push(p1 && p2 ? p1.distanceTo(p2) : 0)
        }

        maxDistsPerPair.push(maxDists)
    }

    const positions: number[] = []
    const indices: number[] = []
    const uvs: number[] = []

    for (let i = 0; i < subdivisions; i++) {
        const globalT = subdivisions > 1 ? i / (subdivisions - 1) : 0

        const guideT = globalT * (numGuides - 1)
        const segmentIndex = Math.floor(guideT)
        const nextSegmentIndex = Math.min(segmentIndex + 1, numGuides - 1)
        const localT = guideT - segmentIndex

        const currentGuide = resampledGuides[segmentIndex]!
        const nextGuide = resampledGuides[nextSegmentIndex]!
        const maxDists =
            maxDistsPerPair[Math.min(segmentIndex, maxDistsPerPair.length - 1)]

        for (let j = 0; j < numPointsPerCurve; j++) {
            const u = numPointsPerCurve > 1 ? j / (numPointsPerCurve - 1) : 0

            const p1 = currentGuide.points[j]
            const p2 = nextGuide.points[j]
            if (!p1 || !p2) continue

            let radialT = localT
            if (radial !== 0.5) {
                const bias = (radial - 0.5) * 2
                radialT =
                    bias < 0
                        ? Math.pow(localT, 1 - bias * 0.5)
                        : 1 - Math.pow(1 - localT, 1 + bias * 0.5)
            }

            const finalPoint = new THREE.Vector3().lerpVectors(p1, p2, radialT)

            if (Math.abs(waist - 0.5) > 0.01 && maxDists) {
                const bulgeIntensity = (waist - 0.5) * 2
                const parabola = 4 * localT * (1 - localT)

                const prevJ = Math.max(0, j - 1)
                const nextJ = Math.min(numPointsPerCurve - 1, j + 1)

                const p1Prev = currentGuide.points[prevJ]
                const p1Next = currentGuide.points[nextJ]
                const p2Prev = nextGuide.points[prevJ]
                const p2Next = nextGuide.points[nextJ]

                if (p1Prev && p1Next && p2Prev && p2Next) {
                    const tangent1 = new THREE.Vector3()
                        .subVectors(p1Next, p1Prev)
                        .normalize()
                    const tangent2 = new THREE.Vector3()
                        .subVectors(p2Next, p2Prev)
                        .normalize()
                    const avgTangent = new THREE.Vector3()
                        .lerpVectors(tangent1, tangent2, localT)
                        .normalize()

                    const axialDirection = new THREE.Vector3()
                        .subVectors(p2, p1)
                        .normalize()
                    const bulgeDirection = new THREE.Vector3().crossVectors(
                        axialDirection,
                        avgTangent
                    )

                    if (bulgeDirection.length() > 0.001) {
                        bulgeDirection.normalize()
                        const maxBulge = (maxDists[j] ?? 0) * 0.15
                        finalPoint.addScaledVector(
                            bulgeDirection,
                            parabola * bulgeIntensity * maxBulge
                        )
                    }
                }
            }

            positions.push(finalPoint.x, finalPoint.y, finalPoint.z)
            uvs.push(u, globalT)
        }
    }

    for (let i = 0; i < subdivisions - 1; i++) {
        for (let j = 0; j < numPointsPerCurve - 1; j++) {
            const a = i * numPointsPerCurve + j
            const b = i * numPointsPerCurve + j + 1
            const c = (i + 1) * numPointsPerCurve + j
            const d = (i + 1) * numPointsPerCurve + j + 1
            indices.push(a, b, c, b, d, c)
        }

        // Stitch the last column back to the first so the tube has no seam.
        if (isClosed) {
            const j = numPointsPerCurve - 1
            const a = i * numPointsPerCurve + j
            const b = i * numPointsPerCurve
            const c = (i + 1) * numPointsPerCurve + j
            const d = (i + 1) * numPointsPerCurve
            indices.push(a, b, c, b, d, c)
        }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
    )
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    return geometry
}

/* ------------------------------------------------------------------ *
 * Live-adjustable loft
 * ------------------------------------------------------------------ */

export interface ControlledLoftOptions {
    initialRadial?: number
    initialWaist?: number
    initialPolyCount?: number
    /**
     * Wireframe colour. Passed in rather than fixed here, so this helper
     * stays unaware of the theme; the caller reads the palette.
     */
    wireColor?: string
}

/**
 * A loft surface whose radial bias, waist and resolution can be changed
 * from the sliders without rebuilding the input curves.
 *
 * `mesh` is null when the guide sets cannot produce a surface.
 */
export interface ControlledLoft {
    mesh: THREE.Mesh | null
    originalGuideSets: GuideSetInput[]
    setRadial: (value: number) => THREE.Mesh | null
    setWaist: (value: number) => THREE.Mesh | null
    setPolyCount: (value: number) => THREE.Mesh | null
    getRadial: () => number
    getWaist: () => number
    getPolyCount: () => number
    dispose: () => void
}

export function createControlledLoftedSurface(
    guideSets: GuideSetInput[],
    options: ControlledLoftOptions = {}
): ControlledLoft {
    const {
        initialRadial = 0.5,
        initialWaist = 0.5,
        initialPolyCount = 0.5,
        wireColor = '#F2F2F2',
    } = options

    let currentRadial = initialRadial
    let currentWaist = initialWaist
    let currentPolyCount = initialPolyCount
    let currentGeometry: THREE.BufferGeometry | null = null
    let loftMesh: THREE.Mesh | null = null

    const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))

    const regenerate = (
        newRadial = currentRadial,
        newWaist = currentWaist,
        newPolyCount = currentPolyCount
    ): THREE.Mesh | null => {
        currentRadial = clamp01(newRadial)
        currentWaist = clamp01(newWaist)
        currentPolyCount = clamp01(newPolyCount)

        currentGeometry?.dispose()

        // Squared so the low end of the slider has finer control, where the
        // difference between 16 and 32 segments is most visible.
        const polySquared = currentPolyCount * currentPolyCount
        const resolution = Math.floor(lerp(16, 128, polySquared))

        currentGeometry = createLoftedSurface(guideSets, {
            segments: resolution,
            subdivisions: resolution,
            radial: currentRadial,
            waist: currentWaist,
        })

        if (!currentGeometry) return null

        if (loftMesh) {
            loftMesh.geometry = currentGeometry
        } else {
            loftMesh = new THREE.Mesh(
                currentGeometry,
                new THREE.MeshBasicMaterial({
                    color: new THREE.Color(wireColor),
                    wireframe: true,
                    transparent: true,
                    opacity: 0.25,
                    side: THREE.DoubleSide,
                    forceSinglePass: true,
                    depthTest: true,
                    depthWrite: true,
                })
            )
        }

        loftMesh.userData = { type: 'LOFT_SURFACE' }
        return loftMesh
    }

    regenerate()

    return {
        mesh: loftMesh,
        originalGuideSets: guideSets,
        setRadial: (value) => regenerate(value, currentWaist, currentPolyCount),
        setWaist: (value) => regenerate(currentRadial, value, currentPolyCount),
        setPolyCount: (value) => regenerate(currentRadial, currentWaist, value),
        getRadial: () => currentRadial,
        getWaist: () => currentWaist,
        getPolyCount: () => currentPolyCount,
        dispose: () => {
            currentGeometry?.dispose()
            if (loftMesh) {
                const material = loftMesh.material
                if (Array.isArray(material)) {
                    material.forEach((m) => m.dispose())
                } else {
                    material.dispose()
                }
                loftMesh.parent?.remove(loftMesh)
            }
        },
    }
}
