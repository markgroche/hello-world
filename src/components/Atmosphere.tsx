import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BackSide } from "three";

interface AtmosphereProps {
  earthRadius?: number;
  atmosphereColor?: string;
  atmosphereOpacity?: number;
  atmosphereIntensity?: number;
}

export const Atmosphere = ({
  earthRadius = 1,
  atmosphereColor = "#3388ff",
  atmosphereOpacity = 0.6,
  atmosphereIntensity = 1.5
}: AtmosphereProps) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Custom shader for atmospheric glow
  const atmosphereShader = {
    uniforms: {
      color: { value: new THREE.Color(atmosphereColor) },
      opacity: { value: atmosphereOpacity },
      intensity: { value: atmosphereIntensity },
      viewVector: { value: new THREE.Vector3() }
    },
    vertexShader: `
      uniform vec3 viewVector;
      varying float vNormalDotView;
      varying vec3 vNormal;
      
      void main() {
        // Get normal in view space
        vNormal = normalize(normalMatrix * normal);
        
        // Calculate position
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        
        // Calculate dot product for fresnel effect
        vec3 viewDir = normalize(viewVector - mvPosition.xyz);
        vNormalDotView = dot(normalize(normal), viewDir);
        
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float opacity;
      uniform float intensity;
      varying float vNormalDotView;
      varying vec3 vNormal;
      
      void main() {
        // Fresnel effect - glow stronger at edges
        float fresnelTerm = 1.0 - abs(vNormalDotView);
        fresnelTerm = pow(fresnelTerm, 3.0); // Adjust falloff
        
        // Add inner glow effect
        float innerGlow = 1.0 - fresnelTerm;
        innerGlow = pow(innerGlow, 4.0) * 0.5;
        
        // Atmospheric scattering simulation
        // Blue scatters more, creating the blue atmosphere with slight orange at horizons
        vec3 scatterColor = color;
        float scatterAmount = pow(fresnelTerm, 2.0);
        scatterColor.r += scatterAmount * 0.1; // Slight red/orange at edges
        scatterColor.g += scatterAmount * 0.05;
        
        // Combine effects
        float finalIntensity = (fresnelTerm * intensity) + innerGlow;
        
        // Apply color and opacity
        vec3 finalColor = scatterColor * finalIntensity;
        float finalOpacity = opacity * finalIntensity;
        
        gl_FragColor = vec4(finalColor, finalOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: BackSide
  };
  
  // Update view vector for proper fresnel calculation
  useFrame(({ camera }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.viewVector.value.copy(camera.position);
    }
  });
  
  return (
    <>
      {/* Inner atmosphere layer */}
      <mesh scale={[1.08, 1.08, 1.08]}>
        <sphereGeometry args={[earthRadius, 64, 64]} />
        <shaderMaterial
          ref={materialRef}
          attach="material"
          args={[atmosphereShader]}
        />
      </mesh>
      
      {/* Outer atmosphere layer for extra glow */}
      <mesh scale={[1.2, 1.2, 1.2]}>
        <sphereGeometry args={[earthRadius, 32, 32]} />
        <shaderMaterial
          attach="material"
          args={[{
            ...atmosphereShader,
            uniforms: {
              ...atmosphereShader.uniforms,
              opacity: { value: atmosphereOpacity * 0.3 },
              intensity: { value: atmosphereIntensity * 0.5 }
            }
          }]}
        />
      </mesh>
    </>
  );
};