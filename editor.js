Editor = function(canvas) {
  this.canvas = canvas;
  this.init();
  this.start();
}

Editor.HALF_FOV = 0.25;
Editor.FRAME_PERIOD_MS = 20;

Editor.prototype.init = function() {
  this.initGL();
  this.initRenderers();
  this.initSprites();
  this.initState();
}

Editor.prototype.initGL = function() {
  var gl = WebGLUtils.setupWebGL(this.canvas);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.BLEND);
  gl.depthMask(true);
  this.gl = gl;
}

Editor.prototype.initRenderers = function() {
  this.eye = vec3.create();
  this.projection = mat4.create();
  this.matrix = mat4.create();
  this.backgroundRenderer = new Editor.BackgroundRenderer(this.gl);
  this.voxelSheetRenderer = new Editor.VoxelSheetRenderer(this.gl);
  Editor.VoxelSheet.init(this.voxelSheetRenderer);
  this.sprite3dRenderer = new Editor.Sprite3DRenderer(this.gl);
  Editor.Sprite3D.init(this.sprite3dRenderer);
}

Editor.prototype.initSprites = function() {
  this.sprites = [];
  this.sprites.push(new Editor.EditableSprite3D(this));
  var sprite = this.sprites[0];
  for (var ii = 0; ii < sprite.voxelSheets.length; ii++) {
    var matrix = sprite.voxelSheets[ii].modelview;
    mat4.translate(matrix, matrix, [0.75, 0.775 - 0.225 * ii, -5]);
    mat4.scale(matrix, matrix, [0.1, 0.1, 0.1]);
  }
}

Editor.prototype.initState = function() {
  this.tick = 0;
  this.inputX = 0;
  this.inputY = 0;
  this.buttons = 0;
  this.dragging = false;
  this.painting = false;
}

Editor.prototype.wrap = function(func) {
  var otherThis = this;
  return function() {func.apply(otherThis, arguments);}
}

Editor.prototype.handleMouseButtons = function(evt) {
  var newButtons = evt.buttons;
  if (!(this.buttons & 1) && (newButtons & 1)) {
    var sprite = this.sprites[0];
    for (var ii = 0; ii < sprite.voxelSheets.length; ii++) {
      var pickCoord = sprite.voxelSheets[ii].pick(this.projection, [this.inputX, this.inputY]);
      if (pickCoord) {
        sprite.setVoxel(pickCoord[0], pickCoord[1], pickCoord[2], 255, 0, 255);
	this.painting = true;
	break;
      }
    }
    if (!this.painting) {
      this.dragging = true;
      this.dragStartX = this.inputX;
      this.dragStartY = this.inputY;
      this.dragStartRotation = mat4.clone(this.sprites[0].rotation);
    }
  } else if ((this.buttons & 1) && !(newButtons & 1)) {
    this.painting = false;
    this.dragging = false;
  }
  this.buttons = newButtons;
}

Editor.prototype.handleMouseMove = function(evt) {
  newX = 2.0 * evt.clientX / this.canvas.width - 1.0;
  newY = -2.0 * evt.clientY / this.canvas.height + 1.0;
  this.inputX = newX;
  this.inputY = newY;
  if (this.painting) {
    var sprite = this.sprites[0];
    for (var z = 0; z < sprite.voxelSheets.length; z++) {
      var pickCoord = sprite.voxelSheets[z].pick(this.projection, [this.inputX, this.inputY]);
      if (pickCoord) {
        sprite.setVoxel(pickCoord[0], pickCoord[1], pickCoord[2], 255, 0, 255);
      }
    }
  } else if (this.dragging) {
    mat4.identity(this.sprites[0].rotation);
    mat4.rotateY(this.sprites[0].rotation, this.sprites[0].rotation, (this.inputX - this.dragStartX) * 5);
    mat4.rotateX(this.sprites[0].rotation, this.sprites[0].rotation, (this.inputY - this.dragStartY) * 5);
    mat4.multiply(this.sprites[0].rotation, this.sprites[0].rotation, this.dragStartRotation);
  }
}

