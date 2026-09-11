import * as THREE from 'three'

/* ------------------------------------------------------------------ *
 * Core helpers
 * ------------------------------------------------------------------ */

/** Anything that can measure distance to its own kind. Vector2 and Vector3 both fit. */
interface Measurable<T> {
    distanceTo(other: T): number
}

/**
 * Drops a trailing point that coincides with the first, so a closed curve
 * is not swept over its seam twice.
 */
function dropDuplicateLoopEnd<T extends Measurable<T>>(
    arr: T[],
    eps = 1e-9
): T[] {
    if (arr.length < 2) return arr
    const first = arr[0]!
    const last = arr[arr.length - 1]!
    return first.distanceTo(last) < Math.sqrt(eps) ? arr.slice(0, -1) : arr
}

interface PlaneBasis {
    u: THREE.Vector3
    v: THREE.Vector3
    n: THREE.Vector3
}

function buildPlaneBasisFromNormal(normal: THREE.Vector3): PlaneBasis {
    const n = normal.clone().normalize()
    const ref =
        Math.abs(n.y) < 0.99
            ? new THREE.Vector3(0, 1, 0)
            : new THREE.Vector3(1, 0, 0)
    const u = new THREE.Vector3().crossVectors(ref, n).normalize()
    const v = new THREE.Vector3().crossVectors(n, u).normalize()
    return { u, v, n }
}

/** Newell-style normal for an open polyline, taken about its centroid. */
function estimatePolylineNormal3D(points: THREE.Vector3[]): THREE.Vector3 {
    const centroid = new THREE.Vector3()
    for (const p of points) centroid.add(p)
    centroid.multiplyScalar(1 / points.length)

    const n = new THREE.Vector3()
    for (let i = 0; i < points.length - 1; i++) {
        const v1 = points[i]!.clone().sub(centroid)
        const v2 = points[i + 1]!.clone().sub(centroid)
        n.add(v1.cross(v2))
    }

    return n.lengthSq() > 0 ? n.normalize() : new THREE.Vector3(0, 0, 1)
}

/** Newell's method for a closed polygon. */
function estimatePolygonNormal(points: THREE.Vector3[]): THREE.Vector3 {
    let nx = 0
    let ny = 0
    let nz = 0

    for (let i = 0; i < points.length; i++) {
        const p0 = points[i]!
        const p1 = points[(i + 1) % points.length]!
        nx += (p0.y - p1.y) * (p0.z + p1.z)
        ny += (p0.z - p1.z) * (p0.x + p1.x)
        nz += (p0.x - p1.x) * (p0.y + p1.y)
    }

    const n = new THREE.Vector3(nx, ny, nz)
    return n.lengthSq() > 0 ? n.normalize() : new THREE.Vector3(0, 0, 1)
}

function projectPointsTo2D(
    points: THREE.Vector3[],
    origin: THREE.Vector3,
    u: THREE.Vector3,
    v: THREE.Vector3
): THREE.Vector2[] {
    return points.map((p) => {
        const d = new THREE.Vector3().subVectors(p, origin)
        return new THREE.Vector2(d.dot(u), d.dot(v))
    })
}

/* ------------------------------------------------------------------ *
 * Adaptive path sampling
 * ------------------------------------------------------------------ */

/** Turn angle at each point. Drives sample density, so corners get more points. */
function computeCurvature(points: THREE.Vector3[], closed = false): number[] {
    const curvatures: number[] = []
    const n = points.length

    const angleBetween = (a: THREE.Vector3, b: THREE.Vector3): number =>
        Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1))

    for (let i = 0; i < n; i++) {
        let angle = 0

        if (i === 0 && !closed) {
            if (n > 2) {
                const v1 = new THREE.Vector3()
                    .subVectors(points[1]!, points[0]!)
                    .normalize()
                const v2 = new THREE.Vector3()
                    .subVectors(points[2]!, points[1]!)
                    .normalize()
                angle = angleBetween(v1, v2)
            }
        } else if (i === n - 1 && !closed) {
            if (i >= 2) {
                const v1 = new THREE.Vector3()
                    .subVectors(points[i - 1]!, points[i - 2]!)
                    .normalize()
                const v2 = new THREE.Vector3()
                    .subVectors(points[i]!, points[i - 1]!)
                    .normalize()
                angle = angleBetween(v1, v2)
            }
        } else {
            const prev = closed && i === 0 ? n - 1 : Math.max(0, i - 1)
            const next = closed && i === n - 1 ? 0 : Math.min(n - 1, i + 1)
            const v1 = new THREE.Vector3()
                .subVectors(points[i]!, points[prev]!)
                .normalize()
            const v2 = new THREE.Vector3()
                .subVectors(points[next]!, points[i]!)
                .normalize()
            angle = angleBetween(v1, v2)
        }

        curvatures.push(angle)
    }

    return curvatures
}

