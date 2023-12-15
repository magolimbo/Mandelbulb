function initObject(gl, obj_filename, scale){
    gl.program.vPosition = gl.getAttribLocation(gl.program, 'vPosition');
    gl.program.vNormal   = gl.getAttribLocation(gl.program, 'vNormal');
    gl.program.vColor    = gl.getAttribLocation(gl.program, 'vColor');

    var model = initiVertexBuffers(gl);

    readOBJFile(obj_filename, gl, model, scale, true);

    return model;
}

function initiVertexBuffers(gl){
    var obj = new Object();
    obj.vertexBuffer = createEmptyArrayBuffer(gl, gl.program.vPosition, 3, gl.FLOAT);
    obj.normalBuffer = createEmptyArrayBuffer(gl, gl.program.vNormal, 3, gl.FLOAT);
    obj.colorBuffer  = createEmptyArrayBuffer(gl, gl.program.vColor, 4, gl.FLOAT);
    obj.indexBuffer  = gl.createBuffer();
    //...
    return obj;
}


function createEmptyArrayBuffer(gl, a_attribute, num, type) {
    var buffer = gl.createBuffer(); // Create a buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute); // Enable the assignment
    return buffer;
}

function readOBJFile(fileName, gl, model, scale, reverse) {
    var request = new XMLHttpRequest();
    
    request.onreadystatechange = function() {
        if (request.readyState === 4 && request.status !== 404) {
            onReadOBJFile(request.responseText, fileName, gl, model, scale, reverse);
        }
    }
    request.open('GET', fileName, true); // Create a request to get file
    request.send(); // Send the request
}

var g_objDoc = null; // The information of OBJ file
var g_drawingInfo = null; // The information for drawing 3D model

// OBJ file has been read
function onReadOBJFile(fileString, fileName, gl, o, scale, reverse) {
    var objDoc = new OBJDoc(fileName); // Create a OBJDoc object
    var result = objDoc.parse(fileString, scale, reverse);
    if (!result) {
        g_objDoc = null; g_drawingInfo = null;
        console.log("OBJ file parsing error.");
        return;
    }
    g_objDoc = objDoc;
} 

function onReadComplete(gl, model, objDoc) {
// Acquire the vertex coordinates and colors from OBJ file
    var drawingInfo = objDoc.getDrawingInfo();
// Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices,gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
     gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);

    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);
    
    console.log(drawingInfo.vertices.length);
    console.log(drawingInfo.normals.length);
    console.log(drawingInfo.colors.length);

    return drawingInfo;
}


var pointsArray = []
var colorsArray = []
var normalsArray = []
var gl;
var program;
var numTimesToSubdivide = 0;
var vPosition;
var vColor;
var vNormal;
var vLoc;
//camera parameters
const radius = 2.0;
var alpha
var eRot
var rotation
var exponent = 8;
var dim = 32;

var showMesh = true;
var first = true;
var model = null;
var center_of_bulb = vec3(0.0);
//to render pointcloud
var firstTime_model = true;
var firstTime_cloud = true;
var firstTime = true;


//---- GLOBAL VARIABLES FOR ROTATE AND DOLLY MODE -----//
var xPan = 0.0;
var yPan = 0.0;
var diff = 0.0;

var dragging  = false;
var dollyMode = false;
var rotMode   = false;

var eye0;
var at0 ;
var up0 ;
var x0 ; 
var y0 ;  

var last_qinc;
var startTime, endTime;
var timeDiff;



