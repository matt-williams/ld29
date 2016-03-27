LD29 = function(canvas) {
  LD.call(this, canvas);
}
LD29.prototype = new LD();

LD29.PLAY_AREA = [-50, -100, 50, -20];
LD29.WATER_DEPTH = -40;
LD29.SAND_DEPTH = -50;
LD29.KEY_LEFT = 65;
LD29.KEY_DIVE = 83;
LD29.KEY_RIGHT = 68;

LD29.prototype.initGL = function() {
  LD.prototype.initGL.call(this);
  var gl = this.gl;
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

LD29.prototype.initRenderers = function() {
  LD.prototype.initRenderers.call(this);
  this.matrix = mat4.create();
  this.sprite3dRenderer = new LD.Sprite3DRenderer(this.gl);
  LD.Sprite3D.init(this.sprite3dRenderer);
  this.surfaceRenderer = new LD.SurfaceRenderer(this.gl);
  LD29.Duck.init(this.gl);
  LD29.Treasure.init(this.gl);
  LD29.Plant.init(this.gl);
  LD29.Fish.init(this.gl);
  LD29.Frog.init(this.gl);
  LD29.Font.init(this.gl);
}

LD29.prototype.initObjects = function() {
  LD.prototype.initObjects.call(this);
  this.sprites = [];
  this.fontSprites = [];
  this.hudSprites = [];
  this.addInitialSprites();
  this.displayHUD(0, 0);

  this.waterSurface = new LD.Surface(this.surfaceRenderer, 0.02, [0, 0, 0.5, 0.5], [0.5, 0.5, 0.25, 0]);
  mat4.translate(this.waterSurface.modelview, this.waterSurface.modelview, [0, LD29.WATER_DEPTH, 0]);
  this.sandSurface = new LD.Surface(this.surfaceRenderer, 0, [0.75, 0.75, 0, 1.0], [0.25, 0.25, 0.75, 0]);
  mat4.translate(this.sandSurface.modelview, this.sandSurface.modelview, [0, LD29.SAND_DEPTH, 0]);
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

LD29.prototype.handleKeyUp = function(keyCode) {
  LD.prototype.handleKeyUp.call(this, keyCode);
  if ((!this.keysDown["" + LD29.KEY_LEFT]) && (!this.keysDown["" + LD29.KEY_DIVE]) && (!this.keysDown["" + LD29.KEY_RIGHT])) {
    this.maskKeys = false;
  }
}

LD29.prototype.ticked = function(tick) {
  LD.prototype.ticked.call(this, tick);
  var leftDown = !!this.keysDown["" + LD29.KEY_LEFT];
  var diveDown = !!this.keysDown["" + LD29.KEY_DIVE];
  var rightDown = !!this.keysDown["" + LD29.KEY_RIGHT];
  if (!this.frog && (leftDown || diveDown || rightDown) && !this.maskKeys) {
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
    this.frog.controls(leftDown, diveDown, rightDown);
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
        this.maskKeys = leftDown || diveDown || rightDown;
      }
      ii--;
    } else {
      this.sprites[ii].ticked(tick);
    }
  }
  for (var ii = 0; ii < this.sprites.length; ii++) {
    var sprite1 = this.sprites[ii];
    var sprite1Pos = [sprite1.modelview[12], sprite1.modelview[13], sprite1.modelview[14]];
    for (var jj = ii + 1; jj < this.sprites.length; jj++) {
      var sprite2 = this.sprites[jj];
      var sprite2Pos = [sprite2.modelview[12], sprite2.modelview[13], sprite2.modelview[14]];
      if (vec3.distance(sprite1Pos, sprite2Pos) < 2.0) {
        console.log(sprite1, sprite2);
        sprite1.collide(sprite2, sprite1Pos, sprite2Pos, this.tick);
        sprite2.collide(sprite1, sprite2Pos, sprite1Pos, this.tick);
      }
    }
  }
  this.waterSurface.ticked(tick);
  this.sandSurface.ticked(tick);
}

LD29.prototype.updateProjection = function() {
  LD.prototype.updateProjection.call(this);
  var target = this.frog ? [this.frog.modelview[12], this.frog.modelview[13], this.frog.modelview[14]] : [(LD29.PLAY_AREA[0] + LD29.PLAY_AREA[2]) / 2, LD29.WATER_DEPTH + 2, (LD29.PLAY_AREA[1] + LD29.PLAY_AREA[3]) / 2];
  this.eye[1] = target[1] - LD29.WATER_DEPTH;
  mat4.lookAt(this.matrix, this.eye, target, [0, 1, 0]);
  mat4.multiply(this.projection, this.projection, this.matrix);
}

LD29.prototype.render = function() {
  LD.prototype.render.call(this);
  var gl = this.gl;
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
  gl.disable(gl.BLEND);
}

LD29.Sprite3D = function(voxelMap, size, spinOnSpawn, scaleOnSpawn, spinOnDie, scaleOnDie, scale, offset, modelview, animation) {
  if (arguments.length > 0) {
    LD.Sprite3D.call(this, voxelMap, size, scale, offset, modelview, animation);
    this.spinOnSpawn = spinOnSpawn;
    this.scaleOnSpawn = scaleOnSpawn;
    this.spinOnDie = spinOnDie;
    this.scaleOnDie = scaleOnDie;
  }
}
LD29.Sprite3D.prototype = new LD.Sprite3D();

