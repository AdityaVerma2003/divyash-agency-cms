"use client";

import { useRef, useMemo, useState, useEffect, Component, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* WebGL is not guaranteed — sandboxed/locked-down browsers, some VMs/remote
   desktops, and privacy-hardened setups can all fail context creation. Since
   this canvas is purely decorative, we feature-detect before ever mounting
   react-three-fiber, and still wrap it in an error boundary as a second line
   of defense (context creation can also fail asynchronously inside R3F). */
function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

class ShaderErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("HeroShaderCanvas failed, hiding decorative background:", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* Animated gradient-noise backdrop for the hero, adapted from the pasted
   HeroGeometric shader component. Only the shader plane is kept — the hero's
   own copy, doodles, metric cards and dashboard mockup are untouched and sit
   layered on top of this as a purely decorative, non-interactive background. */

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
varying vec2 vUv;

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
    vec2 uv = vUv;

    float noise = snoise(uv * 1.5 + vec2(uTime * 0.05, uTime * 0.03)) * 0.25;
    float diagonal = (uv.x + uv.y) * 0.5;
    float gradient = diagonal * 1.2 + noise;

    vec3 softColor = mix(uColor1, uColor2, 0.33);
    vec3 lightColor = mix(uColor1, uColor2, 0.66);

    vec3 color;
    if (gradient < 0.3) {
        color = uColor1;
    } else if (gradient < 0.55) {
        color = softColor;
    } else if (gradient < 0.8) {
        color = lightColor;
    } else {
        color = uColor2;
    }

    gl_FragColor = vec4(color, 1.0);
}
`;

const FALLBACK_COLOR_1 = "#6366F1";
const FALLBACK_COLOR_2 = "#2DBFA0";
const HEX_COLOR_REGEX = /^#?[0-9a-fA-F]{6}$/;

function sanitizeHexColor(value: string, fallback: string) {
  const trimmed = value.trim();
  if (!HEX_COLOR_REGEX.test(trimmed)) return fallback;
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function GradientPlane({
  color1,
  color2,
  speed = 1,
}: {
  color1: string;
  color2: string;
  speed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color(FALLBACK_COLOR_1) },
      uColor2: { value: new THREE.Color(FALLBACK_COLOR_2) },
    }),
    [],
  );

  useFrame((state) => {
    uniforms.uTime.value = state.clock.getElapsedTime() * speed;
    uniforms.uColor1.value.set(sanitizeHexColor(color1, FALLBACK_COLOR_1));
    uniforms.uColor2.value.set(sanitizeHexColor(color2, FALLBACK_COLOR_2));
  });

  return (
    <mesh ref={meshRef} scale={[2, 2, 1]}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

export function HeroShaderCanvas({
  color1 = FALLBACK_COLOR_1,
  color2 = FALLBACK_COLOR_2,
  speed = 0.6,
  className,
}: {
  color1?: string;
  color2?: string;
  speed?: number;
  className?: string;
}) {
  const [canRender, setCanRender] = useState(false);
  const [inView, setInView] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setCanRender(!reduceMotion && supportsWebGL());
  }, []);

  // Stop driving the shader's render loop once the hero scrolls out of view —
  // no point spending GPU/CPU on a background nobody can see.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || !canRender) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [canRender]);

  if (!canRender) return null;

  return (
    <div ref={wrapperRef} className={className}>
      <ShaderErrorBoundary>
        <Canvas
          camera={{ position: [0, 0, 1] }}
          dpr={[1, 1.5]}
          gl={{ antialias: false, alpha: true }}
          frameloop={inView ? "always" : "never"}
        >
          <GradientPlane color1={color1} color2={color2} speed={speed} />
        </Canvas>
      </ShaderErrorBoundary>
    </div>
  );
}
