import {
  Component,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, Bounds, Edges, OrbitControls, useBounds } from '@react-three/drei'
import * as THREE from 'three'
import {
  getObjectPlacement,
  getShapeDimensions,
  PERSON_HEIGHT_METERS,
  type SimulationShape,
} from '../../lib/scaleVisualization'

type ScaleVisualizerProps = {
  shape: SimulationShape
  sizeCm: number
  color: string
  showLabels: boolean
}

type SegmentProps = {
  start: [number, number, number]
  end: [number, number, number]
  radius: number
  color: string
}

function Segment({ start, end, radius, color }: SegmentProps) {
  const transform = useMemo(() => {
    const from = new THREE.Vector3(...start)
    const to = new THREE.Vector3(...end)
    const direction = to.clone().sub(from)
    const midpoint = from.clone().add(to).multiplyScalar(0.5)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    )
    return { length: direction.length(), midpoint, quaternion }
  }, [end, start])

  return (
    <mesh position={transform.midpoint} quaternion={transform.quaternion} castShadow>
      <cylinderGeometry args={[radius, radius * 1.06, transform.length, 7]} />
      <meshStandardMaterial color={color} roughness={0.78} />
    </mesh>
  )
}

function Mannequin({
  objectPosition,
  objectWidth,
  held,
}: {
  objectPosition: [number, number, number]
  objectWidth: number
  held: boolean
}) {
  const personScale = PERSON_HEIGHT_METERS / 1.75
  const bodyColor = '#B5B8CA'
  const jointColor = '#D7D9E4'
  const shoulders: [[number, number, number], [number, number, number]] = [
    [-0.245, 1.39, 0],
    [0.245, 1.39, 0],
  ]
  const localObjectPosition = objectPosition.map((value) => value / personScale) as [
    number,
    number,
    number,
  ]
  const handRadius = 0.045
  const handOffset = objectWidth / (2 * personScale) + handRadius
  const elbows: [[number, number, number], [number, number, number]] = held
    ? [
        [-0.37, 1.18, 0.08],
        [0.37, 1.18, 0.08],
      ]
    : [
        [-0.3, 1.08, 0.01],
        [0.3, 1.08, 0.01],
      ]
  const hands: [[number, number, number], [number, number, number]] = held
    ? [
        [-handOffset, localObjectPosition[1], localObjectPosition[2]],
        [handOffset, localObjectPosition[1], localObjectPosition[2]],
      ]
    : [
        [-0.28, 0.82, 0.02],
        [0.28, 0.82, 0.02],
      ]

  return (
    <group scale={personScale}>
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.13, 12, 9]} />
        <meshStandardMaterial color={jointColor} roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.47, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.06, 0.11, 7]} />
        <meshStandardMaterial color={jointColor} roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.22, 0]} castShadow>
        <boxGeometry args={[0.42, 0.48, 0.22]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.91, 0]} castShadow>
        <boxGeometry args={[0.34, 0.18, 0.21]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>

      <Segment start={[-0.11, 0.84, 0]} end={[-0.12, 0.48, 0.01]} radius={0.07} color={bodyColor} />
      <Segment
        start={[-0.12, 0.48, 0.01]}
        end={[-0.12, 0.09, 0.015]}
        radius={0.06}
        color={bodyColor}
      />
      <Segment start={[0.11, 0.84, 0]} end={[0.12, 0.48, 0.01]} radius={0.07} color={bodyColor} />
      <Segment
        start={[0.12, 0.48, 0.01]}
        end={[0.12, 0.09, 0.015]}
        radius={0.06}
        color={bodyColor}
      />
      <mesh position={[-0.12, 0.035, 0.055]} castShadow>
        <boxGeometry args={[0.13, 0.07, 0.25]} />
        <meshStandardMaterial color={jointColor} roughness={0.82} />
      </mesh>
      <mesh position={[0.12, 0.035, 0.055]} castShadow>
        <boxGeometry args={[0.13, 0.07, 0.25]} />
        <meshStandardMaterial color={jointColor} roughness={0.82} />
      </mesh>

      {shoulders.map((shoulder, index) => (
        <group key={index}>
          <Segment start={shoulder} end={elbows[index]} radius={0.052} color={bodyColor} />
          <Segment start={elbows[index]} end={hands[index]} radius={0.045} color={bodyColor} />
          <mesh position={hands[index]} castShadow>
            <sphereGeometry args={[handRadius, 10, 7]} />
            <meshStandardMaterial color={jointColor} roughness={0.82} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function ObjectMesh({ shape, sizeCm, color }: ScaleVisualizerProps) {
  const dimensions = getShapeDimensions(shape, sizeCm)
  const placement = getObjectPlacement(shape, sizeCm)
  const position = placement.position
  const material = <meshStandardMaterial color={color} roughness={0.54} metalness={0.04} />

  return (
    <>
      <Mannequin
        objectPosition={position}
        objectWidth={dimensions.width}
        held={placement.mode === 'held'}
      />
      <mesh
        position={position}
        rotation={shape === 'disc' ? [Math.PI / 2, 0, 0] : undefined}
        castShadow
        receiveShadow
      >
        {shape === 'sphere' ? (
          <sphereGeometry args={[dimensions.width / 2, 24, 18]} />
        ) : shape === 'disc' ? (
          <cylinderGeometry
            args={[dimensions.width / 2, dimensions.width / 2, dimensions.depth, 32]}
          />
        ) : (
          <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
        )}
        {material}
        <Edges color="#FFFFFF" threshold={12} transparent opacity={0.58} />
      </mesh>
    </>
  )
}

function RefitBounds({
  shape,
  sizeCm,
  children,
}: {
  shape: SimulationShape
  sizeCm: number
  children: ReactNode
}) {
  const bounds = useBounds()
  useLayoutEffect(() => {
    bounds.refresh().clip().fit()
  }, [bounds, shape, sizeCm])
  return children
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

function ViewerFallback() {
  return (
    <div className="simulation-canvas-fallback" role="status">
      A visualização 3D não está disponível neste dispositivo. Os cálculos continuam funcionando.
    </div>
  )
}

class ViewerErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The numeric simulator remains available when WebGL initialization fails.
  }

  render() {
    return this.state.failed ? <ViewerFallback /> : this.props.children
  }
}

export default function ScaleVisualizer(props: ScaleVisualizerProps) {
  const reducedMotion = useReducedMotion()
  const placement = getObjectPlacement(props.shape, props.sizeCm)
  const description =
    placement.mode === 'held'
      ? `Pessoa de 170 centímetros segurando um objeto de ${props.sizeCm.toFixed(2)} centímetros.`
      : `Pessoa de 170 centímetros ao lado de um objeto de ${props.sizeCm.toFixed(2)} centímetros.`

  return (
    <figure className="simulation-canvas-figure">
      {props.showLabels && (
        <div className="simulation-scene-measures" aria-hidden="true">
          <span className="simulation-scene-measure simulation-scene-measure-object">
            Objeto · {props.sizeCm.toFixed(2)} cm
          </span>
          <span className="simulation-scene-measure simulation-scene-measure-person">
            Pessoa · 170 cm
          </span>
        </div>
      )}
      <ViewerErrorBoundary>
        <Canvas
          className="simulation-canvas"
          camera={{ position: [2.5, 1.35, 4.2], fov: 35, near: 0.01, far: 100 }}
          dpr={[1, 1.5]}
          frameloop="demand"
          performance={{ min: 0.5 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          fallback={<ViewerFallback />}
        >
          <color attach="background" args={['#111522']} />
          <hemisphereLight args={['#F4F3FA', '#171A27', 1.65]} />
          <directionalLight position={[3, 5, 4]} intensity={2.1} />
          <Bounds fit clip observe margin={1.28} maxDuration={reducedMotion ? 0 : 0.55}>
            <RefitBounds shape={props.shape} sizeCm={props.sizeCm}>
              <group>
                <ObjectMesh {...props} />
              </group>
            </RefitBounds>
          </Bounds>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#171A27" roughness={1} />
          </mesh>
          <OrbitControls
            makeDefault
            enablePan={false}
            enableDamping={!reducedMotion}
            dampingFactor={0.08}
            minDistance={0.35}
            maxDistance={50}
            minPolarAngle={Math.PI * 0.22}
            maxPolarAngle={Math.PI * 0.62}
            minAzimuthAngle={-Math.PI * 0.42}
            maxAzimuthAngle={Math.PI * 0.42}
            regress
          />
          <AdaptiveDpr />
        </Canvas>
      </ViewerErrorBoundary>
      <figcaption className="simulation-scene-description">{description}</figcaption>
    </figure>
  )
}