LD29.Sprite3D.prototype.ticked = function(tick) {
  LD.Sprite3D.prototype.ticked.call(this, tick);
  this.firstTick = this.firstTick || tick;
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

LD29.Sprite3D.prototype.positionRandomly = function(xzRange, y, rRange) {
  rRange = rRange || [0, Math.PI * 2];
  mat4.translate(this.modelview, this.modelview, [Math.random() * (xzRange[2] - xzRange[0]) + xzRange[0], y, Math.random() * (xzRange[3] - xzRange[1]) + xzRange[1]]);
  mat4.rotateY(this.modelview, this.modelview, Math.random() * (rRange[1] - rRange[0]) + rRange[0]);
}

LD29.Duck = function(ld29) {
  LD29.Sprite3D.call(this, LD29.Duck.voxelMap, 16, false, true, true, true);
  this.ld29 = ld29;
  this.positionRandomly(LD29.PLAY_AREA, LD29.WATER_DEPTH + 10);
  this.phase = Math.random() * Math.PI * 2;
  this.yv = 0;
  this.selectTarget(LD29.PLAY_AREA, ld29.frog);
}
LD29.Duck.prototype = new LD29.Sprite3D();

LD29.Duck.init = function(gl) {
  LD29.Duck.voxelMap = new GL.Texture(gl, "duck.voxelmap.png");
}

LD29.Duck.prototype.ticked = function(tick) {
  LD29.Sprite3D.prototype.ticked.call(this, tick);
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
  LD29.Sprite3D.call(this, LD29.Treasure.voxelMap, 8, true, true, true, true);
  this.positionRandomly(LD29.PLAY_AREA, LD29.SAND_DEPTH + 0.5, [-Math.PI / 4, Math.PI / 4]);
}
LD29.Treasure.prototype = new LD29.Sprite3D();

LD29.Treasure.init = function(gl) {
  LD29.Treasure.voxelMap = new GL.Texture(gl, "treasure.voxelmap.png");
}

LD29.Plant = function() {
  LD29.Sprite3D.call(this, LD29.Plant.voxelMap, 8, true, true, true, true);
  this.positionRandomly(LD29.PLAY_AREA, LD29.SAND_DEPTH + 0.5);
}
LD29.Plant.prototype = new LD29.Sprite3D();

LD29.Plant.init = function(gl) {
  LD29.Plant.voxelMap = new GL.Texture(gl, "plant.voxelmap.png");
}

LD29.Fish = function() {
  LD29.Sprite3D.call(this, LD29.Fish.voxelMap, 8, false, true, false, true);
  this.positionRandomly(LD29.PLAY_AREA, Math.random() * (LD29.WATER_DEPTH - LD29.SAND_DEPTH - 2) + LD29.SAND_DEPTH + 0.5);
  this.phase = Math.random() * Math.PI * 2;
  this.selectTarget(LD29.PLAY_AREA);
}
LD29.Fish.prototype = new LD29.Sprite3D();

LD29.Fish.init = function(gl) {
  LD29.Fish.voxelMap = new GL.Texture(gl, "fish.voxelmap.png");
}

LD29.Fish.prototype.ticked = function(tick) {
  LD29.Sprite3D.prototype.ticked.call(this, tick);
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
  LD29.Sprite3D.call(this, LD29.Frog.voxelMap, 8, false, true, true, true);
  mat4.translate(this.modelview, this.modelview, [(LD29.PLAY_AREA[0] + LD29.PLAY_AREA[2]) / 2, LD29.WATER_DEPTH + 2, (LD29.PLAY_AREA[1] + LD29.PLAY_AREA[3]) / 2]);
  this.phase = Math.random() * Math.PI * 2;
  this.yv = 0;
  this.oxygen = 1000;
  this.score = 0;
}
LD29.Frog.prototype = new LD29.Sprite3D();

LD29.Frog.init = function(gl) {
  LD29.Frog.voxelMap = new GL.Texture(gl, "frog.voxelmap.png");
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

LD29.Frog.prototype.ticked = function(tick) {
  LD29.Sprite3D.prototype.ticked.call(this, tick);
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
  LD29.Sprite3D.call(this, LD29.Font.voxelMap, 8, true, true, true, true, [1, 1 / 40], [0, code / 40]);
  mat4.translate(this.modelview, this.modelview, [position[0] * 1.5 - 15, position[1] * -1.5 - 23, -50]);
}
LD29.Font.prototype = new LD29.Sprite3D();

LD29.Font.CHAR_A = "A".charCodeAt(0);
LD29.Font.CHAR_Z = "Z".charCodeAt(0);
LD29.Font.CHAR_0 = "0".charCodeAt(0);
LD29.Font.CHAR_9 = "9".charCodeAt(0);

LD29.Font.init = function(gl) {
  LD29.Font.voxelMap = new GL.Texture(gl, "font.voxelmap.png");
}
