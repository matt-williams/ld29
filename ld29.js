LD29 = function(canvas) {
  this.canvas = canvas;
  this.init();
  this.start();
}

LD29.HALF_FOV = 0.25;
LD29.FRAME_PERIOD_MS = 20;
LD29.PLAY_AREA = [-50, -100, 50, -20];
LD29.WATER_DEPTH = -40;
LD29.SAND_DEPTH = -50;

LD29.prototype.init = function() {
  this.initGL();
  this.initRenderers();
  this.initSprites();
  this.initSurfaces();
  this.initState();
}

LD29.prototype.initGL = function() {
  var gl = WebGLUtils.setupWebGL(this.canvas);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(true);
  this.gl = gl;
}

LD29.prototype.initRenderers = function() {
  this.eye = vec3.create();
  this.projection = mat4.create();
  this.matrix = mat4.create();
  this.sprite3dRenderer = new LD29.Sprite3DRenderer(this.gl);
  this.surfaceRenderer = new LD29.SurfaceRenderer(this.gl);
}

LD29.prototype.initSprites = function() {
  LD29.Duck.init(this.sprite3dRenderer);
  LD29.Treasure.init(this.sprite3dRenderer);
  LD29.Plant.init(this.sprite3dRenderer);
  LD29.Fish.init(this.sprite3dRenderer);
  LD29.Frog.init(this.sprite3dRenderer);
  LD29.Font.init(this.sprite3dRenderer);
  this.sprites = [];
  this.fontSprites = [];
  this.hudSprites = [];
  this.addInitialSprites();
  this.displayHUD(0, 0);
}

LD29.prototype.addInitialSprites = function() {
  for (var i = 0; i < 10; i++) {
    this.sprites.push(new LD29.Duck(this));
  }
  for (var i = 0; i < 5; i++) {
    this.sprites.push(new LD29.Treasure());
  }
  for (var i = 0; i < 5; i++) {
    this.sprites.push(new LD29.Plant());
  }
  for (var i = 0; i < 10; i++) {
    this.sprites.push(new LD29.Fish());
  }
  this.displayMessage("FROG V DUCKS\n\nLEFT   A\nRIGHT  D\nDIVE   S");
}

LD29.prototype.displayMessage = function(message) {
  var lines = message.split("\n");
  for (var ii = 0; ii < lines.length; ii++) {
    var line = lines[ii];
    for (var jj = 0; jj < line.length; jj++) {
      if (line.charAt(jj) != " ") {
        var font = new LD29.Font(line.charAt(jj), [jj + (20 - line.length) / 2, ii]);
        this.sprites.push(font);
        this.fontSprites.push(font);
      }
    }
  }
}

LD29.prototype.displayHUD = function(score, oxygen) {
  scoreMessage = "SCORE " + score;
  oxygenMessage = "" + oxygen + " O2";
  hudMessage = scoreMessage + "                  ".substring(scoreMessage.length + oxygenMessage.length) + oxygenMessage;
  this.hudSprites = [];
  for (var ii = 0; ii < hudMessage.length; ii++) {
    if (hudMessage.charAt(ii) != " ") {
      var font = new LD29.Font(hudMessage.charAt(ii), [ii, 10]);
      this.hudSprites.push(font);
    }
  }
}

LD29.prototype.clearMessage = function() {
  for (var ii = 0; ii < this.fontSprites.length; ii++) {
    this.fontSprites[ii].deathTick = this.tick + 11;
  }
}

LD29.prototype.initSurfaces = function() {
  this.waterSurface = new LD29.Surface(this.surfaceRenderer, 0.02, [0, 0, 0.5, 0.5], [0.5, 0.5, 0.25, 0]);
  mat4.translate(this.waterSurface.modelview, this.waterSurface.modelview, [0, LD29.WATER_DEPTH, 0]);
  this.sandSurface = new LD29.Surface(this.surfaceRenderer, 0, [0.75, 0.75, 0, 1.0], [0.25, 0.25, 0.75, 0]);
  mat4.translate(this.sandSurface.modelview, this.sandSurface.modelview, [0, LD29.SAND_DEPTH, 0]);
}

LD29.prototype.initState = function() {
  this.tick = 0;
  this.inputX = 0;
  this.inputY = 0;
  this.leftDown = false;
  this.diveDown = false;
  this.rightDown = false;
}

LD29.prototype.wrap = function(func) {
  var otherThis = this;
  return function() {func.apply(otherThis, arguments);}
}

LD29.prototype.handleMouseMove = function(evt) {
  newX = (evt.clientX / this.canvas.width - 0.5);
  newY = (evt.clientY / this.canvas.height - 0.5);
  this.inputX = newX;
  this.inputY = newY;
}

LD29.prototype.handleKeyDown = function(evt) {
  evt = evt || window.event;
  switch (evt.keyCode) {
    case 65:
      this.leftDown = true;
      break;
    case 83:
      this.diveDown = true;
      break;
    case 68:
      this.rightDown = true;
      break;
  }
}

LD29.prototype.handleKeyUp = function(evt) {
  evt = evt || window.event;
  switch (evt.keyCode) {
    case 65:
      this.leftDown = false;
      break;
    case 83:
      this.diveDown = false;
      break;
    case 68:
      this.rightDown = false;
      break;
  }
  if ((!this.leftDown) && (!this.diveDown) && (!this.rightDown)) {
    this.maskKeys = false;
  }
}

