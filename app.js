'use strict'

var gl;

var appInput = new Input();
var time = new Time();
var camera = new OrbitCamera(appInput);

var sphereGeometry = null; // this will be created after loading from a file
var groundGeometry = null;
var barrelGeometry = null;
var whiteGeometry = null;
var rightWallGeometry = null;
var leftWallGeometry = null;
var backWallGeometry = null;
var ceilingGeometry = null;
var frontWallGeometry = null;
var moonGeometry = null;
var earthGeometry = null;
var mercuryGeometry = null;
var venusGeometry = null;
var jupiterGeometry = null;
var saturnGeometry = null;
var uranusGeometry = null;
var neptuneGeometry = null;

var projectionMatrix = new Matrix4();
var lightPosition = new Vector4(0,1.5,0);
var rotationMatrix2 = new Matrix4();
var rotationMatrix3 = new Matrix4();

// the shader that will be used by each piece of geometry (they could each use their own shader but in this case it will be the same)
var phongShaderProgram;
var whiteShaderProgram;

// auto start the app when the html page is ready
window.onload = window['initializeAndStartRendering'];

// we need to asynchronously fetch files from the "server" (your local hard drive)
var loadedAssets = {
    phongTextVS: null, phongTextFS: null,
    sphereJSON: null,
    marbleImage: null,
    crackedMudImage: null,
    barrelJSON: null, barrelImage: null
};

// -------------------------------------------------------------------------
function initializeAndStartRendering() {
    initGL();
    loadAssets(function() {
        createShaders(loadedAssets);
        createScene();

        updateAndRender();
    });
}

