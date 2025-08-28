import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Vector3 } from "three";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";

interface Location {
    lat: number;
    lng: number;
    name: string;
    color?: string;
}

type LocationMarkersProps = ThreeElements["group"] & {
    locations: Location[];
    earthRadius?: number;
    markerScale?: number;
};

// Convert lat/lng to 3D coordinates on sphere
function latLngToVector3(lat: number, lng: number, radius: number): Vector3 {
    // Convert to radians
    const latRad = lat * (Math.PI / 180);
    const lngRad = -lng * (Math.PI / 180); // Negative for correct orientation

    // Standard spherical to cartesian conversion
    // Note: Three.js uses Y-up coordinate system
    const x = radius * Math.cos(latRad) * Math.cos(lngRad);
    const y = radius * Math.sin(latRad);
    const z = radius * Math.cos(latRad) * Math.sin(lngRad);

    return new Vector3(x, y, z);
}

const LocationMarkers = ({
    locations,
    earthRadius = 1,
    markerScale = 1,
    ...props
}: LocationMarkersProps) => {
    const ringsRef = useRef<Mesh[]>([]);

    const markers = useMemo(
        () =>
            locations.map((location) => ({
                position: latLngToVector3(
                    location.lat,
                    location.lng,
                    earthRadius + 0.005
                ), // Slightly above surface
                color: location.color || "#00ff88",
                name: location.name,
            })),
        [locations, earthRadius]
    );

    useFrame((state) => {
        // Animate the rings
        ringsRef.current.forEach((ring, i) => {
            if (ring) {
                const time = state.clock.elapsedTime;

                // Expand and fade rings
                const ringScale = 1 + (Math.sin(time * 2 + i) + 1) * 0.3;
                ring.scale.set(ringScale, ringScale, ringScale);

                // Fade opacity based on scale
                if (ring.material && "opacity" in ring.material) {
                    ring.material.opacity = Math.max(0, 1 - (ringScale - 1) / 1.5);
                }
            }
        });
    });

    return (
        <group {...props}>
            {markers.map((marker, index) => {
                // Calculate normal vector for proper orientation
                const normal = marker.position.clone().normalize();
                const up = new Vector3(0, 1, 0);
                const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);

                return (
                    <group key={index} position={marker.position} quaternion={quaternion}>
                        {/* Main marker dot - fixed position */}
                        <mesh>
                            <sphereGeometry args={[0.006 * markerScale, 16, 16]} />
                            <meshPhongMaterial
                                color={marker.color}
                                emissive={marker.color}
                                emissiveIntensity={0.5}
                                transparent
                                opacity={0.9}
                            />
                        </mesh>

                        {/* Glowing core - fixed position */}
                        <mesh>
                            <sphereGeometry args={[0.003 * markerScale, 16, 16]} />
                            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
                        </mesh>

                        {/* Expanding ring */}
                        <mesh
                            ref={(el) => {
                                if (el) ringsRef.current[index] = el;
                            }}
                            rotation={[Math.PI / 2, 0, 0]}
                        >
                            <ringGeometry args={[0.008 * markerScale, 0.012 * markerScale, 32]} />
                            <meshBasicMaterial
                                color={marker.color}
                                transparent
                                opacity={0.6}
                                side={THREE.DoubleSide}
                            />
                        </mesh>

                        {/* Light beam pointing outward */}
                        <mesh position={[0, 0.02 * markerScale, 0]}>
                            <cylinderGeometry args={[0.001 * markerScale, 0.003 * markerScale, 0.04 * markerScale, 8]} />
                            <meshPhongMaterial
                                color={marker.color}
                                emissive={marker.color}
                                emissiveIntensity={0.3}
                                transparent
                                opacity={0.4}
                            />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
};

export default LocationMarkers;