LD29.prototype.start = function() {
  window.onload = this.wrap(this.render);
  this.canvas.onmousemove = this.wrap(this.handleMouseMove);
  window.onkeydown = this.wrap(this.handleKeyDown);
  window.onkeyup = this.wrap(this.handleKeyUp);
  this.lastTick = Date.now();
  window.setInterval(this.wrap(LD29.prototype.maybeTick), LD29.FRAME_PERIOD_MS);
}

LD29.prototype.maybeTick = function() {
  var now = Date.now();
  while (now >= this.lastTick + LD29.FRAME_PERIOD_MS) {
    this.lastTick += LD29.FRAME_PERIOD_MS;
    this.tick++;
    this.ticked(this.tick);
  } 
}

LD29.prototype.ticked = function(tick) {
  if (!this.frog && (this.leftDown || this.diveDown || this.rightDown) && !this.maskKeys) {
    this.frog = new LD29.Frog();
    this.clearMessage();
    this.sprites.push(this.frog);
  }
  if (this.frog) {
    if (Math.random() < 0.005) {
      this.sprites.push(new LD29.Duck(this));
    }
    if (Math.random() < 0.005) {
      this.sprites.push(new LD29.Treasure());
    }
    if (Math.random() < 0.005) {
      this.sprites.push(new LD29.Plant());
    }
    if (Math.random() < 0.005) {
      this.sprites.push(new LD29.Fish());
    }
    this.frog.controls(this.leftDown, this.diveDown, this.rightDown);
    this.displayHUD(this.frog.score, this.frog.oxygen);
  }
  for (var ii = 0; ii < this.sprites.length; ii++) {
    var sprite = this.sprites[ii];
    if ((sprite.deathTick) && (sprite.deathTick <= tick)) {
      this.sprites.splice(ii, 1);
      if (sprite == this.frog) {
        this.frog = null;
        for (var jj = 0; jj < this.sprites.length; jj++) {
          this.sprites[jj].deathTick = this.tick + 11;
        }
        this.addInitialSprites();
        this.maskKeys = this.leftDown || this.diveDown || this.rightDown;
      }
      ii--;
    } else {
      this.sprites[ii].tick(tick);
    }
  }
  for (var ii = 0; ii < this.sprites.length; ii++) {
    var sprite1 = this.sprites[ii];
    var sprite1Pos = [sprite1.modelview[12], sprite1.modelview[13], sprite1.modelview[14]];
    for (var jj = ii + 1; jj < this.sprites.length; jj++) {
      var sprite2 = this.sprites[jj];
      var sprite2Pos = [sprite2.modelview[12], sprite2.modelview[13], sprite2.modelview[14]];
      if (vec3.distance(sprite1Pos, sprite2Pos) < 2.0) {
        sprite1.collide(sprite2, sprite1Pos, sprite2Pos, this.tick);
        sprite2.collide(sprite1, sprite2Pos, sprite1Pos, this.tick);
      }
    }
  }
  this.waterSurface.tick(tick);
  this.sandSurface.tick(tick);
}

LD29.prototype.updateViewport = function() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  this.gl.viewport(0, 0, canvas.width, canvas.height)
}

LD29.prototype.updateProjection = function() {
  var sqrtAspect = Math.sqrt(canvas.width / canvas.height);
  mat4.frustum(this.projection, -sqrtAspect * LD29.HALF_FOV, sqrtAspect * LD29.HALF_FOV, -LD29.HALF_FOV/sqrtAspect, LD29.HALF_FOV/sqrtAspect, 1, 1000);
  var target = this.frog ? [this.frog.modelview[12], this.frog.modelview[13], this.frog.modelview[14]] : [(LD29.PLAY_AREA[0] + LD29.PLAY_AREA[2]) / 2, LD29.WATER_DEPTH + 2, (LD29.PLAY_AREA[1] + LD29.PLAY_AREA[3]) / 2];
  this.eye[1] = target[1] - LD29.WATER_DEPTH;
  mat4.lookAt(this.matrix, this.eye, target, [0, 1, 0]);
  mat4.multiply(this.projection, this.projection, this.matrix);
}

LD29.prototype.render = function() {
  this.updateViewport();
  this.updateProjection();
  var gl = this.gl;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.BLEND);
  for (var ii = 0; ii < this.sprites.length; ii++) {
    var sprite = this.sprites[ii];
    sprite.render(this.projection, this.eye);
  }
  this.sandSurface.render(this.projection, this.eye);
  var hudVector = [0, 0, 0];
  if (this.frog) {
    hudVector = [this.frog.modelview[12] - (LD29.PLAY_AREA[0] + LD29.PLAY_AREA[2]) / 2, this.frog.modelview[13] - (LD29.WATER_DEPTH + 2), this.frog.modelview[14] - (LD29.PLAY_AREA[1] + LD29.PLAY_AREA[3]) / 2];
  }
  for (var ii = 0; ii < this.hudSprites.length; ii++) {
    var sprite = this.hudSprites[ii];
    mat4.identity(sprite.animation);
    mat4.translate(sprite.animation, sprite.animation, hudVector);
    sprite.render(this.projection, this.eye);
  }
  gl.enable(gl.BLEND);
  this.waterSurface.render(this.projection, this.eye);
  window.requestAnimFrame(this.wrap(this.render));
}