Editor.prototype.handleKeyDown = function(evt) {
  evt = evt || window.event;
  switch (evt.keyCode) {
  }
}

Editor.prototype.handleKeyUp = function(evt) {
  evt = evt || window.event;
  switch (evt.keyCode) {
  }
}

Editor.prototype.start = function() {
  this.loadWorking();
  window.onload = this.wrap(this.render);
  this.canvas.onmousedown = this.wrap(this.handleMouseButtons);
  this.canvas.onmouseup = this.wrap(this.handleMouseButtons);
  this.canvas.onmousemove = this.wrap(this.handleMouseMove);
  window.onkeydown = this.wrap(this.handleKeyDown);
  window.onkeyup = this.wrap(this.handleKeyUp);
  this.lastTickTime = Date.now();
  window.setInterval(this.wrap(Editor.prototype.maybeTick), Editor.FRAME_PERIOD_MS);
  window.onunload = this.wrap(this.saveWorking);
}

Editor.prototype.loadWorking = function() {
  var img = document.createElement("img");
  img.src = decodeURIComponent(document.cookie);
  var sprite = this.sprites[0];
  img.onload = function() {
    var context = sprite.canvas.getCanvas().getContext("2d");
    context.drawImage(img, 0, 0);
    sprite.voxelMap.set(sprite.canvas.getCanvas());
  }
}

Editor.prototype.saveWorking = function() {
  document.cookie = encodeURIComponent(this.sprites[0].toDataURL());
}

Editor.prototype.maybeTick = function() {
  var now = Date.now();
  while (now >= this.lastTickTime + Editor.FRAME_PERIOD_MS) {
    this.lastTickTime += Editor.FRAME_PERIOD_MS;
    this.tick++;
    this.ticked(this.tick);
  } 
}

Editor.prototype.ticked = function(tick) {
  for (var ii = 0; ii < this.sprites.length; ii++) {
    var sprite = this.sprites[ii];
    this.sprites[ii].tick(tick);
  }
}

Editor.prototype.updateViewport = function() {
  //Is this a worthwhile optimization to make?
  if ((canvas.width != window.innerWidth) || (canvas.height != window.innerHeight)) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, canvas.width, canvas.height)
  }
}

Editor.prototype.updateProjection = function() {
  var sqrtAspect = Math.sqrt(canvas.width / canvas.height);
  mat4.frustum(this.projection, -sqrtAspect * Editor.HALF_FOV, sqrtAspect * Editor.HALF_FOV, -Editor.HALF_FOV/sqrtAspect, Editor.HALF_FOV/sqrtAspect, 1, 1000);
}

Editor.prototype.render = function() {
  this.updateViewport();
  this.updateProjection();
  var gl = this.gl;
  gl.disable(gl.DEPTH_TEST);
  this.backgroundRenderer.render();
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  for (var ii = 0; ii < this.sprites.length; ii++) {
    var sprite = this.sprites[ii];
    for (var jj = 0; jj < sprite.voxelSheets.length; jj++) {
      sprite.voxelSheets[jj].render(this.projection);
    }
  }
  gl.disable(gl.BLEND);
  for (var ii = 0; ii < this.sprites.length; ii++) {
    var sprite = this.sprites[ii];
    sprite.render(this.projection, this.eye);
  }
  window.requestAnimFrame(this.wrap(this.render));
}

Editor.Utils = {};

Editor.Utils.matrix = mat4.create();

Editor.Utils.projectVertices = function(projection, modelview, vertices) {
  var matrix = Editor.Utils.matrix;
  mat4.multiply(matrix, projection, modelview);
  var projectedVertices = [];
  for (var ii = 0; ii < vertices.length; ii++) {
    var vertex = vec4.fromValues(vertices[ii][0], vertices[ii][1], vertices[ii][2], 1.0);
    vec4.transformMat4(vertex, vertex, this.matrix);
    projectedVertices.push(vec2.fromValues(vertex[0] / vertex[3], vertex[1] / vertex[3]));
  }
  return projectedVertices;
}

