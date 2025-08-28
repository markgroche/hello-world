import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useControls, Leva } from "leva";
import { Suspense, useMemo, useRef } from "react";
import { Group } from "three";
import { useFrame } from "@react-three/fiber";

import "./App.css";
import Earth from "./components/Earth";
import Starfield from "./components/Starfield";
import LocationMarkers from "./components/LocationMarkers";
import { TravelArcs } from "./components/TravelArcs";
import { Atmosphere } from "./components/Atmosphere";
import { ShootingStarsSmooth } from "./components/ShootingStarsSmooth";
// LocationManager intentionally removed

interface Location {
  lat: number;
  lng: number;
  name: string;
  color?: string;
}

const defaultLocations: Location[] = [
  { lat: 51.8985, lng: -8.4756, name: "Cork City", color: "#50c878" },
  { lat: 52.3492, lng: -7.4128, name: "Carrick-on-Suir", color: "#50c878" },
  { lat: 44.4268, lng: 26.1025, name: "Bucharest", color: "#50c878" },
  { lat: 30.5728, lng: 104.0668, name: "Chengdu", color: "#50c878" },
  { lat: 14.5995, lng: 120.9842, name: "Manila", color: "#50c878" },
  { lat: 41.0759, lng: 1.1419, name: "Salou", color: "#FFD700" },
  { lat: 44.3032, lng: 9.2097, name: "Portofino", color: "#FFD700" },
  { lat: 43.7696, lng: 11.2558, name: "Florence", color: "#FFD700" },
  { lat: 43.7228, lng: 10.4017, name: "Pisa", color: "#FFD700" },
  { lat: 51.1762, lng: -115.5698, name: "Banff", color: "#4169e1" },
  { lat: 36.1699, lng: -115.1398, name: "Las Vegas", color: "#4169e1" },
  { lat: 27.9506, lng: -82.4572, name: "Tampa", color: "#4169e1" },
  { lat: 40.7128, lng: -74.0060, name: "New York City", color: "#4169e1" },
  { lat: 43.6532, lng: -79.3832, name: "Toronto", color: "#4169e1" },
  { lat: 45.4215, lng: -75.6972, name: "Ottawa", color: "#4169e1" },
  { lat: 10.3157, lng: 123.8854, name: "Cebu", color: "#4169e1" },
  { lat: 9.6500, lng: 123.8536, name: "Bohol", color: "#4169e1" },
  { lat: 51.5074, lng: -0.1278, name: "London", color: "#4169e1" },
  { lat: 53.4084, lng: -2.9916, name: "Liverpool", color: "#4169e1" },
  { lat: 53.4808, lng: -2.2426, name: "Manchester", color: "#4169e1" },
  { lat: 55.9533, lng: -3.1883, name: "Edinburgh", color: "#4169e1" },
  { lat: 52.3676, lng: 4.9041, name: "Amsterdam", color: "#4169e1" },
  { lat: 41.1579, lng: -8.6291, name: "Porto", color: "#4169e1" },
  { lat: 37.0894, lng: -8.2477, name: "Albufeira", color: "#4169e1" },
  { lat: 40.4168, lng: -3.7038, name: "Madrid", color: "#4169e1" },
  { lat: 37.0567, lng: -1.8541, name: "Mojácar", color: "#4169e1" },
  { lat: 48.8566, lng: 2.3522, name: "Paris", color: "#4169e1" },
  { lat: 44.8378, lng: -0.5792, name: "Bordeaux", color: "#4169e1" },
  { lat: 41.9028, lng: 12.4964, name: "Rome", color: "#4169e1" },
  { lat: 40.8518, lng: 14.2681, name: "Naples", color: "#4169e1" },
  { lat: 40.5532, lng: 14.2222, name: "Capri", color: "#4169e1" },
  { lat: 40.6306, lng: 14.6010, name: "Sorrento", color: "#4169e1" },
  { lat: 40.7313, lng: 13.9521, name: "Ischia", color: "#4169e1" },
  { lat: 40.6401, lng: 22.9444, name: "Thessaloniki", color: "#4169e1" },
  { lat: 35.3387, lng: 25.1442, name: "Crete", color: "#4169e1" },
  { lat: 36.3932, lng: 25.4615, name: "Santorini", color: "#4169e1" },
  { lat: 37.9838, lng: 23.7275, name: "Athens", color: "#4169e1" },
  { lat: 48.1486, lng: 17.1077, name: "Bratislava", color: "#4169e1" },
  { lat: 48.1351, lng: 11.5820, name: "Munich", color: "#4169e1" },
  { lat: 49.4521, lng: 11.0767, name: "Nuremberg", color: "#4169e1" },
  { lat: 49.3988, lng: 8.6724, name: "Heidelberg", color: "#4169e1" },
  { lat: 50.1109, lng: 8.6821, name: "Frankfurt", color: "#4169e1" },
  { lat: 50.0755, lng: 14.4378, name: "Prague", color: "#4169e1" },
  { lat: 52.4064, lng: 16.9252, name: "Poznań", color: "#4169e1" },
  { lat: 40.5320, lng: 23.4350, name: "Agios Mamas Beach", color: "#4169e1" },
  { lat: 39.5696, lng: 2.6502, name: "Mallorca", color: "#4169e1" },
  { lat: 37.1367, lng: -8.5371, name: "Portimão", color: "#4169e1" },
  { lat: 64.1466, lng: -21.9426, name: "Reykjavik", color: "#4169e1" }
];