window.onload = function init(){
    //how to call the canvas
    var canvas = document.getElementById("canvas");
    var gl = WebGLUtils.setupWebGL(canvas);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);//color the canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(gl.program);

    var ext = gl.getExtension('OES_element_index_uint');
    if(!ext){
        console.log('Warning: unable to use extension');
    }

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.enable(gl.DEPTH_TEST);
    
    var eye = vec3(0, 0, -10);
    var at  = vec3(0, 0, 0);
    var up  = vec3(0.0, 1.0, 0.0);

    eye0 = vec3(0.0,0.0,-15.0);
    at0  = vec3(0.0,0.0,0.0);
    up0  = vec3(0.0,1.0,0.0);
    x0   = vec3(1.0,0.0,0.0);
    y0   = vec3(0.0,1.0,0.0);

    var V    = lookAt(eye, at, up);
    var VLoc = gl.getUniformLocation(gl.program, "V");
    gl.uniformMatrix4fv(VLoc, false, flatten(V));

    var P = perspective(45, 1, 0.1, 200.0); 
    var PLoc = gl.getUniformLocation(gl.program, "P");
    gl.uniformMatrix4fv(PLoc, false, flatten(P));

    var M1 = mat4();
    var MLoc = gl.getUniformLocation(gl.program, "M");
    gl.uniformMatrix4fv(MLoc, false, flatten(M1));

    vPosition = gl.getAttribLocation(gl.program, "vPosition"); 
    gl.enableVertexAttribArray(vPosition); 

    vColor = gl.getAttribLocation(gl.program, "vColor"); 
    gl.enableVertexAttribArray(vColor); 
    
    vNormal = gl.getAttribLocation(gl.program, "vNormal"); 
    gl.enableVertexAttribArray(vNormal);

    //points dimensions
    var pointsDimLoc = gl.getUniformLocation(gl.program,"pointsDim");
    gl.uniform1f(pointsDimLoc, 2.0); 
    
    var meshLoc = gl.getUniformLocation(gl.program, "showMesh");
    gl.uniform1f(meshLoc, showMesh ? 1.0 : 0.0);

    //sphere parameters
    alpha = 0.0;
    eRot = vec3(radius * Math.sin(alpha), 0, radius * Math.cos(alpha));
    rotation = false;

    gl.clear(gl.COLOR_BUFFER_BIT);
    
    //initBulb(gl, dim, exponent);  //fills the vertexArray, colorsArray and normalsArray
    var filename = "bulb/exp8apply-objlegacy.obj";
    var model = initObject(gl, filename, 0.0);

    var q_rot = new Quaternion();
    var q_inc = new Quaternion();
    last_qinc = q_inc;

    initEventHandlers(canvas, q_rot, q_inc);

    var rotButton = document.getElementById("rot");
    var dollyButton = document.getElementById("dolly");

    rotButton.addEventListener("click", function(event) { 
        rotMode = true;
        rotation = false;
        dollyMode = false;
    })
    dollyButton.addEventListener("click", function(event) { 
        rotMode = false;
        rotation = false;
        dollyMode = true;
    })

    document.getElementById("sphereRotation").onclick = function(){
        if(!rotation){
            rotation = true;
            dollyMode = false;
            rotMode = false;
        }
        else rotation = false;
        cameraRotation();
    };

    document.getElementById("pointsDimensions").addEventListener("input", function(event)
    {
        gl.uniform1f(pointsDimLoc, event.target.value);
        render();

    });

    document.getElementById("mandelbulbExponent+").onclick = function(){
        if(exponent < 20){
            exponent++
            initBulb(gl, dim, exponent)
        }
    };

    document.getElementById("mandelbulbExponent-").onclick = function(){
        if(exponent > 2){
            exponent--
            initBulb(gl, dim, exponent)
        }
    };

    document.getElementById("mandelbulbDensity+").onclick = function(){
        if(dim < 128){
            dim *= 2
            initBulb(gl, dim, exponent)
        }
    };

    document.getElementById("mandelbulbDensity-").onclick = function(){
        if(dim > 2){
            dim = dim/2
            initBulb(gl, dim, exponent)
        }
    };

    var switchButton = document.getElementById("fancyMandelbulb1");
    switchButton.addEventListener("click" , function(){  //però sarebbe da fare un altro bottone che ritorna al point cloud.
        showMesh = !showMesh;
        this.innerText = showMesh ? 'Show Point Cloud' : 'Show Mesh';
        console.log(showMesh);
        if(!showMesh) {
            //initBulb(gl, dim, exponent);
            g_drawingInfo = null;
            g_objDoc = null;
            firstTime_model = true;
            gl.uniform1f(meshLoc, 0.0);
        } else {
            //model = initObject(gl, filename, 1.0);
            firstTime_cloud = true;
            gl.uniform1f(meshLoc, 1.0);
        }
        tick();
    });


    function cameraRotation(){
        if(rotation){
            var dist = showMesh ? 15 : 3.5;
            eye = vec3(
                dist * Math.sin(Date.now() * 0.001),
                0,
                dist * Math.cos(Date.now() * 0.001)
            );
            V = lookAt(eye, at, up);
            VLoc = gl.getUniformLocation(gl.program, "V");
            gl.uniformMatrix4fv(VLoc, false, flatten(V));
        } else if (rotMode){
            console.log("rotate mode");
    
            up = vec3(q_rot.apply(up0));
            eye = add(vec3(q_rot.apply(eye0)),at);
            at = add(at, scale(-1.0, add(scale(xPan, vec3(q_rot.apply(x0)) ),scale(yPan , vec3(q_rot.apply(y0)) ))) );
            V = lookAt(eye, at, up);
    
        } else if (dollyMode) {
            console.log("dolly mode");
            if (eye0[2] + diff >= 0) {
                eye0[2] = 0;
            } else{
                eye0[2] += diff;
                diff = 0;
            }
            up  = vec3(q_rot.apply(up0));
            eye = add(vec3(q_rot.apply(eye0)),at);
            at  = add(at, scale(-1.0, add(scale(xPan, vec3(q_rot.apply(x0)) ),scale(yPan , vec3(q_rot.apply(y0)) ))) );
            V = lookAt(eye, at, up);
        }
        var VLoc = gl.getUniformLocation(gl.program, "V");
        gl.uniformMatrix4fv(VLoc, false, flatten(V)); 
        
    }

    function render()
    {
        if(showMesh){
            //gl.clearColor(0.0, 0.0, 0.0, 1.0);//color the canvas
            if(firstTime_model){
                //g_objDoc = null;
                //gl.clearColor(0.0, 0.0, 0.0, 1.0);//color the canvas

                model = initObject(gl, filename, 1.0);
                firstTime_model = false;
                eye0 = vec3(0.0,0.0,-15.0);
                var eye = vec3(0, 0, -15); // Adjust the values based on your scene
                var at = vec3(0, 0, 0);
                var up = vec3(0.0, 1.0, 0.0); // Up vector

                V = lookAt(eye, at, up);
                gl.uniformMatrix4fv(VLoc, false, flatten(V));
                return;
            }
            if(!g_drawingInfo && g_objDoc && g_objDoc.isMTLComplete()) {
                g_drawingInfo = onReadComplete(gl, model, g_objDoc);
            }
            if(!g_drawingInfo) {return;}

            //gl.clearColor(0.0, 0.0, 0.0, 1.0);
            console.log(model);
            //console.log(g_drawingInfo);

            //gl.clear(gl.COLOR_BUFFER_BIT);
            console.log("drawing model");
            gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_INT, 0);
        } else {
            if(firstTime_cloud){
                firstTime_cloud = false;

                eye0 = vec3(0.0,0.0,-3.5);
                var eye = vec3(0, 0, -3.5);
                var at  = vec3(0, 0, 0);
                var up  = vec3(0, 1, 0);
                V = lookAt(eye, at, up);
                gl.uniformMatrix4fv(VLoc, false, flatten(V)); 

                gl.deleteBuffer(model.vBuffer);
                gl.deleteBuffer(model.cBuffer);
                gl.deleteBuffer(model.nBuffer);

                vPosition = gl.getAttribLocation(gl.program, "vPosition"); 
                gl.enableVertexAttribArray(vPosition); 

                vColor = gl.getAttribLocation(gl.program, "vColor"); 
                gl.enableVertexAttribArray(vColor); 
    
                vNormal = gl.getAttribLocation(gl.program, "vNormal"); 
                gl.enableVertexAttribArray(vNormal);

                g_drawingInfo = null;
                initBulb(gl, dim, exponent);
                return;  //???
            }
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.drawArrays(gl.VERTICES, 0, pointsArray.length);
        }
    }

    function tick(){
        //gl.clearColor(0.0, 0.0, 0.0, 1.0);//color the canvas
        end();
        if (timeDiff >= 10000){
            last_qinc.setIdentity();
            start();
        }
        q_rot = q_rot.multiply(last_qinc);
        cameraRotation();
        render();
        requestAnimationFrame(tick);
    }

    start();
    tick();
    //render();
}