LD29.Surface = function(surfaceRenderer, timeFactor, baseColor, highlightColor, modelview) {
  this.surfaceRenderer = surfaceRenderer;
  this.timeFactor = timeFactor;
  this.xFreq = [Math.random() * 0.2, Math.random() * 0.2 + 0.2, Math.random() * 0.2 + 0.4, Math.random() * 0.2 + 0.2];
  this.xPhase = [Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI];
  this.xAmp = [Math.random() * Math.PI, Math.random() * Math.PI / 2, Math.random() * Math.PI / 4, Math.random() * Math.PI / 8];
  this.zFreq = [Math.random() * 0.2, Math.random() * 0.2 + 0.2, Math.random() * 0.2 + 0.4, Math.random() * 0.2 + 0.2];
  this.zPhase = [Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI];
  this.zAmp = [Math.random() * Math.PI, Math.random() * Math.PI / 2, Math.random() * Math.PI / 4, Math.random() * Math.PI / 8];
  this.baseColor = baseColor;
  this.highlightColor = highlightColor;
  this.modelview = modelview || mat4.create();
}

LD29.Surface.prototype.tick = function(tick) {
  this.lastTick = tick;
}

LD29.Surface.prototype.render = function(projection, eye) {
  this.surfaceRenderer.render(projection, eye,
                              this.modelview,
                              this.lastTick * this.timeFactor,
                              this.xFreq, this.xPhase, this.xAmp,
                              this.zFreq, this.zPhase, this.zAmp,
                              this.baseColor, this.highlightColor);
}

LD29.SurfaceRenderer = function(gl) {
  this.gl = gl;
  this.program = new LD29.Program(
    gl,
    ["uniform mat4 matrix;",
     "uniform mediump float thetaT;",
     "uniform mediump vec4 xFreq;",
     "uniform mediump vec4 xPhase;",
     "uniform mediump vec4 xAmp;",
     "uniform mediump vec4 zFreq;",
     "uniform mediump vec4 zPhase;",
     "uniform mediump vec4 zAmp;",
     "attribute vec3 pos;",
     "varying highp vec3 pos2;",
     "varying highp vec3 normal;",
     "void main() {",
     "  mediump float thetaX = dot(cos(dot(pos.xxxx, xFreq) + xPhase + thetaT), xAmp);",
     "  mediump float thetaZ = dot(cos(dot(pos.zzzz, zFreq) + zPhase + thetaT), zAmp);",
     "  pos2 = pos;",
     "  pos2.y += (sin(thetaX) + sin(thetaZ)) * 0.05;",
     "  gl_Position = matrix * vec4(pos2, 1);",
     "  normal = normalize(vec3(sin(thetaX), cos(thetaX) + cos(thetaZ), sin(thetaZ)));",
     "}"],
    ["uniform highp vec3 rayOrigin;",
     "uniform lowp vec4 baseColor;",
     "uniform lowp vec4 highlightColor;",
     "varying highp vec3 pos2;",
     "varying highp vec3 normal;",
     "void main() {",
     "  gl_FragColor = baseColor + highlightColor * dot(normalize(pos2 - rayOrigin), normal);",
     "}"]);
  if (!LD29.SurfaceRenderer.SURFACE_VERTICES) {
    var vertices = [];
    var dx = LD29.SurfaceRenderer.X_STEP;
    var dz = LD29.SurfaceRenderer.Z_STEP;
    for (var x = LD29.PLAY_AREA[0]; x < LD29.PLAY_AREA[2]; x += dx) {
      for (var z = LD29.PLAY_AREA[1]; z < LD29.PLAY_AREA[3]; z += dz) {
        vertices.push(x, 0, z, x, 0, z + dz, x + dx, 0, z);
        vertices.push(x + dx, 0, z, x, 0, z + dz, x + dx, 0, z + dz);
      }
    }
    LD29.SurfaceRenderer.SURFACE_VERTICES = vertices;
  }
  this.surfaceVertices = new LD29.StaticBuffer(this.gl, LD29.SurfaceRenderer.SURFACE_VERTICES);
  this.matrix = mat4.create();
  this.vector = vec3.create();
}

LD29.SurfaceRenderer.X_STEP = 2.0;
LD29.SurfaceRenderer.Z_STEP = 2.0;

LD29.SurfaceRenderer.prototype.render = function(projection, eye, modelview, thetaT, xFreq, xPhase, xAmp, zFreq, zPhase, zAmp, baseColor, highlightColor) {
  var gl = this.gl;
  mat4.invert(this.matrix, modelview);
  vec3.transformMat4(this.vector, eye, this.matrix);
  mat4.multiply(this.matrix, projection, modelview);
  this.program.use({matrix: this.matrix,
                    thetaT: thetaT,
                    xFreq: xFreq,
                    xPhase: xPhase,
                    xAmp: xAmp,
                    zFreq: zFreq,
                    zPhase: zPhase,
                    zAmp: zAmp,
                    rayOrigin: this.vector,
                    baseColor: baseColor,
                    highlightColor: highlightColor},
                   {pos: this.surfaceVertices});
  gl.drawArrays(gl.TRIANGLES, 0, LD29.SurfaceRenderer.SURFACE_VERTICES.length / 3);
}

