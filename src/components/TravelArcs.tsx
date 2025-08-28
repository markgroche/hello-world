import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CatmullRomCurve3, Vector3 } from "three";

interface Location {
  lat: number;
  lng: number;
  name: string;
  color?: string;
}

interface TravelArcsProps {
  locations: Location[];
  connections?: [number, number][];
  earthRadius?: number;
  arcHeight?: number;
  arcColor?: string;
  arcOpacity?: number;
  arcThickness?: number;
  animationDuration?: number;
}

// Convert lat/lng to 3D position (matches LocationMarkers exactly)
const latLngToVector3 = (lat: number, lng: number, radius: number): Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  // Add small offset to account for marker height
  const position = new Vector3(x, y, z);
  position.normalize().multiplyScalar(radius + 0.005); // Match marker position offset

  return position;
};

// Create a curved arc between two points
const createArcCurve = (
  startPos: Vector3,
  endPos: Vector3,
  arcHeight: number
): CatmullRomCurve3 => {
  const distance = startPos.distanceTo(endPos);

  // Create control points for smoother curve
  const mid1 = new Vector3().lerpVectors(startPos, endPos, 0.25);
  const mid2 = new Vector3().lerpVectors(startPos, endPos, 0.75);

  // Calculate height based on distance
  const height = arcHeight * Math.min(distance / 2, 1);

  // Lift the middle control points
  const radius = startPos.length();
  mid1.normalize().multiplyScalar(radius + height);
  mid2.normalize().multiplyScalar(radius + height);

  // Create curve with four control points for smoother arc
  const curve = new CatmullRomCurve3([startPos, mid1, mid2, endPos]);

  return curve;
};

export const TravelArcs = ({
  locations,
  earthRadius = 1,
  arcHeight = 0.2,
  arcColor = "#00ff88",
  arcOpacity = 0.6,
  arcThickness = 0.004,
  animationDuration = 3
}: TravelArcsProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const animationStartTime = useRef<number>(0);

  // State for current arc
  const [currentArc, setCurrentArc] = useState<{ fromIdx: number, toIdx: number }>(() => {
    if (locations.length < 2) return { fromIdx: 0, toIdx: 0 };
    const fromIdx = 0;
    const toIdx = Math.floor(Math.random() * (locations.length - 1)) + 1;
    return { fromIdx, toIdx };
  });

  // Create the current arc curve
  const arcCurve = useMemo(() => {
    if (locations.length < 2) return null;

    const fromLoc = locations[currentArc.fromIdx];
    const toLoc = locations[currentArc.toIdx];

    if (!fromLoc || !toLoc) return null;

    const startPos = latLngToVector3(fromLoc.lat, fromLoc.lng, earthRadius);
    const endPos = latLngToVector3(toLoc.lat, toLoc.lng, earthRadius);

    return createArcCurve(startPos, endPos, arcHeight);
  }, [locations, currentArc, earthRadius, arcHeight]);

  // Create animated shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(arcColor) },
        opacity: { value: arcOpacity },
        duration: { value: animationDuration }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        uniform float opacity;
        uniform float duration;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          // Create animated gradient along the arc
          float progress = time / duration;
          
          // Use vUv.x for progression along the tube length
          float arcProgress = vUv.x;
          
          // Create a bright moving pulse
          float pulseWidth = 0.15;
          float pulseCenter = progress;
          float distance = abs(arcProgress - pulseCenter);
          float pulse = 1.0 - smoothstep(0.0, pulseWidth, distance);
          
          // Add a fading trail behind the pulse
          float trail = smoothstep(0.0, pulseCenter, arcProgress) * 0.4;
          trail *= 1.0 - smoothstep(pulseCenter - 0.2, pulseCenter, arcProgress);
          
          // Combine pulse and trail
          float intensity = max(pulse * 2.0, trail);
          
          // Add glow effect based on distance from tube center
          float glow = 1.0 - smoothstep(0.0, 0.5, abs(vUv.y - 0.5));
          
          float alpha = intensity * opacity * glow;
          
          // Make the pulse brighter
          vec3 finalColor = mix(color, vec3(1.0), pulse * 0.5);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }, [arcColor, arcOpacity, animationDuration]);

  // Animate the arc and handle transitions
  useFrame((state) => {
    if (materialRef.current) {
      const elapsed = state.clock.getElapsedTime();

      // If this is a new animation, record the start time
      if (animationStartTime.current === 0) {
        animationStartTime.current = elapsed;
      }

      // Calculate progress of current animation
      const animationProgress = (elapsed - animationStartTime.current) / animationDuration;

      // Update shader time
      materialRef.current.uniforms.time.value = elapsed - animationStartTime.current;

      // When animation completes, pick a new destination
      if (animationProgress >= 1.0) {
        // Reset animation start time
        animationStartTime.current = elapsed;

        // Pick a new random destination (different from current)
        setCurrentArc(prev => {
          const currentToIdx = prev.toIdx;
          let newToIdx;

          do {
            newToIdx = Math.floor(Math.random() * locations.length);
          } while (newToIdx === currentToIdx);

          return {
            fromIdx: currentToIdx,  // Start from where we ended
            toIdx: newToIdx
          };
        });
      }
    }
  });

  // Don't render if no valid curve
  if (!arcCurve || locations.length < 2) return null;

  return (
    <mesh ref={meshRef} renderOrder={4}>
      <tubeGeometry args={[arcCurve, 50, arcThickness, 8, false]} />
      <primitive object={material} ref={materialRef} />
    </mesh>
  );
};