interface EarthGroupProps {
  locations: Location[];
}

function EarthGroup({ locations }: EarthGroupProps) {
  const groupRef = useRef<Group>(null);

  // Earth and Rotation Controls
  const { rotationSpeed, timeOfDay, cityLights } = useControls("🌍 Earth", {
    rotationSpeed: {
      value: 0.05,
      min: 0,
      max: 0.2,
      step: 0.01,
      label: "Rotation Speed"
    },
    timeOfDay: {
      value: 12,
      min: 0,
      max: 24,
      step: 0.1,
      label: "Time (h)"
    },
    cityLights: {
      value: 1.0,
      min: 0,
      max: 2,
      step: 0.1,
      label: "City Lights"
    }
  });

  // Location Markers Controls
  const { markerScale } = useControls("📍 Markers", {
    markerScale: {
      value: 1,
      min: 0.5,
      max: 2,
      step: 0.1,
      label: "Marker Size"
    }
  });

  // Travel Arcs Controls
  const { showArcs, arcColor, arcOpacity, arcSpeed, arcHeight } = useControls("✈️ Travel Arcs", {
    showArcs: {
      value: true,
      label: "Show Arcs"
    },
    arcColor: {
      value: "#00ff88",
      label: "Arc Color"
    },
    arcOpacity: {
      value: 0.6,
      min: 0,
      max: 1,
      step: 0.1,
      label: "Arc Opacity"
    },
    arcSpeed: {
      value: 2,
      min: 0.5,
      max: 5,
      step: 0.1,
      label: "Animation Speed"
    },
    arcHeight: {
      value: 0.3,
      min: 0.1,
      max: 0.8,
      step: 0.05,
      label: "Arc Height"
    }
  });

  // Atmosphere Controls
  const { showAtmosphere, atmosphereColor, atmosphereOpacity, atmosphereIntensity } = useControls("🌫️ Atmosphere", {
    showAtmosphere: {
      value: true,
      label: "Show Atmosphere"
    },
    atmosphereColor: {
      value: "#3388ff",
      label: "Glow Color"
    },
    atmosphereOpacity: {
      value: 0.6,
      min: 0,
      max: 1,
      step: 0.1,
      label: "Glow Opacity"
    },
    atmosphereIntensity: {
      value: 1.5,
      min: 0.5,
      max: 3,
      step: 0.1,
      label: "Glow Intensity"
    }
  });

  // Convert time to sun direction rotating around Y (12h = noon facing camera)
  const angle = ((timeOfDay - 12) / 24) * Math.PI * 2;
  const sunDirection: [number, number, number] = [Math.sin(angle), 0, Math.cos(angle)];

  // Rotate the entire group containing Earth and markers together
  useFrame((_state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      <Earth sunDirection={sunDirection} cityIntensity={cityLights} />
      {showAtmosphere && (
        <Atmosphere
          atmosphereColor={atmosphereColor}
          atmosphereOpacity={atmosphereOpacity}
          atmosphereIntensity={atmosphereIntensity}
        />
      )}
      <LocationMarkers locations={locations} markerScale={markerScale} />
      {showArcs && (
        <TravelArcs
          locations={locations}
          arcColor={arcColor}
          arcOpacity={arcOpacity}
          animationDuration={arcSpeed}
          arcHeight={arcHeight}
        />
      )}
    </group>
  );
}

function App() {
  // Leva theme to ensure visible sliders/fills
  const levaTheme = {
    colors: {
      accent1: '#00A2FF',
      accent2: '#1B76FF',
      accent3: '#2F8CFF',
      highlight1: '#00A2FF',
      highlight2: '#66C8FF',
      highlight3: '#B3E5FF',
    },
  } as const;

  // Detect mobile/touch devices to avoid overlay blocking touch inputs
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    const small = window.innerWidth < 768;
    return coarse || small;
  }, []);

  // Using static local locations only (sanitized)

  // Camera and Lighting Controls
  const { ambientIntensity, cameraDistance } = useControls("🎥 Camera & Light", {
    cameraDistance: {
      value: 4,
      min: 2.5,
      max: 7,
      step: 0.1,
      label: "Camera Distance"
    },
    ambientIntensity: {
      value: 1.0,
      min: 0,
      max: 2,
      step: 0.1,
      label: "Light Intensity"
    }
  });

  // Starfield & Shooting Stars Controls
  const {
    starOpacity,
    shootingStarsCount,
    shootingStarsSpeed,
    shootingStarsOpacity,
    shootingStarsLength,
    shootingStarsColor
  } = useControls("⭐ Starfield", {
    starOpacity: {
      value: 1.5,
      min: 0,
      max: 3,
      step: 0.1,
      label: "Background Stars"
    },
    shootingStarsCount: {
      value: 15,
      min: 0,
      max: 50,
      step: 1,
      label: "Shooting Stars"
    },
    shootingStarsSpeed: {
      value: 1.0,
      min: 0.1,
      max: 5,
      step: 0.1,
      label: "Shooting Speed"
    },
    shootingStarsOpacity: {
      value: 0.8,
      min: 0,
      max: 1,
      step: 0.1,
      label: "Shooting Brightness"
    },
    shootingStarsLength: {
      value: 20,
      min: 5,
      max: 30,
      step: 1,
      label: "Trail Length"
    },
    shootingStarsColor: {
      value: "#ffffff",
      label: "Shooting Color"
    }
  });

  return (
    <>
      {/* Controls panel fixed full-height */}
      {!isMobile && (
        <div
          style={{
            position: 'fixed',
            top: 10,
            right: 10,
            zIndex: 1000,
            width: 420,
            height: 'calc(100vh - 20px)',
            overflow: 'auto'
          }}
        >
          <Leva theme={levaTheme} collapsed={false} oneLineLabels={false} fill />
        </div>
      )}
      {/* Location manager overlay removed */}

      <Canvas
        camera={{ position: [0, 0, cameraDistance], fov: 50 }}
        style={{ background: '#000000', touchAction: 'none' }}
      >
        <Suspense fallback={null}>
          <fog attach="fog" args={['#000000', 10, 60]} />
          {/* Full ambient light for uniform texture visibility */}
          <ambientLight intensity={ambientIntensity} />

          <EarthGroup locations={defaultLocations} />
          <Starfield count={10000} opacity={starOpacity} />
          {shootingStarsCount > 0 && (
            <ShootingStarsSmooth
              count={shootingStarsCount}
              speed={shootingStarsSpeed}
              opacity={shootingStarsOpacity}
              trailLength={shootingStarsLength / 50}
              color={shootingStarsColor}
              thickness={0.02}
            />
          )}
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={2.5}
            maxDistance={7}
            rotateSpeed={0.5}
            zoomSpeed={0.5}
            enableDamping={true}
            dampingFactor={0.05}
          />
        </Suspense>
      </Canvas>
    </>
  );
}

export default App;