LD29.Sprite3DRenderer = function(gl) {
  this.gl = gl;
  // Loosely based on algorithm at http://prideout.net/blog/?p=64
  this.program = new LD29.Program(
    gl,
    ["uniform mat4 matrix;",
     "attribute vec3 pos;",
     "varying highp vec3 nearPosition;",
     "void main() {",
     "  gl_Position = matrix * vec4(pos, 1);",
     "  nearPosition = pos;",
     "}"],
    ["const lowp float VOXEL_POSITION_MIN = 0.0;",
     "const lowp float VOXEL_POSITION_MAX = 7.0;",
     "const int MAX_ITERATIONS = 22;", // A ray can pass through at most 22 cells (intuitively, but verified through testing)
     "uniform highp vec3 rayOrigin;",
     "uniform mediump vec2 scale;",
     "uniform mediump vec2 offset;",
     "uniform sampler2D voxelMap;",
     "varying highp vec3 nearPosition;",
     "highp float min3(highp vec3 v) {",
     "  return min(min(v.x, v.y), v.z);",
     "}",
     "highp float max3(highp vec3 v) {",
     "  return max(max(v.x, v.y), v.z);",
     "}",
     "highp vec3 intersection(highp vec3 rayOrigin, highp vec3 rayDirection, highp vec3 bound) {",
     " return (bound - rayOrigin) / rayDirection;",
     "}",
     "highp vec3 nearPositionToFaceNormal(highp vec3 nearPosition, lowp vec3 rayDirection) {",
     "  return step(max3(abs(nearPosition)), abs(nearPosition)) * sign(rayDirection);",
     "}",
     "highp vec3 intersectionToFaceNormal(highp vec3 intersection, lowp vec3 rayDirection) {",
     "  return step(-min3(intersection), -intersection) * sign(rayDirection);",
     "}",
     "lowp vec2 voxelPositionToTextureCoord(lowp vec3 voxelPosition) {",
     "  return vec2((voxelPosition.x + 0.5) / 64.0 + (VOXEL_POSITION_MAX - voxelPosition.z) / 8.0, (VOXEL_POSITION_MAX - voxelPosition.y + 0.5) / 8.0);",
     "}",
     "lowp vec3 voxelPositionToBound(lowp vec3 voxelPosition, lowp vec3 rayDirection) {",
     "  return (voxelPosition + (sign(rayDirection) * 0.5 + 0.5)) / 8.0 - 0.5;",
     "}",
     "lowp vec3 intersectedFaceNormal(highp vec3 rayOrigin, highp vec3 rayDirection, highp vec3 bound) {",
     "  highp vec3 intersection = intersection(rayOrigin, rayDirection, bound);",
     "  return intersectionToFaceNormal(intersection, rayDirection);",
     "}",
     "lowp vec3 clampVoxelPosition(lowp vec3 voxelPosition) {",
     "  return clamp(voxelPosition, VOXEL_POSITION_MIN, VOXEL_POSITION_MAX);",
     "}",
     "bool voxelPositionInRange(lowp vec3 voxelPosition) {",
     "  return clampVoxelPosition(voxelPosition) == voxelPosition;",
     "}",
     "lowp float lighting(highp vec3 rayDirection, lowp vec3 faceNormal) {",
     "  return dot(faceNormal, rayDirection) * 0.5 + 0.5;",
     "}",
     "void main() {",
     "  highp vec3 rayDirection = normalize(nearPosition - rayOrigin);",
     "  lowp vec3 faceNormal = nearPositionToFaceNormal(nearPosition, rayDirection);",
     "  lowp vec3 voxelPosition = clampVoxelPosition(floor((nearPosition + 0.5) * 8.0));",
     "  for (int iteration = 0; iteration < MAX_ITERATIONS; ++iteration) {",
     "    lowp vec4 voxelColor = texture2D(voxelMap, voxelPositionToTextureCoord(voxelPosition) * scale + offset);",
     "    if (voxelColor.a > 0.0) {",
     "      gl_FragColor = vec4(voxelColor.rgb * lighting(rayDirection, faceNormal), voxelColor.a);",
     "      return;",
     "    }",
     "    lowp vec3 bound = voxelPositionToBound(voxelPosition, rayDirection);",
     "    faceNormal = intersectedFaceNormal(rayOrigin, rayDirection, bound);",
     "    voxelPosition += faceNormal;", 
     "    if (!voxelPositionInRange(voxelPosition)) {",
     "      discard;",
     "    }",
     "  }",
     "  discard;",
     "}"]);
  this.cubeVertices = new LD29.StaticBuffer(this.gl, LD29.Sprite3DRenderer.CUBE_VERTICES);
  this.matrix = mat4.create();
  this.vector = vec3.create();
}

LD29.Sprite3DRenderer.CUBE_VERTICES = [-0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,
                                        0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5,
                                        0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5,  0.5,
                                        0.5, -0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,
                                        0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5, -0.5,  0.5,
                                       -0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,
                                       -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5, -0.5, -0.5,
                                       -0.5, -0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5,
                                       -0.5, -0.5,  0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,
                                       -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5,
                                       -0.5,  0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5, -0.5,
                                       -0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5,  0.5, -0.5];

LD29.Sprite3DRenderer.prototype.render = function(voxelMap, scale, offset, projection, eye, modelview) {
  var gl = this.gl;
  mat4.invert(this.matrix, modelview);
  vec3.transformMat4(this.vector, eye, this.matrix);
  mat4.multiply(this.matrix, projection, modelview);
  voxelMap.use(gl.TEXTURE0);
  this.program.use({matrix: this.matrix,
                    rayOrigin: this.vector,
                    voxelMap: 0,
                    scale: scale,
                    offset: offset},
                   {pos: this.cubeVertices});
  gl.drawArrays(gl.TRIANGLES, 0, LD29.Sprite3DRenderer.CUBE_VERTICES.length / 3);
}

