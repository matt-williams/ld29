LD29 = function(canvas) {
  this.canvas = canvas;
  this.init();
  this.start();
}

LD29.HALF_FOV = 0.25;
LD29.FRAME_PERIOD_MS = 20;

LD29.prototype.init = function() {
  this.initGL();
  this.initRenderers();
  this.initSprites();
  this.initState();
}

LD29.prototype.initGL = function() {
  var gl = WebGLUtils.setupWebGL(this.canvas);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.disable(gl.BLEND);
  gl.depthMask(true);
  this.gl = gl;
}

LD29.prototype.initRenderers = function() {
  this.projection = mat4.create();
  this.matrix = mat4.create();
  this.sprite3dRenderer = new LD29.Sprite3DRenderer(this.gl);
}

LD29.prototype.initSprites = function() {
  LD29.Duck.init(this.sprite3dRenderer);
  LD29.Treasure.init(this.sprite3dRenderer);
  LD29.Plant.init(this.sprite3dRenderer);
  LD29.Fish.init(this.sprite3dRenderer);
  this.sprites = [new LD29.Duck(),
                  new LD29.Duck(),
                  new LD29.Duck(),
                  new LD29.Treasure(),
                  new LD29.Plant(),
                  new LD29.Fish(),
                  new LD29.Fish()];
}

LD29.prototype.initState = function() {
  this.tick = 0;
  this.inputX = 0;
  this.inputY = 0;
}

LD29.prototype.wrap = function(func) {
  var otherThis = this;
  return function() {func.apply(otherThis, arguments);}
}

LD29.prototype.handleMouseMove = function(evt) {
  newX = (evt.clientX / this.canvas.width - 0.5);
  newY = (evt.clientY / this.canvas.height - 0.5);
/*
  for (var ii = 0; ii < this.sprites.length; ii++) {
    var sprite = this.sprites[ii];
    mat4.rotateY(sprite.modelview, sprite.modelview, (newX - this.inputX) * Math.PI * 4);
    mat4.rotateX(sprite.modelview, sprite.modelview, (newY - this.inputY) * Math.PI * 4);
  }
*/
  this.inputX = newX;
  this.inputY = newY;
}

LD29.prototype.start = function() {
  window.onload = this.wrap(this.render);
  this.canvas.onmousemove = this.wrap(this.handleMouseMove);
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
  if (Math.random() < 0.001) {
    this.sprites.push(new LD29.Duck());
  }
  if (Math.random() < 0.001) {
    this.sprites.push(new LD29.Treasure());
  }
  if (Math.random() < 0.001) {
    this.sprites.push(new LD29.Plant());
  }
  if (Math.random() < 0.001) {
    this.sprites.push(new LD29.Fish());
  }
  for (var ii = 0; ii < this.sprites.length; ii++) {
    this.sprites[ii].tick(tick);
  }
}

LD29.prototype.updateViewport = function() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  this.gl.viewport(0, 0, canvas.width, canvas.height)
}

LD29.prototype.updateProjection = function() {
  var sqrtAspect = Math.sqrt(canvas.width / canvas.height);
  mat4.frustum(this.projection, -sqrtAspect * LD29.HALF_FOV, sqrtAspect * LD29.HALF_FOV, -LD29.HALF_FOV/sqrtAspect, LD29.HALF_FOV/sqrtAspect, 1, 100);
  mat4.lookAt(this.matrix, [0, 0, 0], [0, -10, -50], [0, 1, 0]);
  mat4.multiply(this.projection, this.projection, this.matrix);
}

LD29.prototype.render = function() {
  this.updateViewport();
  this.updateProjection();
  var gl = this.gl;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  for (var ii = 0; ii < this.sprites.length; ii++) {
    var sprite = this.sprites[ii];
    sprite.render(this.projection);
  }
  window.requestAnimFrame(this.wrap(this.render));
}

