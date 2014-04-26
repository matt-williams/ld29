LD29 = function(canvas) {
  this.canvas = canvas;
  this.init();
  this.start();
}

LD29.HALF_FOV = 0.25;

LD29.CUBE_VERTICES = [-0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,
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

LD29.prototype.init = function() {
  this.initGL();
  this.initTextures();
  this.initPrograms();
  this.initBuffers();
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

LD29.prototype.initTextures = function() {
  this.voxelMap = new LD29.Texture(this.gl, "voxelmap.png");
}

LD29.prototype.initPrograms = function() {
  // Loosely based on algorithm at http://prideout.net/blog/?p=64
  this.program = new LD29.Program(
    this.gl,
    ["uniform mat4 projection;",
     "uniform mat4 modelview;",
     "attribute vec3 pos;",
     "varying highp vec3 near;",
     "void main() {",
     "  gl_Position = projection * modelview * vec4(pos, 1);",
     "  near = pos;",
     "}"],
    ["uniform highp mat4 modelview;",
     "uniform highp vec3 rayOrigin;",
     "uniform highp vec2 viewportSize;",
     "uniform highp float focalLength;",
     "uniform sampler2D voxelMap;",
     "varying highp vec3 near;",
     "highp float max3(highp vec3 v) {",
     "  return max(max(v.x, v.y), v.z);",
     "}",
     "highp float min3(highp vec3 v) {",
     "  return min(min(v.x, v.y), v.z);",
     "}",
     "void main() {",
     "  highp vec3 rayDirection = normalize(near - rayOrigin);",
     "  highp vec3 contact0 = (vec3(-0.5) - rayOrigin) / rayDirection;",
     "  highp vec3 contact1 = (vec3(0.5) - rayOrigin) / rayDirection;",
     "  highp vec3 contactMax = max(contact0, contact1);",
     "  highp float farDistance = min3(contactMax);",
     "  highp vec3 far = rayOrigin + rayDirection * farDistance;",
     "  highp vec3 step = (far - near) / 32.0;",
     "  highp vec3 pos = near + step / 2.0;",
     "  for (int i = 0; i < 32; ++i) {",
     "    lowp vec4 voxel = texture2D(voxelMap, vec2((pos.x + 0.5) / 8.0 + floor((pos.z + 0.5) * 8.0 + 0.5) / 8.0, pos.y + 0.5));",
     "    if (voxel.a > 0.0) {",
     "      gl_FragColor = vec4(voxel.rgb * float(32 - i) / 32.0, 1);",
     "      return;",
     "    }",
     "    pos += step;",
     "  }",
     "  discard;",
     "}"]);
/*
*/
}

LD29.prototype.initBuffers = function() {
  this.cubeVertices = new LD29.StaticBuffer(this.gl, LD29.CUBE_VERTICES);
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
  this.inputX = (evt.clientX / this.canvas.width - 0.5);
  this.inputY = (evt.clientY / this.canvas.height - 0.5);
}

LD29.prototype.start = function() {
  window.onload = this.wrap(this.render);
  this.canvas.onmousemove = this.wrap(this.handleMouseMove);
}

LD29.prototype.updateState = function() {
  this.tick++;
}

LD29.prototype.updateViewport = function() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  this.gl.viewport(0, 0, canvas.width, canvas.height)
}

LD29.prototype.render = function() {
  this.updateState();
  this.updateViewport();
  var sqrtAspect = Math.sqrt(canvas.width / canvas.height);
  var projection = mat4.create();
  mat4.frustum(projection, -sqrtAspect * LD29.HALF_FOV, sqrtAspect * LD29.HALF_FOV, -LD29.HALF_FOV/sqrtAspect, LD29.HALF_FOV/sqrtAspect, 1, 100);
  var modelview = mat4.create();
  mat4.translate(modelview, modelview, [0, 0, -5.0]);
  mat4.rotateY(modelview, modelview, this.inputX * Math.PI * 2);
  mat4.rotateX(modelview, modelview, this.inputY * Math.PI * 2);
  var inverseModelview = mat4.create();
  mat4.invert(inverseModelview, modelview);
  var rayOrigin = vec3.create();
  vec3.transformMat4(rayOrigin, [0, 0, 0], inverseModelview);
  var gl = this.gl;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  this.voxelMap.use(gl.TEXTURE0);
  this.program.use({projection: projection,
                    modelview: modelview,
                    rayOrigin: rayOrigin,
                    voxelMap: 0},
                   {pos: this.cubeVertices});
  gl.drawArrays(gl.TRIANGLES, 0, 36);
/*
  mat4.identity(modelview);
  mat4.translate(modelview, modelview, [0, 2.0, -50.0]);
  mat4.rotateY(modelview, modelview, this.tick / 100);
  mat4.rotateX(modelview, modelview, this.tick / 60);
  mat4.invert(inverseModelview, modelview);
  vec3.transformMat4(rayOrigin, [0, 0, 0], inverseModelview);

  this.program.use({projection: projection,
                    modelview: modelview,
                    rayOrigin: rayOrigin,
                    voxelMap: 0},
                   {pos: this.cubeVertices});
  gl.drawArrays(gl.TRIANGLES, 0, 36);
*/
  window.requestAnimFrame(this.wrap(this.render));
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

