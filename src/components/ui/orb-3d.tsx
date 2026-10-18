import React from "react";
import { cn } from "@/lib/utils";

interface Orb3DProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export function Orb3D({
  size = 56,
  className,
  glow = true,
}: Orb3DProps) {
  const sphereId = React.useId();
  const gradId = `sphere-grad-${sphereId.replace(/:/g, "")}`;
  const specId = `sphere-spec-${sphereId.replace(/:/g, "")}`;
  const rimId = `sphere-rim-${sphereId.replace(/:/g, "")}`;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none pointer-events-none",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Underlying atmospheric diffuse glow */}
      {glow && (
        <div
          className="absolute -inset-2 rounded-full opacity-60 blur-xl dark:opacity-75 transition-opacity"
          style={{
            background:
              "radial-gradient(circle, rgba(168, 85, 247, 0.45) 0%, rgba(124, 58, 237, 0.25) 45%, transparent 70%)",
            transform: "translateY(15%)",
          }}
        />
      )}

      {/* Floating glossy 3D sphere */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="relative animate-orb-float overflow-visible"
        style={{
          filter: "drop-shadow(0 14px 22px rgba(124, 58, 237, 0.35))",
        }}
      >
        <defs>
          {/* Main 3D volume gradient: specular center shifted to top-left */}
          <radialGradient
            id={gradId}
            cx="38%"
            cy="32%"
            r="65%"
            fx="32%"
            fy="26%"
          >
            <stop offset="0%" stopColor="#f3e8ff" />
            <stop offset="18%" stopColor="#d8b4fe" />
            <stop offset="42%" stopColor="#a855f7" />
            <stop offset="72%" stopColor="#7c3aed" />
            <stop offset="92%" stopColor="#581c87" />
            <stop offset="100%" stopColor="#3b0764" />
          </radialGradient>

          {/* High-gloss specular highlight at top-left */}
          <radialGradient
            id={specId}
            cx="34%"
            cy="28%"
            r="28%"
            fx="32%"
            fy="24%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#f3e8ff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          {/* Soft ambient bottom-right bounce rim light */}
          <radialGradient
            id={rimId}
            cx="75%"
            cy="80%"
            r="45%"
          >
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Base Sphere */}
        <circle cx="50" cy="50" r="46" fill={`url(#${gradId})`} />

        {/* Ambient bounce reflection rim */}
        <circle cx="50" cy="50" r="46" fill={`url(#${rimId})`} />

        {/* Glossy specular reflection */}
        <ellipse
          cx="38"
          cy="32"
          rx="22"
          ry="17"
          transform="rotate(-20 38 32)"
          fill={`url(#${specId})`}
        />
      </svg>
    </div>
  );
}