LD29.Sprite3D = function(sprite3dRenderer, voxelMap, spinOnSpawn, scaleOnSpawn, spinOnDie, scaleOnDie, scale, offset, modelview, animation) {
  if (arguments.length > 0) {
    this.sprite3dRenderer = sprite3dRenderer;
    this.voxelMap = voxelMap;
    this.spinOnSpawn = spinOnSpawn;
    this.scaleOnSpawn = scaleOnSpawn;
    this.spinOnDie = spinOnDie;
    this.scaleOnDie = scaleOnDie;
    this.scale = scale || [1, 1];
    this.offset = offset || [0, 0];
    this.modelview = modelview || mat4.create();
    this.animation = animation || mat4.create();
    this.matrix = mat4.create();
  }
}

LD29.Sprite3D.prototype.tick = function(tick) {
  this.firstTick = this.firstTick || tick;
  mat4.identity(this.animation);
  if (this.spinOnSpawn) {
    mat4.rotateY(this.animation, this.animation, (tick - this.firstTick + 1 > 10) ? 0.0 : (tick - this.firstTick + 1 - 10) * Math.PI / 5);
  }
  if (this.scaleOnSpawn) {
    var scalar = (tick - this.firstTick + 1 > 10) ? 1.0 : (tick - this.firstTick + 1) / 10;
    mat4.scale(this.animation, this.animation, [scalar, scalar, scalar]);
  }
  if (this.deathTick) {
    if (this.spinOnDie) {
      mat4.rotateY(this.animation, this.animation, (this.deathTick - tick) * Math.PI / 5);
    }
    if (this.scaleOnDie) {
      var scalar = (this.deathTick - tick) / 10;
      mat4.scale(this.animation, this.animation, [scalar, scalar, scalar]);
    }
  }
}

LD29.Sprite3D.prototype.selectTarget = function(xzRange, sprite) {
  if (sprite &&
      ((Math.random() > 0.75) ||
       (Math.pow(this.modelview[12] - sprite.modelview[12], 2) + Math.pow(this.modelview[14] - sprite.modelview[14], 2) < 225))) {
    this.targetSprite = sprite;
    this.target = null;
  } else {
    this.targetSprite = null;
    this.target = [Math.random() * (xzRange[2] - xzRange[0]) + xzRange[0], this.modelview[13], Math.random() * (xzRange[3] - xzRange[1]) + xzRange[1]];
  }
}

LD29.Sprite3D.prototype.bearTowardsTarget = function() {
  var target = this.target;
  if (this.targetSprite) {
    target = [this.targetSprite.modelview[12], this.modelview[13], this.targetSprite.modelview[14]];
  }
  var dx = target[0] - this.modelview[12];
  var dz = target[2] - this.modelview[14];
  var d = Math.sqrt(dx * dx + dz * dz);
  dx /= d;
  dz /= d;
  mat4.rotateY(this.modelview, this.modelview, Math.PI * (dx * this.modelview[10] - dz * this.modelview[8]) * 0.1);
}

LD29.Sprite3D.prototype.collide = function(otherSprite, thisPos, otherPos, tick) {};

LD29.Sprite3D.prototype.render = function(projection, eye) {
  mat4.multiply(this.matrix, this.modelview, this.animation);
  this.sprite3dRenderer.render(this.voxelMap, this.scale, this.offset, projection, eye, this.matrix);
}

LD29.Sprite3D.prototype.positionRandomly = function(xzRange, y, rRange) {
  rRange = rRange || [0, Math.PI * 2];
  mat4.translate(this.modelview, this.modelview, [Math.random() * (xzRange[2] - xzRange[0]) + xzRange[0], y, Math.random() * (xzRange[3] - xzRange[1]) + xzRange[1]]);
  mat4.rotateY(this.modelview, this.modelview, Math.random() * (rRange[1] - rRange[0]) + rRange[0]);
}

LD29.Duck = function(ld29) {
  LD29.Sprite3D.call(this, LD29.Duck.sprite3dRenderer, LD29.Duck.voxelMap, false, true, true, true);
  this.ld29 = ld29;
  this.positionRandomly(LD29.PLAY_AREA, LD29.WATER_DEPTH + 10);
  this.phase = Math.random() * Math.PI * 2;
  this.yv = 0;
  this.selectTarget(LD29.PLAY_AREA, ld29.frog);
}
LD29.Duck.prototype = new LD29.Sprite3D();

LD29.Duck.init = function(sprite3dRenderer) {
  LD29.Duck.sprite3dRenderer = sprite3dRenderer;
  LD29.Duck.voxelMap = new LD29.Texture(sprite3dRenderer.gl, "duck.voxelmap.png");
}

LD29.Duck.prototype.tick = function(tick) {
  LD29.Sprite3D.prototype.tick.call(this, tick);
  if ((this.modelview[12] < LD29.PLAY_AREA[0] + 3 && this.modelview[8] < 0) ||
      (this.modelview[12] > LD29.PLAY_AREA[2] - 3 && this.modelview[8] > 0) ||
      (this.modelview[14] < LD29.PLAY_AREA[1] + 3 && this.modelview[10] < 0) ||
      (this.modelview[14] > LD29.PLAY_AREA[3] - 3 && this.modelview[10] > 0)) {
    mat4.rotateY(this.modelview, this.modelview, -Math.PI / 32);
  } else {
    if (Math.random() > 0.995) {
      this.selectTarget(LD29.PLAY_AREA, this.ld29.frog);
    }
    this.bearTowardsTarget();
  }
  if (this.modelview[13] > LD29.WATER_DEPTH + 1.0) {
    this.yv *= 0.98;
    this.yv -= 0.01;
  } else {
    mat4.rotateX(this.animation, this.animation, -Math.cos(tick / Math.PI / 3 + this.phase) * Math.PI / 10);
    this.yv *= 0.95;
    if (this.modelview[13] > LD29.WATER_DEPTH) {
      this.yv += (this.modelview[13] - LD29.WATER_DEPTH - 0.5) * 0.002; 
    } else {
      this.yv += 0.01;
    }
    mat4.translate(this.modelview, this.modelview, [0, 0, Math.sin(tick / Math.PI / 3 + this.phase) * 0.1 + 0.075]);
  }
  mat4.translate(this.modelview, this.modelview, [0, this.yv, 0]);
}