interface SampledPath {
    points: THREE.Vector3[]
    normals: THREE.Vector3[] | null
}

interface SamplePathOptions {
    closed?: boolean
    minSamples?: number
    maxSamples?: number
}

/** Resamples the rail along a Catmull-Rom curve, denser where it turns harder. */
function samplePathAdaptiveWithNormals(
    pathPoints: THREE.Vector3[],
    pathNormals: THREE.Vector3[] | null = null,
    {
        closed = false,
        minSamples = 16,
        maxSamples = 128,
    }: SamplePathOptions = {}
): SampledPath {
    const curve = new THREE.CatmullRomCurve3(
        pathPoints,
        closed,
        'centripetal',
        0.5
    )
    const totalLength = curve.getLength()

    const initSamples = Math.min(pathPoints.length * 4, 64)
    curve.arcLengthDivisions = initSamples * 3
    const initialPoints = curve.getSpacedPoints(initSamples)

    const curvatures = computeCurvature(initialPoints, closed)
    const maxCurv = Math.max(...curvatures, 1e-6)
    const sampleDensities = curvatures.map((c) =>
        Math.max(1, (c / maxCurv) * 4)
    )
    const totalDensity = sampleDensities.reduce((a, b) => a + b, 0)

    const targetSamples = THREE.MathUtils.clamp(
        Math.ceil(totalLength * 2),
        minSamples,
        maxSamples
    )

    const adaptivePoints: THREE.Vector3[] = []
    const adaptiveNormals: THREE.Vector3[] = []
    const hasNormals =
        pathNormals !== null && pathNormals.length === pathPoints.length

    for (let i = 0; i < initialPoints.length - 1; i++) {
        const localSamples = Math.max(
            1,
            Math.round((sampleDensities[i]! / totalDensity) * targetSamples)
        )
        const t0 = i / (initialPoints.length - 1)
        const t1 = (i + 1) / (initialPoints.length - 1)

        for (let j = 0; j < localSamples; j++) {
            const t = t0 + (t1 - t0) * (j / localSamples)
            adaptivePoints.push(curve.getPointAt(t))

            if (hasNormals) {
                const tScaled = t * (pathPoints.length - 1)
                const idx0 = Math.floor(tScaled)
                const idx1 = Math.min(idx0 + 1, pathPoints.length - 1)
                const n0 = pathNormals[idx0]
                const n1 = pathNormals[idx1]
                if (n0 && n1) {
                    adaptiveNormals.push(
                        new THREE.Vector3()
                            .lerpVectors(n0, n1, tScaled - idx0)
                            .normalize()
                    )
                }
            }
        }
    }

    let pts = adaptivePoints
    let norms: THREE.Vector3[] | null =
        adaptiveNormals.length === pts.length ? adaptiveNormals : null

    if (!closed) {
        pts = dropDuplicateLoopEnd(pts, 1e-9)
        if (norms && norms.length > pts.length)
            norms = norms.slice(0, pts.length)
    }

    return { points: pts, normals: norms }
}

/* ------------------------------------------------------------------ *
 * Profile building
 * ------------------------------------------------------------------ */

/** Drops points on near-straight runs, keeping every third so detail survives. */
function simplifyPolyline2D(
    points: THREE.Vector2[],
    angleThreshold = 0.1,
    minPoints = 8
): THREE.Vector2[] {
    if (points.length <= minPoints) return points

    const simplified: THREE.Vector2[] = [points[0]!]

    for (let i = 1; i < points.length - 1; i++) {
        const p0 = points[i - 1]!
        const p1 = points[i]!
        const p2 = points[i + 1]!
        const v1 = new THREE.Vector2().subVectors(p1, p0).normalize()
        const v2 = new THREE.Vector2().subVectors(p2, p1).normalize()
        const angle = Math.acos(THREE.MathUtils.clamp(v1.dot(v2), -1, 1))

        if (angle > angleThreshold || i % 3 === 0) simplified.push(p1)
    }

    simplified.push(points[points.length - 1]!)
    return simplified.length < minPoints ? points : simplified
}

