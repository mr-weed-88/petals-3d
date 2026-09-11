import React, { useRef, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { canvasDrawStore } from '../../hooks/useCanvasDrawStore'

import {
    smoothArray,
    smoothPoints,
    filterPoints,
    generateCirclePointsWorld,
    getSnappedLinePointsInPlane,
    generateSemiCircleOpenArcWorld,
} from '../../helpers/drawHelper'

const DynamicGuidePlane = ({ onDrawingFinished }) => {
    const { camera, scene, gl } = useThree()
    const planeRef = useRef()

    const {
        drawGuide,
        drawShapeType,
        strokeOpacity,
        setOgGuidePoints,
        setOgGuideNormals,
        pointerType,
    } = canvasDrawStore((state) => state)

    const MAX_POINTS = 50000
    const SMOOTH_PERCENTAGE = 75
    const DISTANCE_THRESHOLD = 0.01
    const OPTIMIZATION_THRESHOLD = 0.01

    let startPoint = null
    let currentNormal = null
    let isDrawing = false
    let points = []
    let pressures = []
    let normals = []
    let currentMesh = null

    const color = new THREE.Color('#C0C0C0')

    function createContinuousRibbonGeometry(points, width, normal) {
        if (points.length < 2) return null

        const positions = []
        const indices = []
        const uvs = []

        const sideVector = new THREE.Vector3()
        const halfWidth = width / 2

        for (let i = 0; i < points.length; i++) {
            const p = points[i]
            let currentDirection

            if (i === 0) {
                currentDirection = new THREE.Vector3()
                    .subVectors(points[1], p)
                    .normalize()
            } else if (i === points.length - 1) {
                currentDirection = new THREE.Vector3()
                    .subVectors(p, points[i - 1])
                    .normalize()
            } else {
                const prevDirection = new THREE.Vector3()
                    .subVectors(p, points[i - 1])
                    .normalize()
                const nextDirection = new THREE.Vector3()
                    .subVectors(points[i + 1], p)
                    .normalize()
                currentDirection = prevDirection.add(nextDirection).normalize()
            }

            sideVector.copy(normal)

            if (sideVector.lengthSq() < 0.0001) {
                const tempX = new THREE.Vector3(1, 0, 0)
                const tempY = new THREE.Vector3(0, 1, 0)
                const testVec = currentDirection
                    .clone()
                    .cross(tempX)
                    .normalize()
                if (testVec.lengthSq() < 0.0001) {
                    sideVector.crossVectors(currentDirection, tempY).normalize()
                } else {
                    sideVector.copy(testVec)
                }
            }

            const p1 = new THREE.Vector3()
                .copy(p)
                .addScaledVector(sideVector, halfWidth)
            const p2 = new THREE.Vector3()
                .copy(p)
                .addScaledVector(sideVector, -halfWidth)

            positions.push(p1.x, p1.y, p1.z)
            positions.push(p2.x, p2.y, p2.z)

            const uvX = i / (points.length - 1)
            uvs.push(uvX, 1)
            uvs.push(uvX, 0)

            if (i > 0) {
                const prevIndex = (i - 1) * 2
                const currentIndex = i * 2

                indices.push(prevIndex, prevIndex + 1, currentIndex)
                indices.push(prevIndex + 1, currentIndex + 1, currentIndex)
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

    function createInitialLineMesh() {
        const maxVertices = MAX_POINTS * 4
        const positions = new Float32Array(maxVertices * 3)
        const meshNormals = new Float32Array(maxVertices * 3)
        const indices = new Uint32Array(MAX_POINTS * 24)

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(positions, 3)
        )
        geometry.setAttribute(
            'normal',
            new THREE.BufferAttribute(meshNormals, 3)
        )
        geometry.setIndex(new THREE.BufferAttribute(indices, 1))
        geometry.setDrawRange(0, 0)

        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color),
            wireframe: false,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide,
            forceSinglePass: true,
            depthTest: true,
            depthWrite: true,
        })

        const mesh = new THREE.Mesh(geometry, material)
        mesh.userData.type = 'DYNAMIC_GUIDE_LINE'
        scene.add(mesh)
        return mesh
    }

    function updateLine(mesh, rawPts, pressuresArr, normalsArr) {
        if (rawPts.length < 2) return

        const geometry = mesh.geometry

        let pts = rawPts
        let pressures = pressuresArr
        let finalNormals = normalsArr

        if (drawShapeType === 'free_hand') {
            pts = smoothPoints(rawPts, SMOOTH_PERCENTAGE)
            pressures = smoothArray(pressuresArr, SMOOTH_PERCENTAGE)
            const filteredResult = filterPoints(
                pts,
                pressures,
                normalsArr,
                OPTIMIZATION_THRESHOLD
            )
            pts = filteredResult.filteredPts
            pressures = filteredResult.filteredPressures
            finalNormals = filteredResult.filteredNormals
        }

        if (pts.length < 2) return

        const positions = []
        const meshNormals = []
        const indices = []

        const tangents = []
        for (let i = 0; i < pts.length - 1; i++) {
            tangents.push(
                new THREE.Vector3().subVectors(pts[i + 1], pts[i]).normalize()
            )
        }

        if (pts.length === 2 && tangents.length === 0) {
            tangents.push(
                new THREE.Vector3().subVectors(pts[1], pts[0]).normalize()
            )
        }

        const transportedRights = []
        let right = new THREE.Vector3()
            .crossVectors(
                finalNormals[0],
                tangents[0] || new THREE.Vector3(1, 0, 0)
            )
            .normalize()

        if (right.lengthSq() < 1e-6) {
            right.set(0, 1, 0)
            if (tangents.length > 0 && Math.abs(tangents[0].dot(right)) > 0.99)
                right.set(1, 0, 0)
            if (tangents.length > 0)
                right.crossVectors(finalNormals[0], tangents[0]).normalize()
            else
                right
                    .crossVectors(finalNormals[0], new THREE.Vector3(1, 0, 0))
                    .normalize()
        }
        transportedRights.push(right.clone())

        for (let i = 1; i < tangents.length; i++) {
            const prevT = tangents[i - 1]
            const currT = tangents[i]
            const axis = new THREE.Vector3().crossVectors(prevT, currT)
            const angle = Math.acos(Math.max(-1, Math.min(1, prevT.dot(currT))))

            if (axis.lengthSq() < 1e-6 || angle === 0) {
                transportedRights.push(transportedRights[i - 1].clone())
            } else {
                const q = new THREE.Quaternion().setFromAxisAngle(
                    axis.normalize(),
                    angle
                )
                transportedRights.push(
                    transportedRights[i - 1]
                        .clone()
                        .applyQuaternion(q)
                        .normalize()
                )
            }
        }

        for (let i = 0; i < pts.length; i++) {
            const curr = pts[i]
            const tangent =
                i === pts.length - 1
                    ? tangents[i - 1]
                    : tangents[i] || tangents[0]
            const rightVec =
                transportedRights[i] ||
                transportedRights[transportedRights.length - 1]
            const up = new THREE.Vector3()
                .crossVectors(tangent, rightVec)
                .normalize()

            const halfW = 0.025
            const halfH = 0.025

            const tl = new THREE.Vector3()
                .copy(curr)
                .addScaledVector(rightVec, -halfW)
                .addScaledVector(up, halfH)
            const tr = new THREE.Vector3()
                .copy(curr)
                .addScaledVector(rightVec, halfW)
                .addScaledVector(up, halfH)
            const br = new THREE.Vector3()
                .copy(curr)
                .addScaledVector(rightVec, halfW)
                .addScaledVector(up, -halfH)
            const bl = new THREE.Vector3()
                .copy(curr)
                .addScaledVector(rightVec, -halfW)
                .addScaledVector(up, -halfH)

            const normal = finalNormals[i].clone()
            const baseIdx = positions.length / 3

            ;[tl, tr, br, bl].forEach((v) => {
                positions.push(v.x, v.y, v.z)
                meshNormals.push(normal.x, normal.y, normal.z)
            })

            if (i > 0) {
                const prevBase = baseIdx - 4
                indices.push(prevBase, prevBase + 1, baseIdx + 1)
                indices.push(prevBase, baseIdx + 1, baseIdx)
                indices.push(prevBase + 1, prevBase + 2, baseIdx + 2)
                indices.push(prevBase + 1, baseIdx + 2, baseIdx + 1)
                indices.push(prevBase + 2, prevBase + 3, baseIdx + 3)
                indices.push(prevBase + 2, baseIdx + 3, baseIdx + 2)
                indices.push(prevBase + 3, prevBase, baseIdx)
                indices.push(prevBase + 3, baseIdx, baseIdx + 3)
            }
        }

        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(positions, 3)
        )
        geometry.setAttribute(
            'normal',
            new THREE.Float32BufferAttribute(meshNormals, 3)
        )

        geometry.setIndex(indices)

        geometry.attributes.position.needsUpdate = true
        geometry.attributes.normal.needsUpdate = true
        geometry.index.needsUpdate = true
        geometry.setDrawRange(0, indices.length)

        if (mesh.material) {
            mesh.material.color.copy(color)
            mesh.material.opacity = strokeOpacity
            mesh.material.flatShading = true
            mesh.material.needsUpdate = true
        }
    }

    function startDrawing(event) {
        if (event.pointerType === pointerType) {
            if (!planeRef.current) return

            isDrawing = true
            points = []
            pressures = []
            normals = []

            const { point, normal } = getPlaneIntersection(event)
            if (!point) return

            startPoint = point.clone()
            currentNormal = normal.clone()
            currentMesh = createInitialLineMesh()

            const pressure = 1.0

            points.push(startPoint.clone())
            pressures.push(pressure)
            normals.push(currentNormal)

            if (drawShapeType === 'free_hand') {
                const secondPoint = new THREE.Vector3()
                    .copy(startPoint)
                    .addScalar(0.001)
                points.push(secondPoint)
                pressures.push(pressure)
                normals.push(currentNormal)
            }

            updateLine(currentMesh, points, pressures, normals)
        }
    }

    function continueDrawing(event) {
        if (event.pointerType === pointerType) {
            if (!isDrawing || !planeRef.current) return
            const { point, normal } = getPlaneIntersection(event)
            if (!point) return

            const pressure = 1.0

            if (drawShapeType === 'free_hand') {
                let newPoint = point.clone()
                const last = points[points.length - 1]
                if (newPoint.distanceTo(last) < DISTANCE_THRESHOLD) return

                points.push(newPoint)
                pressures.push(pressure)
                normals.push(normal)

                if (points.length > MAX_POINTS) {
                    points.shift()
                    pressures.shift()
                    normals.shift()
                }

                updateLine(currentMesh, points, pressures, normals)
            } else if (drawShapeType === 'straight') {
                if (!startPoint || !currentNormal) return

                const { snappedEnd } = getSnappedLinePointsInPlane({
                    startPoint,
                    currentPoint: point,
                    normal,
                    camera,
                    snapAngle: 1,
                    pointDensity: 0.05,
                })

                points.length = 0
                points.push(startPoint.clone())
                points.push(snappedEnd.clone())

                pressures.length = 0
                pressures.push(pressure)
                pressures.push(pressure)

                normals.length = 0
                normals.push(currentNormal.clone())
                normals.push(normal.clone())

                updateLine(currentMesh, points, pressures, normals)
            } else if (drawShapeType === 'circle') {
                if (!startPoint || !currentNormal) return

                const radius = startPoint.distanceTo(point)
                const pressure = 1.0

                const { circlePoints, circleNormals } =
                    generateCirclePointsWorld(startPoint, currentNormal, radius)
                const circlePressures = Array(circlePoints.length).fill(
                    pressure
                )

                updateLine(
                    currentMesh,
                    circlePoints,
                    circlePressures,
                    circleNormals
                )
            } else if (drawShapeType === 'arc') {
                if (!startPoint || !currentNormal) return

                const radius = startPoint.distanceTo(point)
                const pressure = 1.0

                const { arcPoints, arcNormals } =
                    generateSemiCircleOpenArcWorld(
                        startPoint,
                        currentNormal,
                        radius
                    )
                const arcPressures = Array(arcPoints.length).fill(pressure)

                updateLine(currentMesh, arcPoints, arcPressures, arcNormals)
            }
        }
    }

    function stopDrawing(event) {
        if (!isDrawing || !planeRef.current) return

        if (drawShapeType === 'free_hand' || drawShapeType === 'straight') {
            if (!currentMesh || !startPoint || points.length < 2) {
                if (currentMesh) scene.remove(currentMesh)
                currentMesh = null
                startPoint = null
                return
            }

            let intersection = getPlaneIntersection(event)
            const planeNormal = intersection.normal
            const planeWidth = 100

            setOgGuidePoints(points)
            setOgGuideNormals(normals)

            const ribbonGeometry = createContinuousRibbonGeometry(
                points,
                planeWidth,
                planeNormal
            )

            if (ribbonGeometry) {
                const ribbonMaterial = new THREE.MeshBasicMaterial({
                    color: color,
                    wireframe: false,
                    transparent: true,
                    opacity: 0.25,
                    side: THREE.DoubleSide,
                    forceSinglePass: true,
                    depthTest: true,
                    depthWrite: true,
                })

                const ribbonMesh = new THREE.Mesh(
                    ribbonGeometry,
                    ribbonMaterial
                )

                ribbonMesh.userData.type = 'OG_GUIDE_PLANE'
                scene.add(ribbonMesh)

                scene.remove(currentMesh)
                currentMesh.geometry.dispose()
                currentMesh.material.dispose()

                if (onDrawingFinished && ribbonMesh) {
                    onDrawingFinished(ribbonMesh)
                }
            }
        } else if (drawShapeType === 'circle') {
            const lastPoint =
                getPlaneIntersection(event)?.point || points[points.length - 1]
            const radius = startPoint.distanceTo(lastPoint)

            const { circlePoints, circleNormals } = generateCirclePointsWorld(
                startPoint,
                currentNormal,
                radius
            )

            const finalPressures = Array(circlePoints.length).fill(
                pressures[0] || 1.0
            )

            updateLine(currentMesh, circlePoints, finalPressures, circleNormals)

            let intersection = getPlaneIntersection(event)
            const planeNormal = intersection.normal
            const planeWidth = 100

            setOgGuidePoints(circlePoints)
            setOgGuideNormals(circleNormals)

            const ribbonGeometry = createContinuousRibbonGeometry(
                circlePoints,
                planeWidth,
                planeNormal
            )

            if (ribbonGeometry) {
                const ribbonMaterial = new THREE.MeshBasicMaterial({
                    color: color,
                    wireframe: false,
                    transparent: true,
                    opacity: 0.25,
                    side: THREE.DoubleSide,
                    forceSinglePass: true,
                    depthTest: true,
                    depthWrite: true,
                })

                const ribbonMesh = new THREE.Mesh(
                    ribbonGeometry,
                    ribbonMaterial
                )
                ribbonMesh.userData.type = 'OG_GUIDE_PLANE'
                scene.add(ribbonMesh)

                scene.remove(currentMesh)
                currentMesh.geometry.dispose()
                currentMesh.material.dispose()

                if (onDrawingFinished && ribbonMesh) {
                    onDrawingFinished(ribbonMesh)
                }
            }
        } else if (drawShapeType === 'arc') {
            const lastPoint =
                getPlaneIntersection(event)?.point || points[points.length - 1]
            const radius = startPoint.distanceTo(lastPoint)

            const { arcPoints, arcNormals } = generateSemiCircleOpenArcWorld(
                startPoint,
                currentNormal,
                radius
            )

            const arcPressures = Array(arcPoints.length).fill(
                pressures[0] || 1.0
            )

            updateLine(currentMesh, arcPoints, arcPressures, arcNormals)

            let intersection = getPlaneIntersection(event)
            const planeNormal = intersection.normal
            const planeWidth = 100

            setOgGuidePoints(arcPoints)
            setOgGuideNormals(arcNormals)

            const ribbonGeometry = createContinuousRibbonGeometry(
                arcPoints,
                planeWidth,
                planeNormal
            )

            if (ribbonGeometry) {
                const ribbonMaterial = new THREE.MeshBasicMaterial({
                    color: color,
                    wireframe: false,
                    transparent: true,
                    opacity: 0.25,
                    side: THREE.DoubleSide,
                    forceSinglePass: true,
                    depthTest: true,
                    depthWrite: true,
                })

                const ribbonMesh = new THREE.Mesh(
                    ribbonGeometry,
                    ribbonMaterial
                )
                ribbonMesh.userData.type = 'OG_GUIDE_PLANE'
                scene.add(ribbonMesh)

                scene.remove(currentMesh)
                currentMesh.geometry.dispose()
                currentMesh.material.dispose()

                if (onDrawingFinished && ribbonMesh) {
                    onDrawingFinished(ribbonMesh)
                }
            }
        }

        // setOrbitalLock(false)
        currentMesh = null
        startPoint = null
        currentNormal = null
        isDrawing = false
    }

    const getPlaneIntersection = useCallback(
        (event) => {
            if (!planeRef.current) return null

            const canvas = gl.domElement
            const rect = canvas.getBoundingClientRect()

            const mouse = new THREE.Vector2(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1
            )

            const raycaster = new THREE.Raycaster()
            raycaster.setFromCamera(mouse, camera)

            const intersects = raycaster.intersectObject(planeRef.current)
            if (intersects.length > 0) {
                const intersection = intersects[0]
                const normal = intersection.face.normal
                    .clone()
                    .transformDirection(intersection.object.matrixWorld)
                    .normalize()
                return {
                    point: intersection.point.clone(),
                    normal,
                }
            }
            return null
        },
        [camera, gl]
    )

    const SyncCameraFromMain = ({ planeRef }) => {
        const { camera } = useThree()
        useFrame(() => {
            if (!planeRef.current && drawGuide) return
            planeRef.current.rotation.copy(camera.rotation)
        })
        return null
    }

    return (
        <>
            {drawGuide && <SyncCameraFromMain planeRef={planeRef} />}
            {drawGuide && (
                <mesh
                    ref={planeRef}
                    position={[0, 0, 0]}
                    rotation={[0, 0, 0]}
                    onPointerDown={startDrawing}
                    onPointerMove={continueDrawing}
                    onPointerUp={stopDrawing}
                >
                    <planeGeometry args={[4000, 4000]} />
                    <meshBasicMaterial
                        visible={false}
                        color="#f0f0f0"
                        transparent
                        opacity={0}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}
        </>
    )
}

export default DynamicGuidePlane