LD29.Treasure = function() {
  LD29.Sprite3D.call(this, LD29.Treasure.sprite3dRenderer, LD29.Treasure.voxelMap, true, true, true, true);
  this.positionRandomly(LD29.PLAY_AREA, LD29.SAND_DEPTH + 0.5, [-Math.PI / 4, Math.PI / 4]);
}
LD29.Treasure.prototype = new LD29.Sprite3D();

LD29.Treasure.init = function(sprite3dRenderer) {
  LD29.Treasure.sprite3dRenderer = sprite3dRenderer;
  LD29.Treasure.voxelMap = new LD29.Texture(sprite3dRenderer.gl, "treasure.voxelmap.png");
}

LD29.Plant = function() {
  LD29.Sprite3D.call(this, LD29.Plant.sprite3dRenderer, LD29.Plant.voxelMap, true, true, true, true);
  this.positionRandomly(LD29.PLAY_AREA, LD29.SAND_DEPTH + 0.5);
}
LD29.Plant.prototype = new LD29.Sprite3D();

LD29.Plant.init = function(sprite3dRenderer) {
  LD29.Plant.sprite3dRenderer = sprite3dRenderer;
  LD29.Plant.voxelMap = new LD29.Texture(sprite3dRenderer.gl, "plant.voxelmap.png");
}

LD29.Fish = function() {
  LD29.Sprite3D.call(this, LD29.Fish.sprite3dRenderer, LD29.Fish.voxelMap, false, true, false, true);
  this.positionRandomly(LD29.PLAY_AREA, Math.random() * (LD29.WATER_DEPTH - LD29.SAND_DEPTH - 2) + LD29.SAND_DEPTH + 0.5);
  this.phase = Math.random() * Math.PI * 2;
  this.selectTarget(LD29.PLAY_AREA);
}
LD29.Fish.prototype = new LD29.Sprite3D();

LD29.Fish.init = function(sprite3dRenderer) {
  LD29.Fish.sprite3dRenderer = sprite3dRenderer;
  LD29.Fish.voxelMap = new LD29.Texture(sprite3dRenderer.gl, "fish.voxelmap.png");
}

LD29.Fish.prototype.tick = function(tick) {
  LD29.Sprite3D.prototype.tick.call(this, tick);
  if ((this.modelview[12] < LD29.PLAY_AREA[0] + 3 && this.modelview[8] < 0) ||
      (this.modelview[12] > LD29.PLAY_AREA[2] - 3 && this.modelview[8] > 0) ||
      (this.modelview[14] < LD29.PLAY_AREA[1] + 3 && this.modelview[10] < 0) ||
      (this.modelview[14] > LD29.PLAY_AREA[3] - 3 && this.modelview[10] > 0)) {
    mat4.rotateY(this.modelview, this.modelview, Math.PI / 32);
  } else {
    if (Math.random() > 0.995) {
      this.selectTarget(LD29.PLAY_AREA);
    }
    this.bearTowardsTarget();
  }
  mat4.scale(this.animation, this.animation, [1.0 - Math.sin(tick / Math.PI / 3 + this.phase) * 0.15, 1.0 - Math.sin(tick / Math.PI / 3 + this.phase) * 0.15, 1.0 + Math.sin(tick / Math.PI / 3 + this.phase) *0.3]);
  mat4.translate(this.modelview, this.modelview, [0, 0, Math.sin(tick / Math.PI / 3 + this.phase) * 0.1 + 0.075]);
}

LD29.Frog = function() {
  LD29.Sprite3D.call(this, LD29.Plant.sprite3dRenderer, LD29.Frog.voxelMap, false, true, true, true);
  mat4.translate(this.modelview, this.modelview, [(LD29.PLAY_AREA[0] + LD29.PLAY_AREA[2]) / 2, LD29.WATER_DEPTH + 2, (LD29.PLAY_AREA[1] + LD29.PLAY_AREA[3]) / 2]);
  this.phase = Math.random() * Math.PI * 2;
  this.yv = 0;
  this.oxygen = 1000;
  this.score = 0;
}
LD29.Frog.prototype = new LD29.Sprite3D();

LD29.Frog.init = function(sprite3dRenderer) {
  LD29.Frog.sprite3dRenderer = sprite3dRenderer;
  LD29.Frog.voxelMap = new LD29.Texture(sprite3dRenderer.gl, "frog.voxelmap.png");
}

LD29.Frog.prototype.controls = function(leftDown, diveDown, rightDown) {
  if (leftDown) {
    mat4.rotateY(this.modelview, this.modelview, Math.PI / 30);
  }
  if (rightDown) {
    mat4.rotateY(this.modelview, this.modelview, -Math.PI / 30);
  }
  if (diveDown &&
      (this.modelview[13] > LD29.SAND_DEPTH + 0.5) &&
      (this.oxygen > 0)) {
    this.yv += -0.05;
  }
}