//******************************************************************************************************* */
//---------------- FUNCTIONS FOR POINT CLOUD ----------------------///
//****************************************************************************************************** */
function initBulb(gl, dim, exponent) {

    pointsArray  = [];
    colorsArray  = [];
    normalsArray = [];

    //per i vari c
    var i = 0; var j = 0; var k = 0;
    
    for (i = 0; i < dim; i ++){
        for (j = 0; j < dim; j ++){
            var edge = false;
            for (k = 0; k < dim; k++) {
                var x = map(i, 0, dim, -1.0, 1.0);  //c.x 
                var y = map(j, 0, dim, -1.0, 1.0);  //c.y
                var z = map(k, 0, dim, -1.0, 1.0);  //c.z

                var zeta = vec3(0.0, 0.0, 0.0); //zeta 0
                var max_iter = 10;
                var iter = 0; 

                while (true){
                    //polar coordinates
                    r     = Math.sqrt(zeta[0]*zeta[0] + zeta[1]*zeta[1] + zeta[2]*zeta[2]);
                    theta = Math.atan2( Math.sqrt(zeta[0]*zeta[0] + zeta[1]*zeta[1]), zeta[2]);
                    phi   = Math.atan2(zeta[1], zeta[0]);
                    newvec = createSpherical(r, theta, phi, exponent); //this fives me newx newy and newz
                    zeta[0] = newvec[0] + x
                    zeta[1] = newvec[1] + y
                    zeta[2] = newvec[2] + z
                    
                    iter++;
                    if(r > 2){
                        if(edge){
                            edge = false;
                        }
                        break;
                    }
                    if(iter > max_iter){
                        if(!edge){
                            edge = true;
                            pointsArray.push(vec3(x, y, z));
                            colorsArray.push(vec4(1.0));  //place holders
                            normalsArray.push(vec3(1.0));
                        }
                        break;
                    }
                } 
            }
        }
    }
    //gl.deleteBuffer(gl.vBuffer);
    gl.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);

    //gl.deleteBuffer(gl.cBuffer);
    gl.cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
       
    //gl.deleteBuffer(gl.nBuffer);
    gl.nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0); 

    //render();
}

