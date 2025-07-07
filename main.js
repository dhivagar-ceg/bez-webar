import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const start = async () => {
  const mindarThree = new MindARThree({
    container: document.querySelector("#ar-container"),
    imageTargetSrc: "./targets1.mind"
  });

  const { renderer, scene, camera } = mindarThree;
  const anchor = mindarThree.addAnchor(0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 2, 2);
  scene.add(directionalLight);

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const gltfLoader = new GLTFLoader();
  const gltf = await gltfLoader.loadAsync("./2.glb");
  const avatar = gltf.scene;
  avatar.scale.set(0.35, 0.35, 0.35);
  avatar.rotation.x = Math.PI / 2;
  avatar.position.set(0, 0, 0);
  avatar.visible = false;

  avatar.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  const mixer = new THREE.AnimationMixer(avatar);
  const idleAction = mixer.clipAction(gltf.animations[0]);

  const videoPositions = [
    [-1.3, 0.1, 0],
    [-0.45, 0.1, 0],
    [0.45, 0.1, 0],
    [1.3, 0.1, 0]
  ];
  const centerPosition = [0, 0, 0];
  const videoFiles = ["bez1.mp4", "bez2.mp4", "bez3.mp4", "bez1.mp4"];
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
      new THREE.PlaneGeometry(0.5, 0.3),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
    );
    plane.position.set(...videoPositions[i]);
    plane.visible = false;
    anchor.group.add(plane);
    videoPlanes.push({ plane, video });
  }

  const clickableObjects = [];

  const createButton = (label, x, y, callback, scale = 0.45, fontSize = 28) => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.4 * scale, 0.35 * scale), material);
    plane.position.set(x, y, 0.1);
    plane.userData = { onClick: callback };
    plane.visible = false;
    anchor.group.add(plane);
    clickableObjects.push(plane);
    return plane;
  };

  const createCaseStudyCard = (title, category, text, imageURL, x) => {
    const cardGroup = new THREE.Group();

    const texture = new THREE.TextureLoader().load(imageURL);
    const imgPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.4),
      new THREE.MeshBasicMaterial({ map: texture })
    );
    imgPlane.position.set(0, 0.2, 0);
    cardGroup.add(imgPlane);

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "20px Arial";
    ctx.fillText(category, 20, 30);
    ctx.font = "bold 24px Arial";
    ctx.fillText(title, 20, 60);
    ctx.font = "18px Arial";
    ctx.fillText(text, 20, 100);

    const infoTexture = new THREE.CanvasTexture(canvas);
    const infoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.4),
      new THREE.MeshBasicMaterial({ map: infoTexture })
    );
    infoPlane.position.set(0, -0.2, 0);
    cardGroup.add(infoPlane);

    cardGroup.position.set(x, 0.3, 0.2);
    cardGroup.visible = false;
    anchor.group.add(cardGroup);
    return cardGroup;
  };

  const caseStudyCards = [
    createCaseStudyCard("National Geographic", "Fashion", "Visuals that epitomize curiosity.", "./case1.png", -0.8),
    createCaseStudyCard("Lamborghini", "Automotive", "Every rev tells a story.", "./case2.png", 0),
    createCaseStudyCard("Hello Bello", "Services", "A culinary voyage with pizzas.", "./case3.png", 0.8)
  ];

  const showCaseStudyContent = () => {
    caseStudyCards.forEach(card => card.visible = true);
  };

  const showMainMenu = () => {
    avatar.visible = true;
    avatar.position.set(...centerPosition);
    videoPlanes.forEach(({ plane, video }) => {
      plane.visible = false;
      video.pause();
    });
    backButton.visible = false;
    websiteBtn.visible = true;
    contactBtn.visible = true;
    caseStudyBtns.forEach(btn => btn.visible = false);
    caseStudyCards.forEach(card => card.visible = false);
    menuButtons.forEach(btn => btn.visible = true);
  };

  const showContentScene = () => {
    menuButtons.forEach(btn => btn.visible = false);
    backButton.visible = true;
    websiteBtn.visible = true;
    contactBtn.visible = true;
    caseStudyBtns.forEach(btn => btn.visible = false);
    caseStudyCards.forEach(card => card.visible = false);
    avatar.visible = true;
    videoPlanes.forEach(({ plane }) => plane.visible = true);
    playSequence().then(() => showMainMenu());
  };

  const showCaseStudy = () => {
    menuButtons.forEach(btn => btn.visible = false);
    backButton.visible = true;
    websiteBtn.visible = true;
    contactBtn.visible = true;
    videoPlanes.forEach(({ plane }) => plane.visible = false);
    caseStudyBtns.forEach(btn => btn.visible = true);
    caseStudyCards.forEach(card => card.visible = false);
    avatar.visible = false;
  };

  const showAboutUs = () => {
    menuButtons.forEach(btn => btn.visible = false);
    backButton.visible = true;
    websiteBtn.visible = true;
    contactBtn.visible = true;
    videoPlanes.forEach(({ plane }) => plane.visible = false);
    caseStudyBtns.forEach(btn => btn.visible = false);
    caseStudyCards.forEach(card => card.visible = false);
    avatar.visible = true;
    avatar.position.set(...centerPosition);
  };

  const websiteBtn = createButton("www.bez.agency", -0.6, -0.3, () => {
    window.open("https://www.bez.agency", "_blank");
  });
  const contactBtn = createButton("bez@gmail.com", 0.6, -0.3, () => {
    window.open("mailto:bez@gmail.com", "_blank");
  });
  const backButton = createButton("← Back", -1.3, 0.45, () => {
    showMainMenu();
  });

  const caseStudyBtns = [
    createButton("Show Case Studies", 0, -0.1, showCaseStudyContent)
  ];

  const menuButtons = [
    createButton("our content", -1, 0.4, showContentScene),
    createButton("case studies", 0, 0.4, showCaseStudy),
    createButton("about us", 1, 0.4, showAboutUs)
  ];

  const playSequence = async () => {
    for (let i = 0; i < videoPlanes.length; i++) {
      avatar.position.set(...videoPositions[i]);
      videoPlanes.forEach(({ video }, idx) => {
        if (i === idx) {
          video.currentTime = 0;
          video.play();
        } else {
          video.pause();
        }
      });
      await new Promise((res) => {
        const v = videoPlanes[i].video;
        v.onended = () => res();
      });
    }
    avatar.position.set(...centerPosition);
  };

  const audio = new Audio("BezVO.mp3");
  let audioPlayed = false;

  const playIntro = async () => {
    avatar.visible = true;
    anchor.group.add(avatar);
    idleAction.play();
    audio.play();
    await new Promise(res => setTimeout(res, 8000));
    showMainMenu();
  };

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  window.addEventListener("click", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickableObjects, true);
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      if (obj.userData?.onClick) obj.userData.onClick();
    }
  });

  anchor.onTargetFound = () => {
    if (!audioPlayed) {
      audioPlayed = true;
      playIntro();
    }
  };

  anchor.onTargetLost = () => {
    audio.pause();
    audio.currentTime = 0;
    videoPlanes.forEach(({ video }) => video.pause());
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
