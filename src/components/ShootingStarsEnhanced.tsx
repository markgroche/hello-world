import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ShootingStarEnhancedProps {
  count?: number;
  speed?: number;
  opacity?: number;
  length?: number;
  color?: string;
}

interface StarData {
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  progress: number;
  speed: number;
  delay: number;
  active: boolean;
}

export const ShootingStarsEnhanced = ({ 
  count = 20, 
  speed = 1,
  opacity = 0.8,
  length = 5,
  color = "#ffffff"
}: ShootingStarEnhancedProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const starsRef = useRef<StarData[]>([]);
  
  // Initialize star data
  useEffect(() => {
    starsRef.current = Array.from({ length: count }, () => ({
      startPos: new THREE.Vector3(),
      endPos: new THREE.Vector3(),
      progress: 0,
      speed: 0.3 + Math.random() * 0.7,
      delay: Math.random() * 10, // Random start delay
      active: false
    }));
  }, [count]);
  
  // Create geometry for trail effect
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * length * 3);
    const alphas = new Float32Array(count * length);
    const sizes = new Float32Array(count * length);
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geo;
  }, [count, length]);
  
  // Shader material for shooting stars
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        opacity: { value: opacity }
      },
      vertexShader: `
        attribute float alpha;
        attribute float size;
        
        varying float vAlpha;
        
        void main() {
          vAlpha = alpha;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = size * (300.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        
        varying float vAlpha;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          // Soft glow
          float strength = 1.0 - dist * 2.0;
          strength = clamp(strength, 0.0, 1.0);
          
          // Add extra glow
          float glow = exp(-dist * dist * 8.0);
          
          vec3 finalColor = color + vec3(0.2) * glow; // Brighter center
          
          gl_FragColor = vec4(finalColor, (strength + glow) * vAlpha * opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, [color, opacity]);
  
  // Generate random position on sphere surface
  const getRandomSpherePoint = (radius: number) => {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    );
  };
  
  // Animation
  useFrame((state, delta) => {
    if (!groupRef.current || !geometry.attributes.position) return;
    
    const positions = geometry.attributes.position.array as Float32Array;
    const alphas = geometry.attributes.alpha.array as Float32Array;
    const sizes = geometry.attributes.size.array as Float32Array;
    const time = state.clock.elapsedTime;
    
    starsRef.current.forEach((star, starIndex) => {
      // Check if star should start
      if (!star.active && time > star.delay) {
        star.active = true;
        star.progress = 0;
        
        // Generate new trajectory
        const radius = 20 + Math.random() * 40;
        star.startPos = getRandomSpherePoint(radius);
        
        // End position is in a different direction
        const direction = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize();
        
        star.endPos = star.startPos.clone().add(direction.multiplyScalar(30 + Math.random() * 50));
      }
      
      if (star.active) {
        // Update progress
        star.progress += delta * star.speed * speed;
        
        // Reset when complete
        if (star.progress > 1) {
          star.active = false;
          star.delay = time + Math.random() * 5; // Wait before next appearance
          star.progress = 0;
        }
        
        // Create trail
        for (let i = 0; i < length; i++) {
          const trailIndex = starIndex * length + i;
          const trailProgress = star.progress - (i / length) * 0.1;
          
          if (trailProgress > 0 && trailProgress < 1) {
            // Interpolate position
            const pos = new THREE.Vector3().lerpVectors(
              star.startPos,
              star.endPos,
              trailProgress
            );
            
            positions[trailIndex * 3] = pos.x;
            positions[trailIndex * 3 + 1] = pos.y;
            positions[trailIndex * 3 + 2] = pos.z;
            
            // Fade out trail
            const fade = 1 - (i / length);
            const progressFade = Math.sin(trailProgress * Math.PI);
            alphas[trailIndex] = fade * progressFade;
            
            // Size varies along trail
            sizes[trailIndex] = (1 - i / length) * 3;
          } else {
            // Hide this point
            alphas[trailIndex] = 0;
            sizes[trailIndex] = 0;
          }
        }
      } else {
        // Hide all points for inactive star
        for (let i = 0; i < length; i++) {
          const trailIndex = starIndex * length + i;
          alphas[trailIndex] = 0;
          sizes[trailIndex] = 0;
        }
      }
    });
    
    // Update attributes
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.alpha.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
  });
  
  return (
    <group ref={groupRef}>
      <points geometry={geometry} material={material} />
    </group>
  );
};