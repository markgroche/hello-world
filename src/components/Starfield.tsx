import { useRef, useMemo } from "react";
import { Points, AdditiveBlending } from "three";
import { useFrame } from "@react-three/fiber";
import type { ThreeElements } from "@react-three/fiber";

type StarfieldProps = ThreeElements["points"] & {
    count?: number;
    opacity?: number;
};

const Starfield = ({ count = 5000, opacity = 0.9, ...props }: StarfieldProps) => {
    const ref = useRef<Points>(null);

    const [positions, colors] = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            // Random position in a sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 15 + Math.random() * 50; // Stars between 15-65 units away

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);

            // Slight color variation - brighter base values
            const brightness = 0.7 + Math.random() * 0.3;
            colors[i * 3] = brightness;
            colors[i * 3 + 1] = brightness;
            colors[i * 3 + 2] = Math.min(1.0, brightness + Math.random() * 0.2); // Slight blue tint
        }

        return [positions, colors];
    }, [count]);

    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.y = state.clock.elapsedTime * 0.0005;
            ref.current.rotation.x = state.clock.elapsedTime * 0.0002;
        }
    });

    return (
        <points ref={ref} {...props}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
                <bufferAttribute
                    attach="attributes-color"
                    args={[colors, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.025}
                sizeAttenuation={true}
                vertexColors={true}
                transparent={true}
                opacity={opacity}
                blending={AdditiveBlending}
                depthWrite={false}
                map={null}
            />
        </points>
    );
};

export default Starfield;