LD29.Frog.prototype.collide = function(otherSprite, thisPos, otherPos, tick) {
  if (!this.deathTick && !otherSprite.deathTick) {
    if (otherSprite instanceof(LD29.Duck)) {
      if (thisPos[1] > otherPos[1] + 0.8) {
        otherSprite.deathTick = tick + 11;
        this.score++;
      } else {
        this.deathTick = tick + 11;
      }
    } else if (otherSprite instanceof(LD29.Treasure)) {
      otherSprite.deathTick = tick + 11;
      this.score++;
    } else if (otherSprite instanceof(LD29.Plant)) {
      otherSprite.deathTick = tick + 11;
      this.oxygen = Math.min(this.oxygen + 500, 1000);
    }
  }
}

LD29.Frog.prototype.tick = function(tick) {
  LD29.Sprite3D.prototype.tick.call(this, tick);
  mat4.scale(this.animation, this.animation, [1.0 - Math.sin(tick / Math.PI / 3 + this.phase) * 0.15, 1.0 - Math.sin(tick / Math.PI / 3 + this.phase) * 0.15, 1.0 + Math.sin(tick / Math.PI / 3 + this.phase) *0.3]);
  mat4.translate(this.modelview, this.modelview, [0, 0, Math.sin(tick / Math.PI / 3 + this.phase) * 0.05 + 0.2]);
  this.modelview[12] = Math.max(Math.min(this.modelview[12], LD29.PLAY_AREA[2] - 3), LD29.PLAY_AREA[0] + 3);
  this.modelview[14] = Math.max(Math.min(this.modelview[14], LD29.PLAY_AREA[3] - 3), LD29.PLAY_AREA[1] + 3);
  if (this.modelview[13] > LD29.WATER_DEPTH - 2.5) {
    this.oxygen = Math.min(this.oxygen + 1, 1000);
  } else {
    this.oxygen = Math.max(this.oxygen - 5, 0);
  }
  if (this.modelview[13] > LD29.WATER_DEPTH + 1.0) {
    this.yv *= 0.98;
    this.yv -= 0.01;
  } else {
    this.yv *= 0.99;
    if (this.modelview[13] > LD29.WATER_DEPTH) {
      this.yv += (this.modelview[13] - LD29.WATER_DEPTH - 0.5) * 0.002; 
    } else if (this.modelview[13] > LD29.SAND_DEPTH + 1.0) {
      this.yv += 0.01;
    } else {
      this.yv = Math.max(this.yv, 0.01);
    }
  }
  mat4.translate(this.modelview, this.modelview, [0, this.yv, 0]);
  this.modelview[13] = Math.max(this.modelview[13], LD29.SAND_DEPTH + 1.0); 
}

LD29.Font = function(character, position) {
  var code = character.charCodeAt(0);
  code = ((code >= LD29.Font.CHAR_A) && (code <= LD29.Font.CHAR_Z)) ? code - LD29.Font.CHAR_A :
         ((code >= LD29.Font.CHAR_0) && (code <= LD29.Font.CHAR_9)) ? code - LD29.Font.CHAR_0 + 26 :
         39;
  LD29.Sprite3D.call(this, LD29.Font.sprite3dRenderer, LD29.Font.voxelMap, true, true, true, true, [1, 1 / 40], [0, code / 40]);
  mat4.translate(this.modelview, this.modelview, [position[0] * 1.5 - 15, position[1] * -1.5 - 23, -50]);
}
LD29.Font.prototype = new LD29.Sprite3D();

LD29.Font.CHAR_A = "A".charCodeAt(0);
LD29.Font.CHAR_Z = "Z".charCodeAt(0);
LD29.Font.CHAR_0 = "0".charCodeAt(0);
LD29.Font.CHAR_9 = "9".charCodeAt(0);

LD29.Font.init = function(sprite3dRenderer) {
  LD29.Font.sprite3dRenderer = sprite3dRenderer;
  LD29.Font.voxelMap = new LD29.Texture(sprite3dRenderer.gl, "font.voxelmap.png");
}

LD29.Texture = function(gl, url) {
  this.gl = gl;
  this.id = gl.createTexture();
  var image = new Image();
  var otherThis = this;
  image.onload = function() { otherThis.set(image); }
  image.src = url;
}

LD29.Texture.prototype.set = function(image) {
  var gl = this.gl;
  gl.bindTexture(gl.TEXTURE_2D, this.id);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
}

LD29.Texture.prototype.use = function(channel) {
  var gl = this.gl;
  channel = (channel) ? channel : gl.TEXTURE0;
  gl.activeTexture(channel);
  this.gl.bindTexture(gl.TEXTURE_2D, this.id);
}

LD29.Shader = function(gl, type, src) {
  if (arguments.length > 0)
  {
    this.gl = gl;
    var id = gl.createShader(type);
    gl.shaderSource(id, (src instanceof Array) ? src.join("\n") : src);
    gl.compileShader(id);
    if (!gl.getShaderParameter(id, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(id));
    }
    this.id = id;
  }
}

LD29.VertexShader = function(gl, src) {
  LD29.Shader.call(this, gl, gl.VERTEX_SHADER, src);
}
LD29.VertexShader.prototype = new LD29.Shader();

LD29.FragmentShader = function(gl, src) {
  LD29.Shader.call(this, gl, gl.FRAGMENT_SHADER, src);
}
LD29.FragmentShader.prototype = new LD29.Shader();