Editor.Utils.insideConvexPlanarPolygon = function(point, projectedVertices) {
  point = vec2.fromValues(point[0], point[1]);
  var centroid = vec2.create();
  for (var ii = 0; ii < projectedVertices.length; ii++) {
    vec2.add(centroid, centroid, projectedVertices[ii]);
  }
  vec2.scale(centroid, centroid, 1.0 / projectedVertices.length);
  var centroidToPoint = vec2.create();
  vec2.subtract(centroidToPoint, point, centroid);
  var inside = true;
  for (var ii = 0; ii < projectedVertices.length; ii++) {
    var vertex1 = projectedVertices[ii];
    var vertex2 = projectedVertices[(ii + 1) % projectedVertices.length];
    var vector12 = vec2.create();
    vec2.subtract(vector12, vertex2, vertex1);
    var normal12 = vec2.create();
    vec2.normalize(normal12, vec2.fromValues(vector12[1], -vector12[0]));
    var centroidToVertex1 = vec2.create();
    vec2.subtract(centroidToVertex1, vertex1, centroid);
    inside = inside && (vec2.dot(normal12, centroidToPoint) < vec2.dot(normal12, centroidToVertex1));
  }
  return inside;
}

Editor.BackgroundRenderer = function(gl) {
  this.gl = gl;
  this.program = new GL.Program(
    gl,
    ["attribute vec2 pos;",
     "void main() {",
     "  gl_Position = vec4(pos, 1, 1);",
     "}"],
    ["void main() {",
     "  gl_FragColor = vec4(0.25 + 0.25 * vec3(abs(dot(step(16.0, mod(gl_FragCoord.xy, 32.0)), vec2(1.0, -1.0)))), 1);",
     "  return;",
     "}"]);
  this.backgroundVertices = new GL.StaticBuffer(this.gl, Editor.BackgroundRenderer.BACKGROUND_VERTICES);
}

Editor.BackgroundRenderer.BACKGROUND_VERTICES = [-1.0, -1.0,  1.0, -1.0, -1.0,  1.0,
                                                 -1.0,  1.0,  1.0, -1.0,  1.0,  1.0];

Editor.BackgroundRenderer.prototype.render = function() {
  var gl = this.gl;
  this.program.use({},
                   {pos: this.backgroundVertices});
  gl.drawArrays(gl.TRIANGLES, 0, Editor.BackgroundRenderer.BACKGROUND_VERTICES.length / 2);
}

Editor.VoxelSheetRenderer = function(gl) {
  this.gl = gl;
  this.program = new GL.Program(
    gl,
    ["uniform mat4 matrix;",
     "uniform mat3 uvMatrix;",
     "attribute vec2 pos;",
     "varying lowp vec2 uv;",
     "varying lowp vec2 transformedUv;",
     "void main() {",
     "  gl_Position = matrix * vec4(pos, 0, 1);",
     "  uv = pos;",
     "  transformedUv = (uvMatrix * vec3(uv, 1)).xy;",
     "}"],
    ["uniform sampler2D voxelMap;",
     "varying lowp vec2 uv;",
     "varying lowp vec2 transformedUv;",
     "void main() {",
     "  lowp vec4 color = texture2D(voxelMap, transformedUv);",
     "  if (color.a == 0.0) {",
     "    color = vec4(1.0, 1.0, 1.0, clamp(0.0, 1.0, 8.0 * max(abs(uv.x), abs(uv.y)) - 7.0));",
     "  }",
     "  gl_FragColor = color;",
     "  return;",
     "}"]);
  this.vertices = new GL.StaticBuffer(this.gl, Editor.VoxelSheetRenderer.VERTICES);
  this.matrix = mat4.create();
}

Editor.VoxelSheetRenderer.VERTICES = [-1.0, -1.0,  1.0, -1.0, -1.0,  1.0,
                                      -1.0,  1.0,  1.0, -1.0,  1.0,  1.0];

