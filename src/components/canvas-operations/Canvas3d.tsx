import { useEffect, useRef, useState, type ComponentRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber'
import {
    OrbitControls,
    PerspectiveCamera,
    OrthographicCamera,
    Stats,
} from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

extend(THREE as unknown as Parameters<typeof extend>[0])

import { canvasViewStore } from '../../hooks/useCanvasViewStore'
import { canvasRenderStore } from '../../hooks/useRenderSceneStore'
import { themeStore } from '../../hooks/useThemeStore'
import { AXIS, SCENE } from '../../config/theme'

import CanvasOperations from './CanvasOperations'

type OrbitControlsRef = ComponentRef<typeof OrbitControls>

/** The stats panel's own size, which the wrapper must match to centre it. */
const STATS_WIDTH = 80
const STATS_HEIGHT = 48

/** The R3F canvas: camera, lights, grids, post-processing and the tool layer. */
const Canvas3d = () => {
    const statsParent = useRef<HTMLDivElement>(null)

    const {
        orbitalLock,
        isOrthographic,
        cameraFov,
        gridPlaneX,
        gridPlaneY,
        gridPlaneZ,
    } = canvasViewStore((state) => state)

    const {
        lightIntensity,
        canvasBackgroundColor,
        postProcess,
        sequentialLoading,
        setSequentialLoading,
    } = canvasRenderStore((state) => state)

    const { resolved } = themeStore((state) => state)
    const palette = SCENE[resolved]

    const [snaping, setSnaping] = useState(false)

    const orbitControlsRef = useRef<OrbitControlsRef>(null)

    function SnapCameraPositionAndRotation() {
        const { camera } = useThree()
        const target = new THREE.Vector3(0, 0, 0)

        const camToTarget = new THREE.Vector3()
        camToTarget.subVectors(camera.position, target)

        const zoomDist = camToTarget.length()
        const direction = camToTarget.clone().normalize()

        const absDir = {
            x: Math.abs(direction.x),
            y: Math.abs(direction.y),
            z: Math.abs(direction.z),
        }

        const snapPosition = new THREE.Vector3()

        if (absDir.x > absDir.y && absDir.x > absDir.z) {
            snapPosition.set(direction.x > 0 ? 1 : -1, 0, 0)
        } else if (absDir.y > absDir.x && absDir.y > absDir.z) {
            snapPosition.set(0, direction.y > 0 ? 1 : -1, 0)
        } else {
            snapPosition.set(0, 0, direction.z > 0 ? 1 : -1)
        }

        snapPosition.multiplyScalar(zoomDist)

        camera.position.copy(target).add(snapPosition)

        if (orbitControlsRef.current) {
            orbitControlsRef.current.target.copy(target)
            orbitControlsRef.current.update()
        }

        setSnaping(false)

        return null
    }

    function SmoothFOV() {
        const { camera } = useThree()
        const fovRef = useRef(
            camera instanceof THREE.PerspectiveCamera ? camera.fov : cameraFov
        )

        useFrame(() => {
            if (!(camera instanceof THREE.PerspectiveCamera)) return
            fovRef.current += (cameraFov - fovRef.current) * 0.9
            camera.fov = fovRef.current
            camera.updateProjectionMatrix()
        })

        return null
    }

    function SceneComposer() {
        const { camera, gl } = useThree()
        const [ready, setReady] = useState(false)

        useFrame(() => {
            if (!ready) setReady(true)
        })

        useEffect(() => {
            camera.layers.enable(1)
            gl.autoClear = false
        }, [camera, gl])

        if (!ready) return null

        return (
            <EffectComposer multisampling={8} autoClear={false}>
                <Bloom mipmapBlur intensity={1.5} luminanceThreshold={0.01} />
            </EffectComposer>
        )
    }

    function SequentialLoader({ onComplete }: { onComplete: () => void }) {
        const { scene } = useThree()

        useEffect(() => {
            const sampleObjects: THREE.Object3D[] = []

            scene.traverse((child) => {
                child.visible = false
                sampleObjects.push(child)
            })

            const showSequentially = async () => {
                for (const obj of sampleObjects) {
                    await new Promise((resolve) => setTimeout(resolve, 100))
                    obj.visible = true
                }
                onComplete()
            }

            void showSequentially()
        }, [scene, onComplete])

        return null
    }

    return (
        <>
            {/*
             * stats.js positions its panel with an inline fixed position that
             * no class can override. A wrapper carrying a transform becomes
             * the containing block for fixed children, so the panel lands here
             * rather than in the viewport corner. The wrapper needs a real
             * size, or the centring translate has nothing to work from.
             */}
            {import.meta.env.DEV && (
                <div
                    ref={statsParent}
                    className="fixed bottom-[12px] left-1/2 z-10 -translate-x-1/2"
                    style={{ width: STATS_WIDTH, height: STATS_HEIGHT }}
                />
            )}

            <Canvas
                className="cursor-[var(--cursor-draw)]"
                style={{ backgroundColor: canvasBackgroundColor }}
                camera={{ position: [20, 20, 20] }}
                shadows={{ type: THREE.PCFSoftShadowMap, enabled: true }}
                onDoubleClick={() => setSnaping(true)}
                dpr={[1, 2]}
            >
                <directionalLight
                    color={0xffffff}
                    intensity={Math.max(lightIntensity, 0)}
                    castShadow={true}
                    position={[150, 150, -150]}
                    shadow-camera-top={250}
                    shadow-camera-bottom={-250}
                    shadow-camera-left={250}
                    shadow-camera-right={-250}
                    shadow-bias={-0.01}
                    shadow-normalBias={0.1}
                    shadow-camera-near={0.1}
                    shadow-camera-far={400}
                    shadow-mapSize-width={1024}
                    shadow-mapSize-height={1024}
                />

                {isOrthographic ? (
                    <OrthographicCamera
                        makeDefault
                        position={[20, 20, 20]}
                        zoom={50}
                    />
                ) : (
                    <PerspectiveCamera fov={cameraFov} />
                )}

                {snaping && <SnapCameraPositionAndRotation />}

                {(gridPlaneX || gridPlaneY || gridPlaneZ) && (
                    <group>
                        {gridPlaneX && (
                            <gridHelper
                                scale={1}
                                rotation={[0, 0, 0]}
                                args={[50, 50, AXIS.x, palette.grid]}
                            />
                        )}

                        {gridPlaneY && (
                            <gridHelper
                                rotation={[Math.PI / 2, 0, 0]}
                                args={[50, 50, AXIS.y, palette.grid]}
                            />
                        )}

                        {gridPlaneZ && (
                            <gridHelper
                                rotation={[0, 0, Math.PI / 2]}
                                args={[50, 50, AXIS.z, palette.grid]}
                            />
                        )}
                    </group>
                )}

                <ambientLight
                    intensity={palette.ambientIntensity}
                    color={palette.ambient}
                />

                <SmoothFOV />

                <OrbitControls
                    ref={orbitControlsRef}
                    minDistance={20}
                    maxDistance={150}
                    enabled={true}
                    enableRotate={!orbitalLock}
                    enablePan={!orbitalLock}
                    enableZoom={true}
                    enableDamping={false}
                    maxZoom={200}
                    minZoom={10}
                />

                <CanvasOperations />

                {sequentialLoading && (
                    <SequentialLoader
                        onComplete={() => setSequentialLoading(false)}
                    />
                )}

                {postProcess && <SceneComposer />}

                {/*
                 * The cast covers a stale type in drei: its `parent` is
                 * declared non-nullable, but React 19 types every ref
                 * initialised to null as nullable.
                 */}
                {import.meta.env.DEV && (
                    <Stats
                        parent={statsParent as React.RefObject<HTMLElement>}
                    />
                )}
            </Canvas>
        </>
    )
}

export default Canvas3d
