import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { getFresnelMat } from "./getFresnelMat";

export default class Scene {
  private scene: THREE.Scene;
  public element: HTMLElement | null;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private orbitControl: OrbitControls;
  private globeGroup: THREE.Group;

  constructor() {
    console.log("start");
    this.scene = new THREE.Scene();

    // Create a basic perspective camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.camera.position.z = 2;

    // Create a renderer with Antialiasing
    this.renderer = new THREE.WebGLRenderer({ antialias: true });

    // Configure renderer clear color
    this.renderer.setClearColor("#000000");

    // Configure renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.element = document.getElementById("threeCanvas");
    this.element?.appendChild(this.renderer.domElement);

    this.orbitControl = new OrbitControls(
      this.camera,
      this.renderer.domElement
    );

    this.globeGroup = new THREE.Group();
    this.scene.add(this.globeGroup);

    const loader = new THREE.TextureLoader();

    const colorMap = loader.load("./00_earthmap1k.jpg");
    const elevMap = loader.load("./01_earthbump1k.jpg");
    const alphaMap = loader.load("./02_earthspec1k.jpg");

    const geo = new THREE.IcosahedronGeometry(1, 10);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x202020,
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    this.globeGroup.add(mesh);

    const detail = 60;
    const pointsGeo = new THREE.IcosahedronGeometry(1, detail);

    const vertexShader = `
        uniform float size;
        uniform sampler2D elevTexture;
     
        varying vec2 vUv;
        varying float vVisible;
  

        void main(){

            vUv = uv;
            vec4 mvPosition =modelViewMatrix * vec4( position, 1.0 );
            float elv = texture2D(elevTexture,vUv).r;
          
            vec3 vNormal = normalMatrix*normal;
            vVisible =  step(0.0,dot(-normalize(mvPosition.xyz),normalize(vNormal)));

            mvPosition.z += 0.15 * elv;
            gl_PointSize = size;
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

    const fragmentShader = `
        uniform sampler2D colorMap;
        uniform sampler2D alphaMap;
        varying vec2 vUv;
        varying float vVisible;


        void main(){

             if (floor(vVisible + 0.1) == 0.0) discard;
            float alpha = 1.0 - texture2D(alphaMap,vUv).r;
            vec3 color = texture2D(colorMap,vUv).rgb;
            color = vec3(.32, .10, 1.0);

        
            gl_FragColor = vec4( color,alpha);
            
        }
    `;

    const uniforms = {
      size: { type: "f", value: 3.0 },
      colorMap: { type: "t", value: colorMap },
      elevMap: { type: "t", value: elevMap },
      alphaMap: { type: "t", value: alphaMap },
    };

    const pointsMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
    });
    const points = new THREE.Points(pointsGeo, pointsMat);
    this.globeGroup.add(points);

    const fresnelMat = getFresnelMat();
    const glowMesh = new THREE.Mesh(geo, fresnelMat);
    glowMesh.scale.setScalar(1.03);
    this.globeGroup.add(glowMesh);
    this.render();
  }

  render = () => {
    requestAnimationFrame(this.render);
    this.orbitControl.update();
    this.globeGroup.rotateY(0.001);
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  };
}