interface BuildProfileOptions {
    shapeScale?: number
    minSegments?: number
    maxSegments?: number
}

/** Flattens the drawn profile into the 2D cross-section that gets swept. */
function buildProfile2DAdaptiveWithNormal(
    guidePoints: THREE.Vector3[],
    guidePointNormals: THREE.Vector3[] | null = null,
    {
        shapeScale = 1,
        minSegments = 8,
        maxSegments = 32,
    }: BuildProfileOptions = {}
): THREE.Vector2[] {
    if (guidePoints.length < 2) return []

    const closed3D =
        guidePoints.length > 2 &&
        guidePoints[0]!.distanceToSquared(
            guidePoints[guidePoints.length - 1]!
        ) < 1e-12

    let planeNormal: THREE.Vector3
    if (guidePointNormals && guidePointNormals.length > 0) {
        planeNormal = new THREE.Vector3()
        for (const n of guidePointNormals) planeNormal.add(n)
        planeNormal.normalize()
    } else {
        planeNormal = closed3D
            ? estimatePolygonNormal(guidePoints)
            : estimatePolylineNormal3D(guidePoints)
    }

    const { u, v } = buildPlaneBasisFromNormal(planeNormal)
    const origin = guidePoints[0]!

    let pts2 = projectPointsTo2D(guidePoints, origin, u, v).map(
        (p) => new THREE.Vector2(p.x * shapeScale, p.y * shapeScale)
    )
    pts2 = dropDuplicateLoopEnd(pts2, 1e-9)

    const simplified = simplifyPolyline2D(pts2, 0.15, minSegments)

    if (simplified.length > maxSegments) {
        const step = Math.ceil(simplified.length / maxSegments)
        const decimated: THREE.Vector2[] = []
        for (let i = 0; i < simplified.length; i += step) {
            decimated.push(simplified[i]!)
        }
        return decimated
    }

    return simplified
}

/* ------------------------------------------------------------------ *
 * Plane-locked sweep
 * ------------------------------------------------------------------ */

/** Maps position along the rail, 0..1, to a value. */
type AlongPathFn = (u: number) => number

interface SweepOptions {
    closedPath?: boolean
    minPathSamples?: number
    maxPathSamples?: number
    /** Rotation of the profile about the rail, in radians. */
    twistFn?: AlongPathFn | null
    /** Uniform scale of the profile along the rail. */
    taperFn?: AlongPathFn | null
}

/**
 * Sweeps the profile along the rail, holding it perpendicular to the rail's
 * plane rather than to the local tangent. Without that lock the profile
 * rolls as the rail curves and the surface self-intersects.
 */
