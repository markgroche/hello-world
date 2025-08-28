import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ShootingStarSmoothProps {
  count?: number;
  speed?: number;
  opacity?: number;
  trailLength?: number;
  color?: string;
  thickness?: number;
}

interface StarData {
  curve: THREE.CatmullRomCurve3;
  progress: number;
  speed: number;
  delay: number;
  active: boolean;
  startTime: number;
}

export const ShootingStarsSmooth = ({
  count = 20,
  speed = 1,
  opacity = 0.9,
  trailLength = 0.2,
  color = "#ffffff",
  thickness = 0.02
}: ShootingStarSmoothProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const starsData = useRef<StarData[]>([]);

  // Generate random position on sphere
  const getRandomSpherePoint = (radius: number) => {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    );
  };

  // Initialize star data
  useEffect(() => {
    starsData.current = Array.from({ length: count }, () => {
      const startRadius = 25 + Math.random() * 35;
      const start = getRandomSpherePoint(startRadius);

      // Create a curved path for the shooting star
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const distance = 40 + Math.random() * 40;
      const end = start.clone().add(direction.multiplyScalar(distance));

      // Add control points for smooth curve
      const mid1 = start.clone().lerp(end, 0.3);
      const mid2 = start.clone().lerp(end, 0.7);

      // Slight curve perpendicular to direction
      const perpendicular = new THREE.Vector3().crossVectors(direction, start).normalize();
      const curveAmount = (Math.random() - 0.5) * 10;
      mid1.add(perpendicular.clone().multiplyScalar(curveAmount));
      mid2.add(perpendicular.clone().multiplyScalar(curveAmount * 0.5));

      const curve = new THREE.CatmullRomCurve3([start, mid1, mid2, end]);

      return {
        curve,
        progress: 0,
        speed: 0.5 + Math.random() * 0.5,
        delay: Math.random() * 10,
        active: false,
        startTime: 0
      };
    });
  }, [count]);

  // Create custom shader material for smooth gradient
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        opacity: { value: opacity }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          // Gradient along the trail (x direction) - reversed so head leads
          float gradient = vUv.x;  // Now bright at the end (head)
          float sharpGradient = pow(gradient, 1.5); // Sharper falloff for trail
          float headGlow = pow(gradient, 0.5); // Softer gradient for head glow
          
          // Round edges (y direction)
          float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
          edge = smoothstep(0.0, 1.0, edge);
          
          // Combine effects - use sharp gradient for trail, soft for head
          float alpha = sharpGradient * edge * opacity;
          
          // Extra bright head
          if (vUv.x > 0.8) {
            alpha = min(alpha * 2.0, 1.0) * opacity;
          }
          
          // Bright core with glow at the head
          vec3 coreColor = color * (1.0 + headGlow * 3.0);
          
          // Add blue-white tint to the head
          vec3 headTint = vec3(0.9, 0.95, 1.0);
          vec3 finalColor = mix(color, coreColor * headTint, headGlow);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }, [color, opacity]);

  // Create tube geometry for each shooting star
  const geometries = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const star = starsData.current[i];
      if (!star) return null;

      // Create a tube that will be updated each frame
      const tubeGeometry = new THREE.TubeGeometry(
        star.curve,
        32, // tube segments
        thickness, // tube radius
        8, // radial segments (more = rounder)
        false // closed
      );

      return tubeGeometry;
    });
  }, [count, thickness]);

  // Animation
  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;

    starsData.current.forEach((star, index) => {
      const mesh = meshRefs.current[index];
      if (!mesh) return;

      // Check if star should start
      if (!star.active && time > star.delay) {
        star.active = true;
        star.startTime = time;
        star.progress = 0;

        // Generate new path
        const startRadius = 25 + Math.random() * 35;
        const start = getRandomSpherePoint(startRadius);

        const direction = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize();

        const distance = 40 + Math.random() * 40;
        const end = start.clone().add(direction.multiplyScalar(distance));

        const mid1 = start.clone().lerp(end, 0.3);
        const mid2 = start.clone().lerp(end, 0.7);

        const perpendicular = new THREE.Vector3().crossVectors(direction, start).normalize();
        const curveAmount = (Math.random() - 0.5) * 10;
        mid1.add(perpendicular.clone().multiplyScalar(curveAmount));
        mid2.add(perpendicular.clone().multiplyScalar(curveAmount * 0.5));

        star.curve = new THREE.CatmullRomCurve3([start, mid1, mid2, end]);
      }

      if (star.active) {
        // Update progress
        const elapsed = time - star.startTime;
        star.progress = (elapsed * star.speed * speed) / 5; // Faster movement

        if (star.progress > 1 + trailLength) {
          // Reset
          star.active = false;
          star.delay = time + 1 + Math.random() * 5; // More frequent shooting stars
          mesh.visible = false;
        } else {
          mesh.visible = true;

          // Create visible portion of the trail
          const startT = Math.max(0, star.progress - trailLength);
          const endT = Math.min(1, star.progress);

          if (endT > startT) {
            // Get points for visible portion
            const points: THREE.Vector3[] = [];
            const segments = 16;

            for (let i = 0; i <= segments; i++) {
              const t = startT + (endT - startT) * (i / segments);
              points.push(star.curve.getPoint(t));
            }

            // Create new curve for visible portion
            const visibleCurve = new THREE.CatmullRomCurve3(points);

            // Update tube geometry
            // Taper from tail to head (make head thicker)
            const taper = 0.3 + (endT * 0.7); // Head is thicker
            const newGeometry = new THREE.TubeGeometry(
              visibleCurve,
              segments,
              thickness * taper,
              8,
              false
            );

            // Dispose old geometry and apply new
            if (mesh.geometry) {
              mesh.geometry.dispose();
            }
            mesh.geometry = newGeometry;
          }
        }
      } else {
        mesh.visible = false;
      }
    });
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Dispose all geometries on unmount
      geometries.forEach(geo => {
        if (geo) geo.dispose();
      });
      if (material) material.dispose();
    };
  }, [geometries, material]);

  return (
    <group ref={groupRef}>
      {geometries.map((geometry, index) => (
        geometry && (
          <mesh
            key={index}
            ref={(el) => { meshRefs.current[index] = el; }}
            geometry={geometry}
            material={material}
            visible={false}
          />
        )
      ))}
    </group>
  );
};