LD29.Program = function(gl, vertexShader, fragmentShader) {
  this.gl = gl;
  var id = gl.createProgram();
  vertexShader = (vertexShader instanceof LD29.Shader) ? vertexShader  : new LD29.VertexShader(gl, vertexShader);
  fragmentShader = (fragmentShader instanceof LD29.Shader) ? fragmentShader : new LD29.FragmentShader(gl, fragmentShader); 
  gl.attachShader(id, vertexShader.id);
  gl.attachShader(id, fragmentShader.id);
  gl.linkProgram(id);
  if (!this.gl.getProgramParameter(id, gl.LINK_STATUS)) {
    console.error(this.gl.getProgramInfoLog(id));
  }
  this.id = id;
}

LD29.Program.prototype.use = function(uniforms, attributes) {
  var gl = this.gl;
  var id = this.id;
  gl.useProgram(id);
  var numUniforms = gl.getProgramParameter(id, gl.ACTIVE_UNIFORMS);
  for (var uniformIndex = 0; uniformIndex < numUniforms; uniformIndex++) {
    var uniform = gl.getActiveUniform(id, uniformIndex);
    var uniformName = uniform.name.replace(/\[[0-9]+\]$/, "");
    var value = uniforms[uniformName];
    if (value != null) {
      value = ((value instanceof Array) || (value instanceof Int32Array) || (value instanceof Float32Array)) ? value : [value];
      var location = gl.getUniformLocation(id, uniformName);
      switch (uniform.type) {
        case gl.BOOL:
        case gl.INT:
        case gl.SAMPLER_2D:
        case gl.SAMPLER_CUBE:
          gl.uniform1iv(location, (value instanceof Int32Array) ? value : new Int32Array(value));
          break;
        case gl.FLOAT:
          gl.uniform1fv(location, (value instanceof Float32Array) ? value : new Float32Array(value));
          break;
        case gl.BOOL_VEC2:
        case gl.INT_VEC2:
          gl.uniform2iv(location, (value instanceof Int32Array) ? value : new Int32Array(value));
          break;
        case gl.FLOAT_VEC2:
          gl.uniform2fv(location, (value instanceof Float32Array) ? value : new Float32Array(value));
          break;
        case gl.BOOL_VEC3:
        case gl.INT_VEC3:
          gl.uniform3iv(location, (value instanceof Int32Array) ? value : new Int32Array(value));
          break;
        case gl.FLOAT_VEC3:
          gl.uniform3fv(location, (value instanceof Float32Array) ? value : new Float32Array(value));
          break;
        case gl.BOOL_VEC4:
        case gl.INT_VEC4:
          gl.uniform4iv(location, (value instanceof Int32Array) ? value : new Int32Array(value));
          break;
        case gl.FLOAT_VEC4:
          gl.uniform4fv(location, (value instanceof Float32Array) ? value : new Float32Array(value));
          break;
        case gl.FLOAT_MAT2:
          gl.uniformMatrix2fv(location, false, (value instanceof Float32Array) ? value : new Float32Array(value));
          break;
        case gl.FLOAT_MAT3:
          gl.uniformMatrix3fv(location, false, (value instanceof Float32Array) ? value : new Float32Array(value));
          break;
        case gl.FLOAT_MAT4:
          gl.uniformMatrix4fv(location, false, (value instanceof Float32Array) ? value : new Float32Array(value));
          break;
      }
    } else {
      console.error("No value for uniform " + uniformName);
    }
  }
  var numAttributes = gl.getProgramParameter(id, gl.ACTIVE_ATTRIBUTES);
  for (var attributeIndex = 0; attributeIndex < numAttributes; attributeIndex++) {
    var attribute = gl.getActiveAttrib(this.id, attributeIndex);
    var attributeName = attribute.name.replace(/\[[0-9]+\]$/, "");
    var value = attributes[attributeName];
    if (value != null) {
      value = (value instanceof LD29.Buffer) ? value : new LD29.DynamicBuffer(gl, value);
      gl.bindBuffer(gl.ARRAY_BUFFER, value.id);
      var location = gl.getAttribLocation(id, attributeName);
      gl.enableVertexAttribArray(location);
      switch (attribute.type) {
        case gl.FLOAT:
          gl.vertexAttribPointer(location, 1, gl.FLOAT, false, 0, 0); 
          break;
        case gl.FLOAT_VEC2:
          gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0); 
          break;
        case gl.FLOAT_VEC3:
          gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0); 
          break;
        case gl.FLOAT_VEC4:
          gl.vertexAttribPointer(location, 4, gl.FLOAT, false, 0, 0); 
          break;
      }
    } else {
      console.error("No value for attribute " + attributeName);
    }
  }
}

LD29.Buffer = function(gl, type, value) {
  if (arguments.length > 0) {
    this.gl = gl;
    this.type = type;
    this.id = gl.createBuffer();
    this.set(value);
  }
}

LD29.Buffer.prototype.set = function(value) {
  value = ((value instanceof Array) || (value instanceof Float32Array)) ? value : [value];
  value = (value instanceof Float32Array) ? value : new Float32Array(value);
  var gl = this.gl;
  gl.bindBuffer(gl.ARRAY_BUFFER, this.id);
  gl.bufferData(gl.ARRAY_BUFFER, value, this.type);
}

LD29.StaticBuffer = function(gl, value) {
  LD29.Buffer.call(this, gl, gl.STATIC_DRAW, value);
}
LD29.StaticBuffer.prototype = new LD29.Buffer();

LD29.DynamicBuffer = function(gl, value) {
  LD29.Buffer.call(this, gl, gl.DYNAMIC_DRAW, value);
}
LD29.DynamicBuffer.prototype = new LD29.Buffer();