function sweepWithPlaneNormal(
    brushPolyline2D: THREE.Vector2[],
    guidePathPoints: THREE.Vector3[],
    pathPlaneNormal: THREE.Vector3 | null,
    pathNormals: THREE.Vector3[] | null = null,
    {
        closedPath = false,
        minPathSamples = 16,
        maxPathSamples = 128,
        twistFn = null,
        taperFn = null,
    }: SweepOptions = {}
): THREE.BufferGeometry | null {
    if (brushPolyline2D.length < 2 || guidePathPoints.length < 2) return null

    const { points: P } = samplePathAdaptiveWithNormals(
        guidePathPoints,
        pathNormals,
        {
            closed: closedPath,
            minSamples: minPathSamples,
            maxSamples: maxPathSamples,
        }
    )

    if (P.length < 2) return null

    const pathPlane = pathPlaneNormal
        ? pathPlaneNormal.clone().normalize()
        : new THREE.Vector3(0, 1, 0)

    const brush = dropDuplicateLoopEnd(brushPolyline2D, 1e-9)
    const shapeLen = brush.length

    const positions: number[] = []
    const indices: number[] = []
    const uvs: number[] = []

    for (let i = 0; i < P.length; i++) {
        const center = P[i]!

        let tangent: THREE.Vector3
        if (i === 0) {
            tangent = new THREE.Vector3().subVectors(P[1]!, P[0]!).normalize()
        } else if (i === P.length - 1) {
            tangent = new THREE.Vector3()
                .subVectors(P[i]!, P[i - 1]!)
                .normalize()
        } else {
            const prev = new THREE.Vector3()
                .subVectors(P[i]!, P[i - 1]!)
                .normalize()
            const next = new THREE.Vector3()
                .subVectors(P[i + 1]!, P[i]!)
                .normalize()
            tangent = prev.add(next).normalize()
        }

        let binormal = new THREE.Vector3()
            .crossVectors(tangent, pathPlane)
            .normalize()

        // Tangent parallel to the plane normal leaves no unique binormal.
        if (binormal.lengthSq() < 1e-6) {
            binormal = new THREE.Vector3()
                .crossVectors(tangent, new THREE.Vector3(1, 0, 0))
                .normalize()
        }

        const normal = new THREE.Vector3()
            .crossVectors(binormal, tangent)
            .normalize()

        const u = P.length > 1 ? i / (P.length - 1) : 0
        const twist = twistFn ? twistFn(u) : 0
        const scale = taperFn ? taperFn(u) : 1
        const cosT = Math.cos(twist)
        const sinT = Math.sin(twist)

        for (let j = 0; j < shapeLen; j++) {
            const sp = brush[j]!
            const x0 = sp.x * scale
            const y0 = sp.y * scale
            const x = x0 * cosT - y0 * sinT
            const y = x0 * sinT + y0 * cosT

            const vertex = new THREE.Vector3()
                .copy(center)
                .addScaledVector(binormal, x)
                .addScaledVector(normal, y)

            positions.push(vertex.x, vertex.y, vertex.z)
            uvs.push(u, shapeLen > 1 ? j / (shapeLen - 1) : 0)
        }

        if (i > 0) {
            const prev = (i - 1) * shapeLen
            const curr = i * shapeLen
            for (let j = 0; j < shapeLen - 1; j++) {
                const a = prev + j
                const b = prev + j + 1
                const c = curr + j
                const d = curr + j + 1
                indices.push(a, b, c, b, d, c)
            }
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
 * Entry point
 * ------------------------------------------------------------------ */

export interface BendOGGuideOptions {
    minPathSamples?: number
    maxPathSamples?: number
    minProfileSegments?: number
    maxProfileSegments?: number
    closedPath?: boolean
    /** Surface normals of the profile curve, averaged to find its plane. */
    guidePointNormals?: THREE.Vector3[] | null
    /** Surface normals of the rail, averaged to find its plane. */
    guidePathPointNormals?: THREE.Vector3[] | null
}

/**
 * Sweeps a drawn profile along a drawn rail to produce a bent guide surface.
 *
 * `guidePoints` is the first curve the user drew, kept in the store as
 * `ogGuidePoints`. `guidePathPoints` is the rail drawn in bend mode.
 * Returns null when either curve is too short to sweep.
 */
export function bendOGGuide(
    guidePoints: THREE.Vector3[] | null,
    guidePathPoints: THREE.Vector3[] | null,
    shapeScale = 1,
    options: BendOGGuideOptions = {}
): THREE.BufferGeometry | null {
    const {
        minPathSamples = 16,
        maxPathSamples = 128,
        minProfileSegments = 8,
        maxProfileSegments = 32,
        closedPath = false,
        guidePointNormals = null,
        guidePathPointNormals = null,
    } = options

    if (
        !guidePoints ||
        !guidePathPoints ||
        guidePoints.length < 2 ||
        guidePathPoints.length < 2
    ) {
        return null
    }

    let pathPlaneNormal: THREE.Vector3
    if (guidePathPointNormals && guidePathPointNormals.length > 0) {
        pathPlaneNormal = new THREE.Vector3()
        for (const n of guidePathPointNormals) pathPlaneNormal.add(n)
        pathPlaneNormal.normalize()
    } else {
        const closedPath3D =
            guidePathPoints.length > 2 &&
            guidePathPoints[0]!.distanceToSquared(
                guidePathPoints[guidePathPoints.length - 1]!
            ) < 1e-12
        pathPlaneNormal = closedPath3D
            ? estimatePolygonNormal(guidePathPoints)
            : estimatePolylineNormal3D(guidePathPoints)
    }

    const brushPolyline2D = buildProfile2DAdaptiveWithNormal(
        guidePoints,
        guidePointNormals,
        {
            shapeScale,
            minSegments: minProfileSegments,
            maxSegments: maxProfileSegments,
        }
    )

    return sweepWithPlaneNormal(
        brushPolyline2D,
        guidePathPoints,
        pathPlaneNormal,
        guidePathPointNormals,
        { closedPath, minPathSamples, maxPathSamples }
    )
}