// -------------------------------------------------------------------------
function initGL(canvas) {
    var canvas = document.getElementById("webgl-canvas");

    try {
        gl = canvas.getContext("webgl");
        gl.canvasWidth = canvas.width;
        gl.canvasHeight = canvas.height;

        gl.enable(gl.DEPTH_TEST);
    } catch (e) {}

    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

// -------------------------------------------------------------------------
function loadAssets(onLoadedCB) {
    var filePromises = [
        fetch('./shaders/phong.vs.glsl').then((response) => { return response.text(); }),
        fetch('./shaders/phong.pointlit.fs.glsl').then((response) => { return response.text(); }),
        fetch('./data/sphere.json').then((response) => { return response.json(); }),
        loadImage('./data/marble2.0.jpg'),
        loadImage('./data/space.jpg'),
        loadImage('./data/earthFlat.jpg'),
        loadImage('./data/mercury.jpg'),
        loadImage('./data/venus.jpg'),
        loadImage('./data/moon.jpg'),
        loadImage('./data/jupiter.jpg'),
        loadImage('./data/saturn.jpg'),
        loadImage('./data/urnaus.jpg'),
        loadImage('./data/neptune.jpg'),
        fetch('./data/barrel.json').then((response) => { return response.json(); }),
        loadImage('./data/barrel.png'),
        fetch('./shaders/flat.color.vs.glsl').then((response) => { return response.text(); }),
        fetch('./shaders/flat.color.fs.glsl').then((response) => { return response.text(); })
    ];

    Promise.all(filePromises).then(function(values) {
        // Assign loaded data to our named variables
        loadedAssets.phongTextVS = values[0];
        loadedAssets.phongTextFS = values[1];
        loadedAssets.sphereJSON = values[2];
        loadedAssets.marbleImage = values[3];
        loadedAssets.crackedMudImage = values[4];
        loadedAssets.earthImage = values[5];
        loadedAssets.mercuryImage = values[6];
        loadedAssets.venusImage = values[7];
        loadedAssets.moonImage = values[8];
        loadedAssets.jupiterImage = values[9];
        loadedAssets.saturnImage = values[10];
        loadedAssets.uranusImage = values[11];
        loadedAssets.neptuneImage = values[12];
        loadedAssets.barrelJSON = values[13];
        loadedAssets.barrelImage = values[14];
        loadedAssets.flatVS = values[15];
        loadedAssets.flatFS = values[16];
    }).catch(function(error) {
        console.error(error.message);
    }).finally(function() {
        onLoadedCB();
    });
}

// -------------------------------------------------------------------------
function createShaders(loadedAssets) {
    phongShaderProgram = createCompiledAndLinkedShaderProgram(loadedAssets.phongTextVS, loadedAssets.phongTextFS);

    phongShaderProgram.attributes = {
        vertexPositionAttribute: gl.getAttribLocation(phongShaderProgram, "aVertexPosition"),
        vertexNormalsAttribute: gl.getAttribLocation(phongShaderProgram, "aNormal"),
        vertexTexcoordsAttribute: gl.getAttribLocation(phongShaderProgram, "aTexcoords")
    };

    phongShaderProgram.uniforms = {
        worldMatrixUniform: gl.getUniformLocation(phongShaderProgram, "uWorldMatrix"),
        viewMatrixUniform: gl.getUniformLocation(phongShaderProgram, "uViewMatrix"),
        projectionMatrixUniform: gl.getUniformLocation(phongShaderProgram, "uProjectionMatrix"),
        lightPositionUniform: gl.getUniformLocation(phongShaderProgram, "uLightPosition"),
        cameraPositionUniform: gl.getUniformLocation(phongShaderProgram, "uCameraPosition"),
        textureUniform: gl.getUniformLocation(phongShaderProgram, "uTexture"),
    };


    whiteShaderProgram = createCompiledAndLinkedShaderProgram(loadedAssets.flatVS, loadedAssets.flatFS);

    whiteShaderProgram.attributes = {
        vertexPositionAttribute: gl.getAttribLocation(whiteShaderProgram, "aVertexPosition"),
        vertexNormalsAttribute: gl.getAttribLocation(whiteShaderProgram, "aNormal"),
        vertexTexcoordsAttribute: gl.getAttribLocation(whiteShaderProgram, "aTexcoords"),
        
    };

    whiteShaderProgram.uniforms = {
        worldMatrixUniform: gl.getUniformLocation(whiteShaderProgram, "uWorldMatrix"),
        viewMatrixUniform: gl.getUniformLocation(whiteShaderProgram, "uViewMatrix"),
        projectionMatrixUniform: gl.getUniformLocation(whiteShaderProgram, "uProjectionMatrix"),
        lightPositionUniform: gl.getUniformLocation(whiteShaderProgram, "uLightPosition"),
        cameraPositionUniform: gl.getUniformLocation(whiteShaderProgram, "uCameraPosition"),
        textureUniform: gl.getUniformLocation(whiteShaderProgram, "uTexture"),
        TimeForWhite: gl.getUniformLocation(whiteShaderProgram,"uTime"),
    };
}

// -------------------------------------------------------------------------
function createScene() {
 //////------------------------//////////
    groundGeometry = new WebGLGeometryQuad(gl, phongShaderProgram);
    groundGeometry.create(loadedAssets.crackedMudImage);

    var scale = new Matrix4().makeScale(35.0, 35.0, 35.0);

    // compensate for the model being flipped on its side
    var translation = new Matrix4().makeTranslation(0, 0, -0.9)
    var rotation = new Matrix4().makeRotationX(-90);
    

    groundGeometry.worldMatrix.makeIdentity();
    groundGeometry.worldMatrix.multiply(rotation).multiply(scale);
    groundGeometry.worldMatrix.multiply(translation)
//////-------------------------////////

    rightWallGeometry = new WebGLGeometryQuad(gl, phongShaderProgram);
    rightWallGeometry.create(loadedAssets.crackedMudImage);

    var scale = new Matrix4().makeScale(35.0, 35.0, 35.0);

    // compensate for the model being flipped on its side
    var translation = new Matrix4().makeTranslation(0, 0, -0.9)
    //var rotation = new Matrix4().makeRotationX(-90);
    

    rightWallGeometry.worldMatrix.makeIdentity();
    rightWallGeometry.worldMatrix.multiply(scale);
    rightWallGeometry.worldMatrix.multiply(translation)
//////-------------------------////////
    backWallGeometry = new WebGLGeometryQuad(gl, phongShaderProgram);
    backWallGeometry.create(loadedAssets.crackedMudImage);

    var scale = new Matrix4().makeScale(35.0, 35.0, 35.0);

    // compensate for the model being flipped on its side
    var translation = new Matrix4().makeTranslation(0, 0, -0.9);
    var rotation = new Matrix4().makeRotationY(-90);
    

    backWallGeometry.worldMatrix.makeIdentity();
    backWallGeometry.worldMatrix.multiply(scale).multiply(rotation);
    backWallGeometry.worldMatrix.multiply(translation)
//////-------------------------////////
    ceilingGeometry = new WebGLGeometryQuad(gl, phongShaderProgram);
    ceilingGeometry.create(loadedAssets.crackedMudImage);

    var scale = new Matrix4().makeScale(35.0, 35.0, 35.0);

    // compensate for the model being flipped on its side
    var translation = new Matrix4().makeTranslation(0, 0, 0.9)
    var rotation = new Matrix4().makeRotationX(-90);
    

    ceilingGeometry.worldMatrix.makeIdentity();
    ceilingGeometry.worldMatrix.multiply(rotation).multiply(scale);
    ceilingGeometry.worldMatrix.multiply(translation)
//////-------------------------////////
    leftWallGeometry = new WebGLGeometryQuad(gl, phongShaderProgram);
    leftWallGeometry.create(loadedAssets.crackedMudImage);

    var scale = new Matrix4().makeScale(35.0, 35.0, 35.0);

    // compensate for the model being flipped on its side
    var translation = new Matrix4().makeTranslation(0, 0, 0.9);
    var rotation = new Matrix4().makeRotationY(-90);
    

    leftWallGeometry.worldMatrix.makeIdentity();
    leftWallGeometry.worldMatrix.multiply(scale).multiply(rotation);
    leftWallGeometry.worldMatrix.multiply(translation)
//////-------------------------////////
    frontWallGeometry = new WebGLGeometryQuad(gl, phongShaderProgram);
    frontWallGeometry.create(loadedAssets.crackedMudImage);

    var scale = new Matrix4().makeScale(35.0, 35.0, 35.0);

    // compensate for the model being flipped on its side
    var translation = new Matrix4().makeTranslation(0, 0, 0.9);
    // var rotation = new Matrix4().makeRotationY(1);
    

    frontWallGeometry.worldMatrix.makeIdentity();
    frontWallGeometry.worldMatrix.multiply(scale);
    frontWallGeometry.worldMatrix.multiply(translation)
//////-------------------------////////



    sphereGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    sphereGeometry.create(loadedAssets.sphereJSON, loadedAssets.marbleImage);

    // Scaled it down so that the diameter is 3
    var scale = new Matrix4().makeScale(0.008, 0.008, 0.008);

    // raise it by the radius to make it sit on the ground
    var translation = new Matrix4().makeTranslation(-11, 1.5, 0);

    sphereGeometry.worldMatrix.makeIdentity();
    sphereGeometry.worldMatrix.multiply(translation).multiply(scale);
//////-------------------------////////


    earthGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    earthGeometry.create(loadedAssets.sphereJSON, loadedAssets.earthImage);

    // Scaled it down so that the diameter is 3
    var scale = new Matrix4().makeScale(0.008, 0.008, 0.008);

    // raise it by the radius to make it sit on the ground
    var translation = new Matrix4().makeTranslation(-7, 1.5, 0);

    earthGeometry.worldMatrix.makeIdentity();
    earthGeometry.worldMatrix.multiply(translation).multiply(scale);
//////-------------------------////////


    mercuryGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    mercuryGeometry.create(loadedAssets.sphereJSON, loadedAssets.mercuryImage);

    // Scaled it down so that the diameter is 3
    var scale = new Matrix4().makeScale(0.004, 0.004, 0.004);

    // raise it by the radius to make it sit on the ground
    var translation = new Matrix4().makeTranslation(-3, 1.5, 0);

    mercuryGeometry.worldMatrix.makeIdentity();
    mercuryGeometry.worldMatrix.multiply(translation).multiply(scale);
//////-------------------------////////
//////-------------------------////////


    venusGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    venusGeometry.create(loadedAssets.sphereJSON, loadedAssets.venusImage);

    // Scaled it down so that the diameter is 3
    var scale = new Matrix4().makeScale(0.008, 0.008, 0.008);

    // raise it by the radius to make it sit on the ground
    var translation = new Matrix4().makeTranslation(-4.5, 1.5, 0);

    venusGeometry.worldMatrix.makeIdentity();
    venusGeometry.worldMatrix.multiply(translation).multiply(scale);
//////-------------------------////////
//////-------------------------////////


    jupiterGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    jupiterGeometry.create(loadedAssets.sphereJSON, loadedAssets.jupiterImage);

    // Scaled it down so that the diameter is 3
    var scale = new Matrix4().makeScale(0.02, 0.02, 0.02);

    // raise it by the radius to make it sit on the ground
    var translation = new Matrix4().makeTranslation(-15, 1.5, 0);

    jupiterGeometry.worldMatrix.makeIdentity();
    jupiterGeometry.worldMatrix.multiply(translation).multiply(scale);
//////-------------------------////////
//////-------------------------////////


    saturnGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    saturnGeometry.create(loadedAssets.sphereJSON, loadedAssets.saturnImage);

    // Scaled it down so that the diameter is 3
    var scale = new Matrix4().makeScale(0.015, 0.015, 0.015);

    // raise it by the radius to make it sit on the ground
    var translation = new Matrix4().makeTranslation(-19, 1.5, 0);

    saturnGeometry.worldMatrix.makeIdentity();
    saturnGeometry.worldMatrix.multiply(translation).multiply(scale);
//////-------------------------////////
//////-------------------------////////


    uranusGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    uranusGeometry.create(loadedAssets.sphereJSON, loadedAssets.uranusImage);

    // Scaled it down so that the diameter is 3
    var scale = new Matrix4().makeScale(0.011, 0.011, 0.011);

    // raise it by the radius to make it sit on the ground
    var translation = new Matrix4().makeTranslation(-22, 1.5, 0);

    uranusGeometry.worldMatrix.makeIdentity();
    uranusGeometry.worldMatrix.multiply(translation).multiply(scale);
//////-------------------------////////
//////-------------------------////////


    neptuneGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    neptuneGeometry.create(loadedAssets.sphereJSON, loadedAssets.neptuneImage);

    // Scaled it down so that the diameter is 3
    var scale = new Matrix4().makeScale(0.011, 0.011, 0.011);

    // raise it by the radius to make it sit on the ground
    var translation = new Matrix4().makeTranslation(-26, 1.5, 0);

    neptuneGeometry.worldMatrix.makeIdentity();
    neptuneGeometry.worldMatrix.multiply(translation).multiply(scale);
//////-------------------------////////


    moonGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    moonGeometry.create(loadedAssets.sphereJSON, loadedAssets.moonImage);

    // Scaled it down so that the diameter is 3
    var scale = new Matrix4().makeScale(0.002, 0.002, 0.002);

    // raise it by the radius to make it sit on the ground
    var translation = new Matrix4().makeTranslation(-6, 2.0, 0);

    moonGeometry.worldMatrix.makeIdentity();
    moonGeometry.worldMatrix.multiply(translation).multiply(scale);
//////-------------------------////////



    // barrelGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
    // barrelGeometry.create(loadedAssets.barrelJSON, loadedAssets.barrelImage);
    
    // var scale = new Matrix4().makeScale(0.3, 0.3, 0.3);

    // // raise it by the radius to make it sit on the ground
    // var translation = new Matrix4().makeTranslation(5,1.8,5);
   
    // barrelGeometry.worldMatrix.multiply(translation).multiply(scale); 
    
    whiteGeometry = new WebGLGeometryJSON(gl, whiteShaderProgram);
    whiteGeometry.create(loadedAssets.sphereJSON, loadedAssets.venusImage);
    var scale = new Matrix4().makeScale(0.03, 0.03, 0.03);

    // raise it by the radius to make it sit on the ground
    var translation = new Matrix4().makeTranslation(0, 1.5, 0);

    whiteGeometry.worldMatrix.makeIdentity();
    whiteGeometry.worldMatrix.multiply(translation).multiply(scale);

    
}

// -------------------------------------------------------------------------
function updateAndRender() {
    requestAnimationFrame(updateAndRender);

    var aspectRatio = gl.canvasWidth / gl.canvasHeight;

    
  //------------------------//
    var rotation = new Matrix4().makeRotationY(1);
    venusGeometry.worldMatrix.multiply(rotation);

    var translation = new Matrix4().makeTranslation(0, 0,10)
    venusGeometry.worldMatrix.multiply(translation);
  //------------------------//
    var rotation = new Matrix4().makeRotationY(0.8);
    mercuryGeometry.worldMatrix.multiply(rotation);

    var translation = new Matrix4().makeTranslation(0, 0,10)
    mercuryGeometry.worldMatrix.multiply(translation);
      //------------------------//
    
    var rotation = new Matrix4().makeRotationY(1.2);
   earthGeometry.worldMatrix.multiply(rotation);

    var translation = new Matrix4().makeTranslation(0, 0,18)
    earthGeometry.worldMatrix.multiply(translation);
      //------------------------//
    var rotation = new Matrix4().makeRotationY(0.4);
    neptuneGeometry.worldMatrix.multiply(rotation);

    var translation = new Matrix4().makeTranslation(0, 0,15)
    neptuneGeometry.worldMatrix.multiply(translation);
      //------------------------//
    var rotation = new Matrix4().makeRotationY(0.7);
    jupiterGeometry.worldMatrix.multiply(rotation);

    var translation = new Matrix4().makeTranslation(0, 0,8.5)
    jupiterGeometry.worldMatrix.multiply(translation);
  //------------------------//

    var rotation = new Matrix4().makeRotationY(0.9);
    sphereGeometry.worldMatrix.multiply(rotation);

    var translation = new Matrix4().makeTranslation(0, 0,21)
    sphereGeometry.worldMatrix.multiply(translation);
    //------------------------//
    var rotation = new Matrix4().makeRotationY(0.6);
    uranusGeometry.worldMatrix.multiply(rotation);

    var translation = new Matrix4().makeTranslation(0, 0,22)
    uranusGeometry.worldMatrix.multiply(translation);
    //------------------------//
    var rotation = new Matrix4().makeRotationY(0.5);
    saturnGeometry.worldMatrix.multiply(rotation);

    var translation = new Matrix4().makeTranslation(0, 0,9)
    saturnGeometry.worldMatrix.multiply(translation);
     //------------------------//
     var rotation = new Matrix4().makeRotationY(1.2);
   moonGeometry.worldMatrix.multiply(rotation);

    var translation = new Matrix4().makeTranslation(0, 0,75)
    moonGeometry.worldMatrix.multiply(translation);


 

    time.update();
    camera.update(time.deltaTime);

    // specify what portion of the canvas we want to draw to (all of it, full width and height)
    gl.viewport(0, 0, gl.canvasWidth, gl.canvasHeight);

    // this is a new frame so let's clear out whatever happened last frame
    gl.clearColor(0.707, 0.707, 1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(phongShaderProgram);
    var uniforms = phongShaderProgram.uniforms;
    var cameraPosition = camera.getPosition();
    gl.uniform3f(uniforms.lightPositionUniform, lightPosition.x, lightPosition.y, lightPosition.z);
    gl.uniform3f(uniforms.cameraPositionUniform, cameraPosition.x, cameraPosition.y, cameraPosition.z);

    projectionMatrix.makePerspective(45, aspectRatio, 0.1, 1000);
    groundGeometry.render(camera, projectionMatrix, phongShaderProgram);
    rightWallGeometry.render(camera, projectionMatrix, phongShaderProgram);
     backWallGeometry.render(camera, projectionMatrix, phongShaderProgram);
    leftWallGeometry.render(camera, projectionMatrix, phongShaderProgram);
    frontWallGeometry.render(camera, projectionMatrix, phongShaderProgram);
    ceilingGeometry.render(camera, projectionMatrix, phongShaderProgram);
    sphereGeometry.render(camera, projectionMatrix, phongShaderProgram);
    // barrelGeometry.render(camera, projectionMatrix, phongShaderProgram);
    earthGeometry.render(camera, projectionMatrix, phongShaderProgram);
    mercuryGeometry.render(camera, projectionMatrix, phongShaderProgram);
    venusGeometry.render(camera, projectionMatrix, phongShaderProgram);
    jupiterGeometry.render(camera, projectionMatrix, phongShaderProgram);
    saturnGeometry.render(camera, projectionMatrix, phongShaderProgram);
    uranusGeometry.render(camera, projectionMatrix, phongShaderProgram);
    neptuneGeometry.render(camera, projectionMatrix, phongShaderProgram);
    moonGeometry.render(camera, projectionMatrix, phongShaderProgram);


     gl.useProgram(whiteShaderProgram);
    var uniforms = whiteShaderProgram.uniforms;
    var cameraPosition = camera.getPosition();
    gl.uniform3f(uniforms.lightPositionUniform, lightPosition.x, lightPosition.y, lightPosition.z);
    gl.uniform3f(uniforms.cameraPositionUniform, cameraPosition.x, cameraPosition.y, cameraPosition.z);
    gl.uniform1i(uniforms.TimeForWhite, time.secondsElapsedSinceStart);


    whiteGeometry.render(camera, projectionMatrix, whiteShaderProgram);
}
