"use client";
import { cn } from "@/utils/cn";
import React, { useCallback, useEffect, useRef } from "react";
import { createNoise3D } from "simplex-noise";
import { motion } from "framer-motion";

interface VortexProps {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  particleCount?: number;
  rangeY?: number;
  baseHue?: number;
  baseSpeed?: number;
  rangeSpeed?: number;
  baseRadius?: number;
  rangeRadius?: number;
  backgroundColor?: string;
}

export const Vortex = ({
  children,
  className,
  containerClassName,
  particleCount = 700,
  rangeY = 100,
  baseHue = 220,
  baseSpeed = 0.0,
  rangeSpeed = 1.5,
  baseRadius = 1,
  rangeRadius = 2,
  backgroundColor = "#000000",
}: VortexProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number | null>(null);

  const particlePropCount = 9;
  const particlePropsLength = particleCount * particlePropCount;
  const baseTTL = 50;
  const rangeTTL = 150;
  const rangeHue = 100;
  const noiseSteps = 3;
  const xOff = 0.00125;
  const yOff = 0.00125;
  const zOff = 0.0005;
  const noise3D = createNoise3D();
  const center: [number, number] = [0, 0];
  let tick = 0;
  let particleProps = new Float32Array(particlePropsLength);

  const TAU = 2 * Math.PI;

  const rand = (n: number): number => n * Math.random();
  const randRange = (n: number): number => n - rand(2 * n);
  const fadeInOut = (t: number, m: number): number => {
    const hm = 0.5 * m;
    return Math.abs(((t + hm) % m) - hm) / hm;
  };
  const lerp = (n1: number, n2: number, speed: number): number =>
    (1 - speed) * n1 + speed * n2;

  const resize = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const { innerWidth, innerHeight } = window;
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    center[0] = 0.5 * canvas.width;
    center[1] = 0.5 * canvas.height;
  }, []);

  const initParticles = useCallback(() => {
    tick = 0;
    particleProps = new Float32Array(particlePropsLength);
    for (let i = 0; i < particlePropsLength; i += particlePropCount) {
      initParticle(i);
    }
  }, []);

  const initParticle = (i: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const x = rand(canvas.width);
    const y = center[1] + randRange(rangeY);
    const vx = 0;
    const vy = 0;
    const life = 0;
    const ttl = baseTTL + rand(rangeTTL);
    const speed = baseSpeed + rand(rangeSpeed);
    const radius = baseRadius + rand(rangeRadius);
    const hue = baseHue + rand(rangeHue);

    particleProps.set([x, y, vx, vy, life, ttl, speed, radius, hue], i);
  };

  const draw = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    tick++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawParticles(ctx);
    renderGlow(canvas, ctx);
    renderToScreen(canvas, ctx);

    animationFrameId.current = requestAnimationFrame(() => draw(canvas, ctx));
  }, [backgroundColor]);

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    for (let i = 0; i < particlePropsLength; i += particlePropCount) {
      updateParticle(i, ctx);
    }
  };

  const updateParticle = (i: number, ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const i2 = 1 + i,
      i3 = 2 + i,
      i4 = 3 + i,
      i5 = 4 + i,
      i6 = 5 + i,
      i7 = 6 + i,
      i8 = 7 + i,
      i9 = 8 + i;

    const x = particleProps[i];
    const y = particleProps[i2];
    const n = noise3D(x * xOff, y * yOff, tick * zOff) * noiseSteps * TAU;
    const vx = lerp(particleProps[i3], Math.cos(n), 0.5);
    const vy = lerp(particleProps[i4], Math.sin(n), 0.5);
    const life = particleProps[i5];
    const ttl = particleProps[i6];
    const speed = particleProps[i7];
    const x2 = x + vx * speed;
    const y2 = y + vy * speed;
    const radius = particleProps[i8];
    const hue = particleProps[i9];

    drawParticle(x, y, x2, y2, life, ttl, radius, hue, ctx);

    particleProps[i] = x2;
    particleProps[i2] = y2;
    particleProps[i3] = vx;
    particleProps[i4] = vy;
    particleProps[i5] = life + 1;

    if (checkBounds(x, y, canvas) || life > ttl) initParticle(i);
  };

  const drawParticle = (
    x: number,
    y: number,
    x2: number,
    y2: number,
    life: number,
    ttl: number,
    radius: number,
    hue: number,
    ctx: CanvasRenderingContext2D,
  ) => {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = radius;
    ctx.strokeStyle = `hsla(${hue},100%,60%,${fadeInOut(life, ttl)})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
  };

  const checkBounds = (x: number, y: number, canvas: HTMLCanvasElement) =>
    x > canvas.width || x < 0 || y > canvas.height || y < 0;

  const renderGlow = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
  ) => {
    ctx.save();
    ctx.filter = "blur(8px) brightness(200%)";
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.filter = "blur(4px) brightness(200%)";
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  };

  const renderToScreen = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
  ) => {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  };

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      resize(canvas, ctx);
    }
  }, [resize]);

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        resize(canvas, ctx);
        initParticles();
        draw(canvas, ctx);
      }
    }
  }, [resize, initParticles, draw]);

  useEffect(() => {
    setup();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [handleResize, setup]);

  return (
    <div className={cn("relative h-full w-full", containerClassName)}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        ref={containerRef}
        className="absolute inset-0 z-0 flex h-full w-full items-center justify-center bg-transparent"
      >
        <canvas ref={canvasRef}></canvas>
      </motion.div>

      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  );
};
