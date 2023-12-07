//make points as polygons, with the original point as an attribute, which is the center
//so render points as quads, make quad around normal
//make a texture that has a kernel that falls off from the center (cubic function) or gaussian -.> fall off to 0 so no seems

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

//---- GLOBAL VARIABLES FOR OBJECT LOADING----///
var showMesh = false;
var first = true;
var model = null;
var g_objDoc = null; // The information of OBJ file
var g_drawingInfo = null; // The information for drawing 3D model

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
    var canvas = document.getElementById("c"); 

    gl = canvas.getContext("webgl"); 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
    
    var ext = gl.getExtension('OES_element_index_uint'); //OES_element_index_uint' che consente l'uso di indici non firmati a 32 bit.
    if(!ext){
        console.log('Warning: Unable tu use an extension');
    }    

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  //Si imposta il colore di sfondo del canvas

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.enable(gl.DEPTH_TEST);
    
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program); 

    gl.vBuffer = null;
    gl.cBuffer = null;

    //------------1 point perspective--------------------------------
    // Configura la matrice di vista (View Matrix)
    var eye = vec3(0.0,0.0,-10); // Modifica la posizione verticale della telecamera
    var at = vec3(0.0,0.0,0.0); // Punto verso cui la telecamera è orientata (centro della sfera)
    var up = vec3(1.0,0.0,0.0); // Vettore "up" della telecamera

    eye0 = vec3(0.0,0.0,-5.0);
    at0  = vec3(0.0,0.0,0.0);
    up0  = vec3(0.0,1.0,0.0);
    x0   = vec3(1.0,0.0,0.0);
    y0   = vec3(0.0,1.0,0.0);

    // Usa la funzione lookAt per configurare la matrice di vista
    var V = lookAt(eye, at, up);
    VLoc = gl.getUniformLocation(program,"V"); 
    gl.uniformMatrix4fv(VLoc,false, flatten(V));

    //configure perspective view (Projection Matrix)
    var fovy = 90.0;    // Campo visivo verticale di 45 gradi
    var aspect = 1.0;   // Rapporto di aspetto 1:1 (canvas quadrato)
    var near = 1;     // Distanza minima dalla telecamera
    var far = 15.0;    // Distanza massima dalla telecamera
    var P = perspective(fovy, aspect, near, far);
    var PLoc = gl.getUniformLocation(program, "P");
    gl.uniformMatrix4fv(PLoc, false, flatten(P));

    //convert from model frame to world/view frame (model matrix)
    var M = mat4(1);
    var MLoc = gl.getUniformLocation(program,"M");
    gl.uniformMatrix4fv(MLoc,false, flatten(M));

    //configuration of light parameters
    var lightDirection = vec4(0.0, 0.0, -1.0, 0.0); // Distanza della luce (quarto parm. è w)
    var lightDirectionLoc = gl.getUniformLocation(program, "lightDirection");
    gl.uniform4fv(lightDirectionLoc, flatten(lightDirection));

    var lightColor = vec4(1.0, 1.0, 1.0, 1.0); // Colore della luce Le/Ld
    var lightColorLoc = gl.getUniformLocation(program, "lightColor");
    gl.uniform4fv(lightColorLoc, flatten(lightColor));

    /* var materialColor = vec4(100, 100, 10, 1.0); //diffuse reflection coefficient kd
    var materialColorLoc = gl.getUniformLocation(program, "materialColor");
    gl.uniform4fv(materialColorLoc, flatten(materialColor));
 */
    vPosition = gl.getAttribLocation(program, "vPosition"); 
    gl.enableVertexAttribArray(vPosition); 

    vColor = gl.getAttribLocation(program, "vColor"); 
    gl.enableVertexAttribArray(vColor); 
    
    vNormal = gl.getAttribLocation(program, "vNormal"); 
    gl.enableVertexAttribArray(vNormal);

    //points dimensions
    var pointsDimLoc = gl.getUniformLocation(program,"pointsDim");
    gl.uniform1f(pointsDimLoc, 2.0); 

    var meshLoc = gl.getUniformLocation(program, "showMesh");
    gl.uniform1f(meshLoc, 0.0);

    //sphere parameters
    alpha = 0.0;
    eRot = vec3(radius * Math.sin(alpha), 0, radius * Math.cos(alpha));
    rotation = false;
    
    //filename = "C:/Users/Admin/Documents/GitHub/Mandelbulb/suzanne.obj";
    filename = "suzanne.obj"
    model = initObject(gl, filename, 1.0);
    
    gl.clear(gl.COLOR_BUFFER_BIT);
    //for the mandelBulb point cloud
    initBulb(gl, dim, exponent);

    
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

    document.getElementById("fancyMandelbulb1").onclick = function(){  //però sarebbe da fare un altro bottone che ritorna al point cloud.
        showMesh = !showMesh;
        console.log(showMesh);
        if(!showMesh) {
            initBulb(gl, dim, exponent);
        } else {
            model = initObject(gl, filename, 1.0);
        }
        tick();
    };

    function cameraRotation(){
        if(rotation){
            console.log("x")
            alpha = alpha + 0.02;
            eRot = vec3(radius * Math.sin(alpha), 0, radius * Math.cos(alpha));
            V = lookAt(eRot, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
            gl.uniformMatrix4fv(VLoc,false, flatten(V));
            render();
            //requestAnimationFrame(cameraRotation);   
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
        var VLoc = gl.getUniformLocation(program, "V");
        gl.uniformMatrix4fv(VLoc, false, flatten(V)); 
        
    }


    function render(){
        //cameraRotation();
        if(!showMesh){
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.drawArrays(gl.VERTICES, 0, pointsArray.length);
        } else {   //showing the mesh
            //gl.clear(0.0, 0.0, 0.0, 1.0);

            eye = vec3(0, 0, 5);
            at  = vec3(0, 0, 0);
            up  = vec3(0.0, 1.0, 0.0);

            V    = lookAt(eye, at, up);
            VLoc = gl.getUniformLocation(program, "V");
            gl.uniformMatrix4fv(VLoc, false, flatten(V));

            P = perspective(45, 1, 0.1, 200.0); 
            PLoc = gl.getUniformLocation(program, "P");
            gl.uniformMatrix4fv(PLoc, false, flatten(P));

            renderModel();
        }
        //requestAnimationFrame(render);
    }

    function tick(){
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
}


function renderModel(){
    if(!g_drawingInfo && g_objDoc && g_objDoc.isMTLComplete()) {
        g_drawingInfo = onReadComplete(gl, model, g_objDoc);
    }
    if(!g_drawingInfo) {return;}

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_INT, 0);
}

//calculates points for mandelbulb pointcloud
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
                            pointsArray.push(vec4(x, y, z, 1.0));
                            colorsArray.push(vec4(1.0));  //place holders
                            normalsArray.push(vec4(1.0));
                        }
                        break;
                    }
                } 
            }
        }
    }
    gl.deleteBuffer(gl.vBuffer);
    gl.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

    gl.deleteBuffer(gl.cBuffer);
    gl.cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
       
    gl.deleteBuffer(gl.nBuffer);
    gl.nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0); 

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
  
    canvas.onmousedown = function (ev) {   // Mouse is pressed
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

//************************************************************************************************ */
//----------------------------- FUNCTIONS FOR OBJECT LOADING ---------------------------///
//************************************************************************************************* */
function initObject(gl, obj_filename, scale){
    program.vPosition = gl.getAttribLocation(program, 'vPosition');
    program.vNormal   = gl.getAttribLocation(program, 'vNormal');
    program.vColor    = gl.getAttribLocation(program, 'vColor');

    var model = initiVertexBuffers(gl);

    readOBJFile(obj_filename, gl, model, scale, true);

    return model;
}

function initiVertexBuffers(gl){
    var obj = new Object();
    obj.vertexBuffer = createEmptyArrayBuffer(gl, program.vPosition, 3, gl.FLOAT);
    obj.normalBuffer = createEmptyArrayBuffer(gl, program.vNormal, 3, gl.FLOAT);
    obj.colorBuffer  = createEmptyArrayBuffer(gl, program.vColor, 4, gl.FLOAT);
    obj.indexBuffer  = gl.createBuffer();
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
// Write data into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices,gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);

    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);
    
    console.log("original size of buffers");
    console.log(drawingInfo.vertices.length);
    console.log(drawingInfo.normals.length);
    console.log(drawingInfo.colors.length);

    return drawingInfo;
}