Editor.VoxelSheetRenderer.prototype.render = function(voxelMap, projection, modelview, z) {
  var gl = this.gl;
  mat4.multiply(this.matrix, projection, modelview);
  var uvMatrix = [             1/16,  0.0, 0.0,
                                0.0, -0.5, 0.0,
                  1 - (z + 0.5) / 8,  0.5, 1.0];
  voxelMap.use(gl.TEXTURE0);
  this.program.use({matrix: this.matrix,
	            uvMatrix: uvMatrix,
	            voxelMap: 0},
                   {pos: this.vertices});
  gl.drawArrays(gl.TRIANGLES, 0, Editor.VoxelSheetRenderer.VERTICES.length / 2);
}

Editor.VoxelSheetRenderer.prototype.pick = function(projection, modelview, z, point) {
  var vertices = [vec4.fromValues(-1.0, -1.0, 0.0, 1.0),
                  vec4.fromValues( 1.0, -1.0, 0.0, 1.0),
                  vec4.fromValues( 1.0,  1.0, 0.0, 1.0),
                  vec4.fromValues(-1.0,  1.0, 0.0, 1.0)];
  var projectedVertices = Editor.Utils.projectVertices(projection, modelview, vertices);
  point = vec2.fromValues(point[0], point[1]);
  var pickCoord;
  if (Editor.Utils.insideConvexPlanarPolygon(point, projectedVertices)) {
    var point1ToPickPoint = vec2.create();
    vec2.subtract(point1ToPickPoint, point, projectedVertices[0]);
    var point12 = vec2.create();
    vec2.subtract(point12, projectedVertices[1], projectedVertices[0]);
    var point14 = vec2.create();
    vec2.subtract(point14, projectedVertices[3], projectedVertices[0]);
    pickCoord = vec3.fromValues(Math.floor(vec2.dot(point1ToPickPoint, point12) / Math.pow(vec2.length(point12), 2) * 8), Math.floor(vec2.dot(point1ToPickPoint, point14) / Math.pow(vec2.length(point14), 2) * 8), z);
  }
  return pickCoord;
}

Editor.VoxelSheet = function(voxelMap, z, modelview, animation) {
  if (arguments.length > 0) {
    this.voxelMap = voxelMap;
    this.z = z;
    this.modelview = modelview || mat4.create();
    this.animation = animation || mat4.create();
    this.matrix = mat4.create();
  }
}

Editor.VoxelSheet.init = function(voxelSheetRenderer) {
  Editor.VoxelSheet.voxelSheetRenderer = voxelSheetRenderer;
}

Editor.VoxelSheet.prototype.tick = function(tick) {
  mat4.identity(this.animation);
}

Editor.VoxelSheet.prototype.render = function(projection) {
  mat4.multiply(this.matrix, this.modelview, this.animation);
  Editor.VoxelSheet.voxelSheetRenderer.render(this.voxelMap, projection, this.matrix, this.z);
}

Editor.VoxelSheet.prototype.pick = function(projection, pickPoint) {
  return Editor.VoxelSheet.voxelSheetRenderer.pick(projection, this.matrix, this.z, pickPoint);
}