LD29.Sprite3DRenderer = function(gl) {
  this.gl = gl;
  // Loosely based on algorithm at http://prideout.net/blog/?p=64
  this.program = new LD29.Program(
    gl,
    ["uniform mat4 matrix;",
     "attribute vec3 pos;",
     "varying highp vec3 near;",
     "void main() {",
     "  gl_Position = matrix * vec4(pos, 1);",
     "  near = pos;",
     "}"],
    ["//uniform highp mat4 matrix;",
     "uniform highp vec3 rayOrigin;",
     "uniform sampler2D voxelMap;",
     "varying highp vec3 near;",
     "highp float max3(highp vec3 v) {",
     "  return max(max(v.x, v.y), v.z);",
     "}",
     "highp float min3(highp vec3 v) {",
     "  return min(min(v.x, v.y), v.z);",
     "}",
     "highp float distanceToBound(highp vec3 pos, highp vec3 direction, highp vec3 bound, out lowp vec3 face) {",
     "  highp vec3 contact = (bound - pos) / direction;",
     "  highp float distance = min3(contact);",
     "  face = step(-distance, -contact) * sign(direction);",
     "  return distance;",
     "}",
     "void main() {",
     "  highp vec3 rayDirection = normalize(near - rayOrigin);",
     "  highp vec3 pos = near;",
     "  lowp vec3 voxelPos = clamp(floor(pos * 8.0) / 8.0, -0.5, 0.375);",
     "  for (int i = 0; i < 22; ++i) {", // A ray can pass through at most 22 cells (intuitively, but verified through testing)
     "    lowp vec4 voxel = texture2D(voxelMap, 1.0 - vec2((voxelPos.x + 0.5) / 8.0 + voxelPos.z + 0.5 + 0.5 / 64.0, (voxelPos.y + 0.5) + 0.5 / 8.0));",
     "    if (voxel.a > 0.0) {",
     "      gl_FragColor = vec4(voxel.rgb / log(length(pos - rayOrigin)), 1);",
     "//      highp vec4 transformed = matrix * vec4(pos, 1);",
     "//      gl_FragDepth = (gl_DepthRange.diff * transformed.z / transformed.w + gl_DepthRange.near + gl_DepthRange.far) / 2.0;",
     "      return;",
     "    }",
     "    lowp vec3 face;",
     "    highp float stepDistance = distanceToBound(pos, rayDirection, voxelPos + (sign(rayDirection) * 0.5 + 0.5) / 8.0, face);",
     "    voxelPos += face / 8.0;", 
     "    if (clamp(voxelPos, -0.5, 0.375) != voxelPos) {",
     "      discard;",
     "    }",
     "    pos += rayDirection * stepDistance;",
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

LD29.Sprite3DRenderer.prototype.render = function(voxelMap, projection, modelview) {
  var gl = this.gl;
  mat4.invert(this.matrix, modelview);
  vec3.transformMat4(this.vector, [0, 0, 0], this.matrix);
  mat4.multiply(this.matrix, projection, modelview);
  var gl = this.gl;
  voxelMap.use(gl.TEXTURE0);
  this.program.use({matrix: this.matrix,
                    rayOrigin: this.vector,
                    voxelMap: 0},
                   {pos: this.cubeVertices});
  gl.drawArrays(gl.TRIANGLES, 0, LD29.Sprite3DRenderer.CUBE_VERTICES.length / 3);
}

LD29.Sprite3D = function(sprite3dRenderer, voxelMap, modelview) {
  if (arguments.length > 0) {
    this.sprite3dRenderer = sprite3dRenderer;
    this.voxelMap = voxelMap;
    this.modelview = modelview || mat4.create();
  }
}

LD29.Sprite3D.prototype.at = function(position) {
  this.moveTo(position);
  return this;
}

LD29.Sprite3D.prototype.moveTo = function(position) {
  mat4.translate(this.modelview, this.modelview, position);
}

LD29.Sprite3D.prototype.tick = function(tick) {};

LD29.Sprite3D.prototype.render = function(projection) {
  this.sprite3dRenderer.render(this.voxelMap, projection, this.modelview);
}

LD29.Duck = function(sprite3dRenderer) {
  LD29.Sprite3D.call(this, LD29.Duck.sprite3dRenderer, LD29.Duck.voxelMap);
  mat4.translate(this.modelview, this.modelview, [Math.random() * 60 - 30, 10, -Math.random() * 60 - 20]);
  mat4.rotateY(this.modelview, this.modelview, Math.random() * Math.PI * 2);
}
LD29.Duck.prototype = new LD29.Sprite3D();

LD29.Duck.init = function(sprite3dRenderer) {
  LD29.Duck.sprite3dRenderer = sprite3dRenderer;
  LD29.Duck.voxelMap = new LD29.Texture(sprite3dRenderer.gl, "duck.voxelmap.png");
}

LD29.Duck.prototype.tick = function(tick) {
  if ((this.modelview[12] < -10.0 && this.modelview[8] < 0) ||
      (this.modelview[12] > 10.0 && this.modelview[8] > 0) ||
      (this.modelview[14] < -80.0 && this.modelview[10] < 0) ||
      (this.modelview[14] > -20.0 && this.modelview[10] > 0)) {
    mat4.rotateY(this.modelview, this.modelview, -Math.PI / 32);
  }
  mat4.rotateX(this.modelview, this.modelview, -Math.cos(tick / Math.PI / 3) * Math.PI / 500);
  if (this.modelview[13] > -10) {
    mat4.translate(this.modelview, this.modelview, [0, -0.2, 0]);
  }
  if (this.modelview[13] < -9.5) {
    mat4.translate(this.modelview, this.modelview, [0, 0, Math.sin(tick / Math.PI / 3) * 0.1 + 0.075]);
  }
}

LD29.Treasure = function(sprite3dRenderer) {
  LD29.Sprite3D.call(this, LD29.Treasure.sprite3dRenderer, LD29.Treasure.voxelMap);
  mat4.translate(this.modelview, this.modelview, [Math.random() * 60 - 30, -12, -Math.random() * 60 - 20]);
  mat4.rotateY(this.modelview, this.modelview, (Math.random() - 0.5) * Math.PI / 2);
}
LD29.Treasure.prototype = new LD29.Sprite3D();

LD29.Treasure.init = function(sprite3dRenderer) {
  LD29.Treasure.sprite3dRenderer = sprite3dRenderer;
  LD29.Treasure.voxelMap = new LD29.Texture(sprite3dRenderer.gl, "treasure.voxelmap.png");
}

LD29.Plant = function(sprite3dRenderer) {
  LD29.Sprite3D.call(this, LD29.Plant.sprite3dRenderer, LD29.Plant.voxelMap);
  mat4.translate(this.modelview, this.modelview, [Math.random() * 60 - 30, -12, -Math.random() * 60 - 20]);
  mat4.rotateY(this.modelview, this.modelview, Math.random() * Math.PI * 2);
}
LD29.Plant.prototype = new LD29.Sprite3D();

LD29.Plant.init = function(sprite3dRenderer) {
  LD29.Plant.sprite3dRenderer = sprite3dRenderer;
  LD29.Plant.voxelMap = new LD29.Texture(sprite3dRenderer.gl, "plant.voxelmap.png");
}

LD29.Fish = function(sprite3dRenderer) {
  LD29.Sprite3D.call(this, LD29.Fish.sprite3dRenderer, LD29.Fish.voxelMap);
  mat4.translate(this.modelview, this.modelview, [Math.random() * 60 - 30, -12, -Math.random() * 60 - 20]);
  mat4.rotateY(this.modelview, this.modelview, Math.random() * Math.PI * 2);
}
LD29.Fish.prototype = new LD29.Sprite3D();

LD29.Fish.init = function(sprite3dRenderer) {
  LD29.Fish.sprite3dRenderer = sprite3dRenderer;
  LD29.Fish.voxelMap = new LD29.Texture(sprite3dRenderer.gl, "fish.voxelmap.png");
}

LD29.Fish.prototype.tick = function(tick) {
  if ((this.modelview[12] < -10.0 && this.modelview[8] < 0) ||
      (this.modelview[12] > 10.0 && this.modelview[8] > 0) ||
      (this.modelview[14] < -80.0 && this.modelview[10] < 0) ||
      (this.modelview[14] > -20.0 && this.modelview[10] > 0)) {
    mat4.rotateY(this.modelview, this.modelview, Math.PI / 32);
  }
  mat4.rotateX(this.modelview, this.modelview, -Math.cos(tick / Math.PI / 3) * Math.PI / 500);
  mat4.translate(this.modelview, this.modelview, [0, 0, Math.sin(tick / Math.PI / 3) * 0.1 + 0.075]);
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