function createSpherical(r, theta, phi, n){  //n = 8
    //spherical coordinates
    var newzeta_x = Math.pow(r, n) * Math.sin(theta*n) * Math.cos(phi*n);
    var newzeta_y = Math.pow(r, n) * Math.sin(theta*n) * Math.sin(phi*n);
    var newzeta_z = Math.pow(r, n) * Math.cos(theta*n);

    return vec3(newzeta_x, newzeta_y, newzeta_z);

}


function map(value, start1, stop1, start2, stop2)
{
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}


//******************************************************************************************************* */
//---------------- FUNCTIONS FOR ROTATE AND DOLLY MODE----------------------///
//****************************************************************************************************** */
function project_to_sphere(x, y) {
    var r = 2;
    var d = Math.sqrt(x * x + y * y);
    var t = r * Math.sqrt(2);
    var z;

    if (d < r) { // Inside sphere
        z = Math.sqrt(r * r - d * d);
    } else if (d < t) {
        z = 0;
    } else {       // On hyperbola
        z = t * t / d;
    }
    return z;
}

function initEventHandlers(canvas, qrot, qinc) {
    var dragging = false;         // Dragging or not
    var lastX = -1, lastY = -1;   // Last position of the mouse
  
    canvas.onmousedown = function (ev) {   // Mouse is pr essed
      var x = ev.clientX, y = ev.clientY;
      // Start dragging if a mouse is in <canvas>
      var rect = ev.target.getBoundingClientRect();
      if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
        lastX = x; lastY = y;
        dragging = true;
      }
    };
  
    canvas.onmouseup = function (ev) {
      qinc.setIdentity();
      dragging = false;
    }; // Mouse is released
  
    canvas.onmousemove = function (ev) { // Mouse is moved
        var x = ev.clientX, y = ev.clientY;
        if (dragging) {
            var rect = ev.target.getBoundingClientRect();
            var s_x = ((x - rect.left) / rect.width - 0.5) * 2;
            var s_y = (0.5 - (y - rect.top) / rect.height) * 2;
            var s_last_x = ((lastX - rect.left) / rect.width - 0.5) * 2;
            var s_last_y = (0.5 - (lastY - rect.top) / rect.height) * 2;
            if (rotMode) {
                var v1 = vec3(s_x, s_y, project_to_sphere(s_x, s_y));
                var v2 = vec3(s_last_x, s_last_y, project_to_sphere(s_last_x, s_last_y));
                qinc = qinc.make_rot_vec2vec(normalize(v1), normalize(v2));
                qrot = qrot.multiply(qinc);
            }
            else if (dollyMode) {
                diff = 2*(s_y - s_last_y);
            } 
        }
        lastX = x, lastY = y;
      };
  }

function start() {
    startTime = new Date();
}
  
function end() {
    endTime = new Date();
    timeDiff = endTime - startTime; //in ms
    
}