Editor.Sprite3DRenderer = function(gl) {
  this.gl = gl;
  // Loosely based on algorithm at http://prideout.net/blog/?p=64
  this.program = new GL.Program(
    gl,
    ["uniform mat4 matrix;",
     "uniform lowp vec3 size;",
     "attribute vec3 pos;",
     "varying highp vec3 nearPosition;",
     "void main() {",
     "  gl_Position = matrix * vec4(pos, 1);",
     "  nearPosition = pos * size;",
     "}"],
    ["const int MAX_ITERATIONS = 46;", // A ray can pass through at most 46 cells (intuitively, but verified through testing)
     "uniform highp vec3 rayOrigin;",
     "uniform lowp vec3 size;",
     "uniform mediump mat4 voxelToTexelMatrix;",
     "uniform sampler2D voxelMap;",
     "varying highp vec3 nearPosition;",
     "highp float min3(highp vec3 v) {",
     "  return min(min(v.x, v.y), v.z);",
     "}",
     "highp float max3(highp vec3 v) {",
     "  return max(max(v.x, v.y), v.z);",
     "}",
     "void main() {",
     "  highp vec3 rayDirection = normalize(nearPosition - rayOrigin * size);",
     "  lowp vec3 signRayDirection = sign(rayDirection);",
     "  lowp vec3 cubeRayDirection = signRayDirection * size;",
     "  highp float farRayLength = min3((0.5 * cubeRayDirection - nearPosition) / rayDirection);",
     // Fudge factor - rounding errors accumulate and can cause graphical artifacts
     "  farRayLength *= 0.999;",
     "  highp float rayLength = 0.0;",
     "  highp vec3 minusDistanceToBound = -mod(abs(nearPosition - signRayDirection - cubeRayDirection), 1.0);",
     "  lowp vec3 absFaceNormal = step(0.0, minusDistanceToBound);",
     "  highp vec3 minusDistanceToNextBound = minusDistanceToBound - absFaceNormal;",
     "  highp vec3 minusRayLengthDeltaToBound = minusDistanceToNextBound / abs(rayDirection);",
     "  highp vec3 rayLengthForUnitEditableSprite3D = signRayDirection / rayDirection;",
     "  highp vec3 halfRayDirection = 0.5 * rayDirection;",
     "  lowp vec3 lightingVector = abs(rayDirection) * 0.5;",
     "  lowp vec4 voxelColor;",
     "  for (int iteration = 0; iteration < MAX_ITERATIONS; ++iteration) {",
     "    highp float oldRayLength = rayLength;",
     "    highp float minusRayLengthDelta = max3(minusRayLengthDeltaToBound);",
     "    minusRayLengthDeltaToBound -= minusRayLengthDelta;",
     "    lowp vec3 newAbsFaceNormal = step(0.0, minusRayLengthDeltaToBound);",
     "    minusRayLengthDeltaToBound -= newAbsFaceNormal * rayLengthForUnitEditableSprite3D;",
     "    rayLength -= minusRayLengthDelta;",
     // Is this most efficient way to average?
     "    lowp vec3 voxelPosition = floor(nearPosition + halfRayDirection * (rayLength + oldRayLength));",
     // Cheaper to pre-multiply scale and offset?
     "    voxelColor = texture2D(voxelMap, (voxelToTexelMatrix * vec4(voxelPosition, 1)).xy);",
     "    if (voxelColor.a > 0.0) {",
     "      break;",
     "    }",
     "    if (rayLength >= farRayLength) {",
     "      discard;",
     "    }",
     "    absFaceNormal = newAbsFaceNormal;",
     "  }",
     // Cheaper to make lightingVector a vec4 with a constant factor in w position?
     "  gl_FragColor = vec4(voxelColor.rgb * (dot(lightingVector, absFaceNormal) + 0.5), voxelColor.a);",
     "  return;",
     "}"]);
  this.cubeVertices = new GL.StaticBuffer(this.gl, Editor.Sprite3DRenderer.CUBE_VERTICES);
  this.matrix = mat4.create();
  this.vector = vec3.create();
}

