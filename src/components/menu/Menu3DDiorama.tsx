/**
 * CHAOS MONOPOLY — 3D Menu Diorama (Three.js WebGL)
 * Warm Premium + Luxury Editorial 3D scene:
 * A rotating polished wooden plinth with golden accents, floating dice,
 * miniature architectural structures, and soft cinematic lighting.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const Menu3DDiorama: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check WebGL availability
    try {
      const test = document.createElement('canvas');
      const gl = test.getContext('webgl') || test.getContext('experimental-webgl');
      if (!gl) return;
    } catch {
      return;
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    const aspect = canvas.clientWidth / (canvas.clientHeight || 1);
    const camera = new THREE.PerspectiveCamera(38, aspect, 0.5, 100);
    camera.position.set(0, 4.2, 7.8);
    camera.lookAt(0, 0.4, 0);

    // --- Lighting ---
    // Warm ambient light (ivory / champagne)
    const ambientLight = new THREE.AmbientLight(0xfdf8f0, 0.85);
    scene.add(ambientLight);

    // Main key light (warm sunlight)
    const keyLight = new THREE.DirectionalLight(0xfff7e6, 1.4);
    keyLight.position.set(6, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Cool rim light (soft sky blue / platinum)
    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.45);
    rimLight.position.set(-6, 5, -5);
    scene.add(rimLight);

    // --- Diorama Stage (Pedestal) ---
    const dioramaGroup = new THREE.Group();
    scene.add(dioramaGroup);

    // Base plinth: Polished ivory-lacquered cylinder
    const plinthGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.5, 64);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0xfaf6ef,
      roughness: 0.35,
      metalness: 0.08,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -0.25;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    dioramaGroup.add(plinth);

    // Gold rim around plinth
    const rimGeo = new THREE.TorusGeometry(3.65, 0.05, 16, 64);
    rimGeo.rotateX(Math.PI / 2);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Polished gold
      roughness: 0.25,
      metalness: 0.85,
    });
    const rimMesh = new THREE.Mesh(rimGeo, goldMat);
    rimMesh.position.y = 0.01;
    dioramaGroup.add(rimMesh);

    // Tabletop inlay: Natural warm birch wood
    const inlayGeo = new THREE.CylinderGeometry(3.55, 3.55, 0.02, 64);
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xf5ede0,
      roughness: 0.55,
      metalness: 0.04,
    });
    const inlay = new THREE.Mesh(inlayGeo, woodMat);
    inlay.position.y = 0.02;
    inlay.receiveShadow = true;
    dioramaGroup.add(inlay);

    // Central circular marble compass rose
    const marbleGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.03, 48);
    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.1,
    });
    const marble = new THREE.Mesh(marbleGeo, marbleMat);
    marble.position.y = 0.035;
    marble.receiveShadow = true;
    dioramaGroup.add(marble);

    // Outer miniature buildings on the rim
    const buildingGroup = new THREE.Group();
    dioramaGroup.add(buildingGroup);

    const bldgColors = [0x16a34a, 0x0284c7, 0xd97706, 0xdc2626, 0x8b5cf6];
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const radius = 2.7;
      const bldgX = Math.cos(angle) * radius;
      const bldgZ = Math.sin(angle) * radius;

      const height = 0.35 + (i % 3) * 0.25;
      const bldgGeo = new THREE.BoxGeometry(0.42, height, 0.36);
      const bldgMat = new THREE.MeshStandardMaterial({
        color: 0xfdfdfd,
        roughness: 0.4,
      });
      const bldgMesh = new THREE.Mesh(bldgGeo, bldgMat);
      bldgMesh.position.set(bldgX, height / 2 + 0.04, bldgZ);
      bldgMesh.rotation.y = -angle + Math.PI / 2;
      bldgMesh.castShadow = true;
      bldgMesh.receiveShadow = true;
      buildingGroup.add(bldgMesh);

      // Roof color band
      const roofGeo = new THREE.BoxGeometry(0.44, 0.08, 0.38);
      const roofMat = new THREE.MeshStandardMaterial({
        color: bldgColors[i % bldgColors.length],
        roughness: 0.3,
        metalness: 0.2,
      });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(bldgX, height + 0.04 + 0.04, bldgZ);
      roof.rotation.y = -angle + Math.PI / 2;
      roof.castShadow = true;
      buildingGroup.add(roof);
    }

    // Floating Golden Luxury Dice in the center
    const diceGeo = new THREE.BoxGeometry(0.72, 0.72, 0.72);
    const diceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.15,
    });
    const diceMesh = new THREE.Mesh(diceGeo, [
      diceMat, diceMat,
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.8 }),
      diceMat, diceMat, diceMat,
    ]);
    diceMesh.castShadow = true;
    diceMesh.position.set(-0.55, 1.45, 0.2);
    diceMesh.rotation.set(0.4, 0.6, 0.3);
    scene.add(diceMesh);

    // Companion Luxury Emerald Token (Figurine / Pawn)
    const pawnGeo = new THREE.CylinderGeometry(0.18, 0.32, 0.6, 24);
    const pawnMat = new THREE.MeshStandardMaterial({
      color: 0x059669, // Emerald green
      roughness: 0.2,
      metalness: 0.4,
    });
    const pawnMesh = new THREE.Mesh(pawnGeo, pawnMat);
    pawnMesh.position.set(0.65, 0.34, 0.4);
    pawnMesh.castShadow = true;
    pawnMesh.receiveShadow = true;
    dioramaGroup.add(pawnMesh);

    const pawnHeadGeo = new THREE.SphereGeometry(0.18, 24, 24);
    const pawnHead = new THREE.Mesh(pawnHeadGeo, goldMat);
    pawnHead.position.set(0.65, 0.72, 0.4);
    pawnHead.castShadow = true;
    dioramaGroup.add(pawnHead);

    // Ground plane for soft ambient shadow catching
    const shadowCatchGeo = new THREE.PlaneGeometry(16, 16);
    shadowCatchGeo.rotateX(-Math.PI / 2);
    const shadowCatchMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const shadowCatch = new THREE.Mesh(shadowCatchGeo, shadowCatchMat);
    shadowCatch.position.y = -0.51;
    shadowCatch.receiveShadow = true;
    scene.add(shadowCatch);

    // --- Animation Loop ---
    let animId: number;
    const startTime = performance.now();

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const elapsed = (time - startTime) * 0.001;

      // Slow elegant rotation of diorama
      dioramaGroup.rotation.y = elapsed * 0.12;

      // Gentle floating bob and rotation for the luxury dice
      diceMesh.position.y = 1.35 + Math.sin(elapsed * 1.5) * 0.08;
      diceMesh.rotation.x = 0.4 + Math.sin(elapsed * 0.8) * 0.15;
      diceMesh.rotation.y = 0.6 + elapsed * 0.35;
      diceMesh.rotation.z = 0.3 + Math.cos(elapsed * 0.7) * 0.12;

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    // Responsive resize handler
    const handleResize = () => {
      if (!canvas) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div className={`relative pointer-events-none select-none ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
