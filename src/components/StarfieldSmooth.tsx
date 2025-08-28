import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface StarfieldSmoothProps {
    count?: number;
    opacity?: number;
}

const StarfieldSmooth = ({ count = 10000, opacity = 0.9 }: StarfieldSmoothProps) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    // Create positions and scales for each star
    const { positions, scales, colors } = useMemo(() => {
        const positions: THREE.Vector3[] = [];
        const scales: number[] = [];
        const colors: THREE.Color[] = [];

        for (let i = 0; i < count; i++) {
            // Random position in a sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 15 + Math.random() * 50; // Stars between 15-65 units away

            positions.push(new THREE.Vector3(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
            ));

            // Random scale for variety
            scales.push(0.01 + Math.random() * 0.02);

            // Slight color variation
            const brightness = 0.5 + Math.random() * 0.5;
            colors.push(new THREE.Color(
                brightness,
                brightness,
                brightness + Math.random() * 0.1 // Slight blue tint
            ));
        }

        return { positions, scales, colors };
    }, [count]);

    // Set up instanced mesh
    useMemo(() => {
        if (!meshRef.current) return;

        const matrix = new THREE.Matrix4();

        for (let i = 0; i < count; i++) {
            matrix.makeScale(scales[i], scales[i], scales[i]);
            matrix.setPosition(positions[i]);
            meshRef.current.setMatrixAt(i, matrix);
            meshRef.current.setColorAt(i, colors[i]);
        }

        if (meshRef.current.instanceMatrix) {
            meshRef.current.instanceMatrix.needsUpdate = true;
        }
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true;
        }
    }, [count, positions, scales, colors]);

    // Custom shader material for glowing stars
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                opacity: { value: opacity }
            },
            vertexShader: `
                varying vec3 vColor;
                
                void main() {
                    vColor = instanceColor;
                    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float opacity;
                varying vec3 vColor;
                
                void main() {
                    // Create soft circular gradient
                    vec2 center = gl_PointCoord - 0.5;
                    float dist = length(center);
                    
                    // Soft falloff
                    float strength = 1.0 - dist * 2.0;
                    strength = max(0.0, strength);
                    strength = pow(strength, 3.0);
                    
                    gl_FragColor = vec4(vColor, strength * opacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }, [opacity]);

    // Rotate the starfield slowly
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.0005;
            meshRef.current.rotation.x = state.clock.elapsedTime * 0.0002;
        }
    });

    return (
        <instancedMesh
            ref={meshRef}
            args={[undefined, undefined, count]}
            material={material}
        >
            <sphereGeometry args={[1, 8, 8]} />
        </instancedMesh>
    );
};

export default StarfieldSmooth;