Editor.Sprite3DRenderer.CUBE_VERTICES = [-0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,
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

Editor.Sprite3DRenderer.prototype.render = function(voxelMap, size, scale, offset, projection, eye, modelview) {
  var gl = this.gl;
  size = size || 8;
  size = (size instanceof Array) ? size : [size, size, size];
  mat4.invert(this.matrix, modelview);
  vec3.transformMat4(this.vector, eye, this.matrix);
  mat4.multiply(this.matrix, projection, modelview);
  voxelMap.use(gl.TEXTURE0);
  voxelToTexelMatrix = [scale[0] / size[0] / size[2], 0.0, 0.0, 0.0,
                        0.0, -scale[1] / size[1], 0.0, 0.0,
                        -scale[0] / size[2], 0.0, 0.0, 0.0,
                        scale[0] * ((0.5 / size[0] - 0.5) / size[2] + 0.5) + offset[0], scale[1] * (-0.5 / size[1] + 0.5) + offset[1], 0.0, 1.0];
  this.program.use({matrix: this.matrix,
                    rayOrigin: this.vector,
                    size: size,
                    voxelToTexelMatrix: voxelToTexelMatrix,
                    voxelMap: 0},
                   {pos: this.cubeVertices});
  gl.drawArrays(gl.TRIANGLES, 0, Editor.Sprite3DRenderer.CUBE_VERTICES.length / 3);
}

Editor.Sprite3D = function(voxelMap, size, scale, offset, modelview, animation) {
  if (arguments.length > 0) {
    this.voxelMap = voxelMap;
    this.size = size || 8;
    this.scale = scale || [1, 1];
    this.offset = offset || [0, 0];
    this.modelview = modelview || mat4.create();
    this.animation = animation || mat4.create();
    this.matrix = mat4.create();
  }
}

Editor.Sprite3D.init = function(sprite3dRenderer) {
  Editor.Sprite3D.sprite3dRenderer = sprite3dRenderer;
}

Editor.Sprite3D.prototype.tick = function(tick) {
  mat4.identity(this.animation);
}

Editor.Sprite3D.prototype.render = function(projection, eye) {
  mat4.multiply(this.matrix, this.modelview, this.animation);
  Editor.Sprite3D.sprite3dRenderer.render(this.voxelMap, this.size, this.scale, this.offset, projection, eye, this.matrix);
}

Editor.EditableSprite3D = function() {
  this.canvas = new Editor.VoxelCanvas();
  this.voxelMap = new GL.Texture(Editor.Sprite3D.sprite3dRenderer.gl, this.canvas.getCanvas());
  Editor.Sprite3D.call(this, this.voxelMap);
  this.rotation = mat4.create();
  mat4.translate(this.modelview, this.modelview, [-0.5, 0, -5]);
  this.voxelSheets = [];
  for (var z = 0; z < this.size; z++) {
    this.voxelSheets.push(new Editor.VoxelSheet(this.voxelMap, z));
  }
}
Editor.EditableSprite3D.prototype = new Editor.Sprite3D();

Editor.EditableSprite3D.prototype.tick = function(tick) {
  Editor.Sprite3D.prototype.tick.call(this, tick);
  mat4.multiply(this.animation, this.animation, this.rotation);
}

Editor.EditableSprite3D.prototype.setVoxel = function(x, y, z, r, g, b, a) {
  this.canvas.setVoxel(x, y, z, r, g, b, a);
  this.voxelMap.set(this.canvas.getCanvas());
}

Editor.EditableSprite3D.prototype.toDataURL = function() {
  return this.canvas.toDataURL();
}

Editor.VoxelCanvas = function(width, height, depth) {
  this.width = width || 8;
  this.height = height || this.width;
  this.depth = depth || this.width;
  this.canvas = document.createElement("canvas");
  this.canvas.width = this.width * this.depth;
  this.canvas.height = this.height;
}

Editor.VoxelCanvas.prototype.setVoxel = function(x, y, z, r, g, b, a) {
  r = (r != null) ? r : 255;
  g = (g != null) ? g : r;
  b = (b != null) ? b : r;
  a = (a != null) ? a : 255;
  var context = this.canvas.getContext("2d");
  context.fillStyle = "rgba(" + r + "," + g + "," + b + "," + a + ")";
  context.fillRect(x + this.width * (this.depth - z - 1), (this.height - y - 1), 1, 1);
}

Editor.VoxelCanvas.prototype.getCanvas = function() {
  return this.canvas;
}

Editor.VoxelCanvas.prototype.toDataURL = function() {
  return this.canvas.toDataURL();
}
