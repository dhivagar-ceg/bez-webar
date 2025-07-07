import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const start = async () => {
  const mindarThree = new MindARThree({
    container: document.querySelector("#ar-container"),
    imageTargetSrc: "./CarTarget.mind",
  });

  const { renderer, scene, camera } = mindarThree;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 2, 2);
  scene.add(directionalLight);

  // Tone mapping
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const anchor = mindarThree.addAnchor(0);

  const gltfLoader = new GLTFLoader();
  const gltf = await gltfLoader.loadAsync("./2.glb");

  // ✅ Log all available animation names
  console.log("Available animations:");
  gltf.animations.forEach((clip, index) => {
    console.log(`${index}: ${clip.name}`);
  });

  const avatar = gltf.scene;
  avatar.scale.set(0.4, 0.4, 0.4);
  avatar.position.set(-0.5, 0, 0);
  avatar.rotation.x = Math.PI / 2;

  avatar.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.material.needsUpdate = true;
    }
  });

  anchor.group.add(avatar);

  // Animation setup
  const mixer = new THREE.AnimationMixer(avatar);

  let idleClip = THREE.AnimationClip.findByName(gltf.animations, "Armature_mixamo.com_Layer0");

  if (!idleClip && gltf.animations.length > 0) {
    console.warn("Specified animation not found. Using first available animation.");
    idleClip = gltf.animations[0];
  }

  if (!idleClip) {
    console.error("No animation found in GLB file.");
    return;
  }

  const idleAction = mixer.clipAction(idleClip);
  idleAction.play();

  // Video planes
  const videoPositions = [
    [-0.5, 0.65, 0],
    [0.5, 0.65, 0],
    [-1.1, -0.01, 0],
    [1.1, -0.01, 0]
  ];

  const videoFiles = ["video1.mp4", "video2.mp4", "video3.mp4", "video4.mp4"];
  const videoPlanes = [];

  for (let i = 0; i < videoFiles.length; i++) {
    const video = document.createElement("video");
    video.src = videoFiles[i];
    video.crossOrigin = "anonymous";
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const texture = new THREE.VideoTexture(video);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.6),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
    );

    plane.position.set(...videoPositions[i]);
    plane.visible = true;
    anchor.group.add(plane);
    videoPlanes.push({ plane, video });
  }

  // Avatar teleport positions
  const avatarPositions = [
    [-1.6, 0.8, 0],  // Top-left
    [0.5, 0.8, 0],   // Top-right
    [-1.1, 0, 0],    // Middle-left
    [1.1, 0, 0]      // Middle-right
  ];

  let audio = new Audio("Bez.mp3");

  const runSequence = async () => {
    idleAction.reset().play();
    audio.play();

    await new Promise(res => setTimeout(res, 20000)); // Wait 20 sec

    for (let i = 0; i < avatarPositions.length; i++) {
      avatar.position.set(...avatarPositions[i]);

      videoPlanes.forEach(({ video }, index) => {
        if (index === i) {
          video.currentTime = 0;
          video.play().catch(err => console.warn("Video play error:", err));
        } else {
          video.pause();
        }
      });

      await new Promise(res => {
        const currentVideo = videoPlanes[i].video;
        if (currentVideo.ended || currentVideo.duration === currentVideo.currentTime) {
          res();
        } else {
          currentVideo.onended = () => res();
        }
      });
    }
  };

  anchor.onTargetFound = () => {
    runSequence();
  };

  anchor.onTargetLost = () => {
    audio.pause();
    audio.currentTime = 0;
    videoPlanes.forEach(({ video }) => {
      video.pause();
    });
  };

  await mindarThree.start();

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    mixer.update(delta);
    renderer.render(scene, camera);
  });
};

start();
