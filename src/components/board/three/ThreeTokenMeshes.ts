/**
 * CHAOS MONOPOLY — 3D Player Token Mesh Factory & Movement Engine
 * Distinct 3D models for all token types:
 * 1. VinFast VF9 Electric Car (Chassis, Cabin, 4 Wheels, Headlights)
 * 2. Metro Express Train (Bullet Locomotive, Visor, Pantograph)
 * 3. Lucky Cat Cyber (Ears, Collar Bell, Raised Waving Paw)
 * 4. Vinasat Satellite (Payload Bus, Solar Wings, Dish Antenna)
 * 5. Classic Turned Luxury Pawn Figurine
 * Smooth arc-hop interpolation along board paths & collision-free radial stacking.
 */

import * as THREE from 'three';


/**
 * 1. VinFast Electric SUV / Sports Car Token
 */
function createCarMesh(colorHex: string): THREE.Group {
  const group = new THREE.Group();
  const color = new THREE.Color(colorHex);

  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.25,
    metalness: 0.65,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.8,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
  });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  // Chassis Lower Body
  const chassisGeo = new THREE.BoxGeometry(0.42, 0.14, 0.75);
  const chassis = new THREE.Mesh(chassisGeo, bodyMat);
  chassis.position.y = 0.12;
  chassis.castShadow = true;
  group.add(chassis);

  // Cabin / Greenhouse
  const cabinGeo = new THREE.BoxGeometry(0.36, 0.14, 0.42);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, 0.24, -0.04);
  cabin.castShadow = true;
  group.add(cabin);

  // Wheels (4 cylinders)
  const wheelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16);
  wheelGeo.rotateZ(Math.PI / 2);

  const wheelPositions = [
    [-0.22, 0.08, 0.22],
    [0.22, 0.08, 0.22],
    [-0.22, 0.08, -0.22],
    [0.22, 0.08, -0.22],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    group.add(wheel);
  });

  // Headlights
  const lightGeo = new THREE.BoxGeometry(0.08, 0.04, 0.02);
  const leftLight = new THREE.Mesh(lightGeo, headlightMat);
  leftLight.position.set(-0.14, 0.14, 0.38);
  group.add(leftLight);

  const rightLight = new THREE.Mesh(lightGeo, headlightMat);
  rightLight.position.set(0.14, 0.14, 0.38);
  group.add(rightLight);

  return group;
}

/**
 * 2. Metro Express Locomotive Train Token
 */
function createTrainMesh(colorHex: string): THREE.Group {
  const group = new THREE.Group();
  const color = new THREE.Color(colorHex);

  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.4,
  });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

  // Train Body
  const bodyGeo = new THREE.BoxGeometry(0.38, 0.32, 0.8);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.2;
  body.castShadow = true;
  group.add(body);

  // Aerodynamic Bullet Nose (Sloped wedge in front)
  const noseGeo = new THREE.CylinderGeometry(0.05, 0.2, 0.25, 4);
  noseGeo.rotateY(Math.PI / 4);
  noseGeo.rotateX(Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, bodyMat);
  nose.position.set(0, 0.16, 0.48);
  nose.castShadow = true;
  group.add(nose);

  // Streamlined White Stripe
  const stripeGeo = new THREE.BoxGeometry(0.39, 0.06, 0.78);
  const stripe = new THREE.Mesh(stripeGeo, whiteMat);
  stripe.position.y = 0.18;
  group.add(stripe);

  // Roof Pantograph
  const pantoGeo = new THREE.TorusGeometry(0.08, 0.02, 8, 16);
  const panto = new THREE.Mesh(pantoGeo, darkMat);
  panto.position.set(0, 0.4, -0.15);
  panto.castShadow = true;
  group.add(panto);

  return group;
}

/**
 * 3. Lucky Cat / Figurine Token
 */
