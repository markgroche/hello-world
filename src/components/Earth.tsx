import { useRef, useMemo } from "react";
import { Mesh, TextureLoader, SRGBColorSpace, ShaderMaterial, Vector3 } from "three";
import { useLoader } from "@react-three/fiber";

interface EarthProps {
    sunDirection?: [number, number, number];
    cityIntensity?: number;
}

const Earth = ({ sunDirection = [1, 0, 0], cityIntensity = 1.0 }: EarthProps) => {
    const earthRef = useRef<Mesh>(null);

    // Load day and night textures
    const [dayTex, nightTex] = useLoader(TextureLoader, [
        "textures/8k_earth_daymap.jpg",
        "textures/8k_earth_nightmap.jpg"
    ]);

    // Ensure proper color space for the textures
    dayTex.colorSpace = SRGBColorSpace;
    nightTex.colorSpace = SRGBColorSpace;

    // Convert sun direction to Vector3 and normalize
    const sunDir = useMemo(() => new Vector3(...sunDirection).normalize(), [sunDirection]);

    // Create custom shader material
    const shaderMaterial = useMemo(() => {
        return new ShaderMaterial({
            uniforms: {
                dayMap: { value: dayTex },
                nightMap: { value: nightTex },
                sunDirection: { value: sunDir },
                cityIntensity: { value: cityIntensity },
            },
            vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
            fragmentShader: `
        uniform sampler2D dayMap;
        uniform sampler2D nightMap;
        uniform vec3 sunDirection;
        uniform float cityIntensity;
        varying vec3 vNormal;
        varying vec2 vUv;

        void main() {
          float ndl = dot(normalize(vNormal), normalize(sunDirection));
          float dayMix = smoothstep(-0.1, 0.2, ndl);
          float nightMix = 1.0 - dayMix;

          vec3 dayCol = texture2D(dayMap, vUv).rgb;
          vec3 nightCol = texture2D(nightMap, vUv).rgb;

          // Combine day and night with city lights
          vec3 color = dayCol * dayMix
                     + (nightCol * nightMix) * 0.6
                     + (nightCol * nightMix) * cityIntensity * 0.6;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
        });
    }, [dayTex, nightTex, sunDir, cityIntensity]);

    // Update uniforms when props change
    useMemo(() => {
        if (shaderMaterial) {
            shaderMaterial.uniforms.sunDirection.value = sunDir;
            shaderMaterial.uniforms.cityIntensity.value = cityIntensity;
        }
    }, [shaderMaterial, sunDir, cityIntensity]);

    return (
        <mesh ref={earthRef}>
            <sphereGeometry args={[1, 64, 64]} />
            <primitive object={shaderMaterial} attach="material" />
        </mesh>
    );
};

export default Earth;