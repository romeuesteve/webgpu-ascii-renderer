export interface CameraOptions {
  initialDistance?: number;
  autoRotateSpeed?: number;
}

export class Camera {
  rotationX: number = 0.5;
  rotationY: number = 0.5;
  distance: number = 8;
  targetRotationX: number = 0.5;
  targetRotationY: number = 0.5;
  targetDistance: number = 8;

  isDragging = false;
  lastMouseX = 0;
  lastMouseY = 0;
  private autoRotateSpeed: number;
  private canvasElements: HTMLCanvasElement[] = [];

  constructor(canvas: HTMLCanvasElement, options: CameraOptions = {}) {
    this.distance = options.initialDistance || 8;
    this.targetDistance = this.distance;
    this.autoRotateSpeed = options.autoRotateSpeed !== undefined ? options.autoRotateSpeed : 0.005;
    this.attachCanvas(canvas);
  }

  attachCanvas(canvas: HTMLCanvasElement) {
    this.canvasElements.push(canvas);

    const mouseDownHandler = (e: MouseEvent) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    };

    const mouseMoveHandler = (e: MouseEvent) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      this.targetRotationY += deltaX * 0.01;
      this.targetRotationX += deltaY * 0.01;
      this.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotationX));

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    };

    const mouseUpHandler = () => {
      this.isDragging = false;
    };

    const mouseLeaveHandler = () => {
      this.isDragging = false;
    };

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      this.targetDistance += e.deltaY * 0.01;
      this.targetDistance = Math.max(2, Math.min(10, this.targetDistance));
    };

    canvas.addEventListener('mousedown', mouseDownHandler);
    canvas.addEventListener('mousemove', mouseMoveHandler);
    canvas.addEventListener('mouseup', mouseUpHandler);
    canvas.addEventListener('mouseleave', mouseLeaveHandler);
    canvas.addEventListener('wheel', wheelHandler);

    canvas.dataset.cameraListenersAttached = 'true';
  }

  update() {
    this.rotationX += (this.targetRotationX - this.rotationX) * 0.1;
    this.rotationY += (this.targetRotationY - this.rotationY) * 0.1;
    this.distance += (this.targetDistance - this.distance) * 0.1;
    
    this.targetRotationY += this.autoRotateSpeed;
  }

  setDistance(distance: number) {
    this.targetDistance = Math.max(2, Math.min(10, distance));
  }

  setRotation(x: number, y: number) {
    this.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, x));
    this.targetRotationY = y;
  }

  dispose() {
    for (const canvas of this.canvasElements) {
      const clone = canvas.cloneNode(true) as HTMLCanvasElement;
      canvas.parentNode?.replaceChild(clone, canvas);
    }
    this.canvasElements = [];
  }

  getViewMatrix(): Float32Array {
    const cosX = Math.cos(this.rotationX);
    const sinX = Math.sin(this.rotationX);
    const cosY = Math.cos(this.rotationY);
    const sinY = Math.sin(this.rotationY);

    const eyeX = this.distance * cosX * sinY;
    const eyeY = this.distance * sinX;
    const eyeZ = this.distance * cosX * cosY;

    return this.lookAt(
      [eyeX, eyeY, eyeZ],
      [0, 0, 0],
      [0, 1, 0]
    );
  }

  getProjectionMatrix(aspect: number): Float32Array {
    const fov = Math.PI / 4;
    const near = 0.01;
    const far = 100;
    const f = 1.0 / Math.tan(fov / 2);

    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) / (near - far), -1,
      0, 0, (2 * far * near) / (near - far), 0,
    ]);
  }

  private lookAt(eye: number[], center: number[], up: number[]): Float32Array {
    const zAxis = this.normalize([
      eye[0] - center[0],
      eye[1] - center[1],
      eye[2] - center[2],
    ]);

    const xAxis = this.normalize(this.cross(up, zAxis));
    const yAxis = this.cross(zAxis, xAxis);

    return new Float32Array([
      xAxis[0], yAxis[0], zAxis[0], 0,
      xAxis[1], yAxis[1], zAxis[1], 0,
      xAxis[2], yAxis[2], zAxis[2], 0,
      -this.dot(xAxis, eye),
      -this.dot(yAxis, eye),
      -this.dot(zAxis, eye),
      1,
    ]);
  }

  private normalize(v: number[]): number[] {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / len, v[1] / len, v[2] / len];
  }

  private cross(a: number[], b: number[]): number[] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  private dot(a: number[], b: number[]): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
}