function createCatMesh(colorHex: string): THREE.Group {
  const group = new THREE.Group();
  const color = new THREE.Color(colorHex);

  const catMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.25,
    metalness: 0.2,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.2,
    metalness: 0.85,
  });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });

  // Rounded Body
  const bodyGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.38, 24);
  const body = new THREE.Mesh(bodyGeo, catMat);
  body.position.y = 0.19;
  body.castShadow = true;
  group.add(body);

  // Spherical Head
  const headGeo = new THREE.SphereGeometry(0.2, 24, 24);
  const head = new THREE.Mesh(headGeo, catMat);
  head.position.y = 0.45;
  head.castShadow = true;
  group.add(head);

  // Left & Right Pointed Ears
  const earGeo = new THREE.ConeGeometry(0.08, 0.14, 4);
  earGeo.rotateY(Math.PI / 4);

  const leftEar = new THREE.Mesh(earGeo, goldMat);
  leftEar.position.set(-0.12, 0.62, 0);
  leftEar.rotation.z = 0.2;
  leftEar.castShadow = true;
  group.add(leftEar);

  const rightEar = new THREE.Mesh(earGeo, goldMat);
  rightEar.position.set(0.12, 0.62, 0);
  rightEar.rotation.z = -0.2;
  rightEar.castShadow = true;
  group.add(rightEar);

  // Red Collar with Gold Bell
  const collarGeo = new THREE.TorusGeometry(0.18, 0.03, 8, 24);
  collarGeo.rotateX(Math.PI / 2);
  const collar = new THREE.Mesh(collarGeo, redMat);
  collar.position.y = 0.36;
  group.add(collar);

  const bellGeo = new THREE.SphereGeometry(0.05, 12, 12);
  const bell = new THREE.Mesh(bellGeo, goldMat);
  bell.position.set(0, 0.34, 0.18);
  group.add(bell);

  // Raised Waving Paw
  const pawGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.2, 12);
  pawGeo.rotateZ(-0.4);
  const paw = new THREE.Mesh(pawGeo, goldMat);
  paw.position.set(0.22, 0.45, 0.08);
  paw.castShadow = true;
  group.add(paw);

  return group;
}

/**
 * 4. Vinasat Space Satellite Token
 */
function createSatelliteMesh(colorHex: string): THREE.Group {
  const group = new THREE.Group();
  const color = new THREE.Color(colorHex);

  const busMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.2,
    metalness: 0.7,
  });
  const solarMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8, // Deep solar blue
    roughness: 0.1,
    metalness: 0.8,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.2,
    metalness: 0.9,
  });

  // Central Payload Bus
  const busGeo = new THREE.BoxGeometry(0.32, 0.32, 0.32);
  const bus = new THREE.Mesh(busGeo, busMat);
  bus.position.y = 0.32;
  bus.castShadow = true;
  group.add(bus);

  // Dual Solar Array Wings Extending Left and Right
  const wingGeo = new THREE.BoxGeometry(0.48, 0.03, 0.22);
  const leftWing = new THREE.Mesh(wingGeo, solarMat);
  leftWing.position.set(-0.42, 0.32, 0);
  leftWing.castShadow = true;
  group.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeo, solarMat);
  rightWing.position.set(0.42, 0.32, 0);
  rightWing.castShadow = true;
  group.add(rightWing);

  // Parabolic Communication Dish
  const dishGeo = new THREE.ConeGeometry(0.16, 0.08, 16);
  dishGeo.rotateX(Math.PI);
  const dish = new THREE.Mesh(dishGeo, goldMat);
  dish.position.set(0, 0.54, 0);
  dish.castShadow = true;
  group.add(dish);

  return group;
}

/**
 * 5. Classic Turned Luxury Pawn Figurine
 */
function createClassicPawnMesh(colorHex: string): THREE.Group {
  const pawn = new THREE.Group();
  const color = new THREE.Color(colorHex);

  const pawnMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.25,
    metalness: 0.3,
  });

  // Base circular pedestal
  const baseGeo = new THREE.CylinderGeometry(0.3, 0.36, 0.14, 24);
  const baseMesh = new THREE.Mesh(baseGeo, pawnMaterial);
  baseMesh.position.y = 0.07;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  pawn.add(baseMesh);

  // Turned waist
  const bodyGeo = new THREE.CylinderGeometry(0.12, 0.24, 0.42, 24);
  const bodyMesh = new THREE.Mesh(bodyGeo, pawnMaterial);
  bodyMesh.position.y = 0.14 + 0.21;
  bodyMesh.castShadow = true;
  pawn.add(bodyMesh);

  // Spherical head
  const headGeo = new THREE.SphereGeometry(0.18, 24, 24);
  const headMesh = new THREE.Mesh(headGeo, pawnMaterial);
  headMesh.position.y = 0.14 + 0.42 + 0.15;
  headMesh.castShadow = true;
  pawn.add(headMesh);

  return pawn;
}

/**
 * Factory for building the proper token model based on player token ID
 */
export function buildTokenGroup(token: { id?: string; colorHex?: string }): THREE.Group {
  const color = token.colorHex || '#0284c7';
  const id = token.id || '';

  if (id.includes('vinfast') || id.includes('car')) {
    return createCarMesh(color);
  }
  if (id.includes('metro') || id.includes('train')) {
    return createTrainMesh(color);
  }
  if (id.includes('meo') || id.includes('cat')) {
    return createCatMesh(color);
  }
  if (id.includes('vinasat') || id.includes('rocket') || id.includes('satellite')) {
    return createSatelliteMesh(color);
  }
  return createClassicPawnMesh(color);
}
