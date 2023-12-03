//make points as polygons, with the original point as an attribute, which is the center
//so render points as quads, make quad around normal

//make a texture that has a kernel that falls off from the center (cubic function) or gaussian -.> fall off to 0 so no seems

var g_objDoc = null; // The information of OBJ file
var g_drawingInfo = null; // The information for drawing 3D model


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


window.onload = function init(){
    var canvas = document.getElementById("c"); 

    gl = canvas.getContext("webgl"); 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
    
    var ext = gl.getExtension('OES_element_index_uint'); //OES_element_index_uint' che consente l'uso di indici non firmati a 32 bit.
    if(!ext){
        console.log('Warning: Unable tu use an extension');
    }    

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.8, 0.5, 0.0, 1.0);  //Si imposta il colore di sfondo del canvas

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program); 

    gl.vBuffer = null;
    gl.cBuffer = null;
    gl.nBuffer = null;

    //------------1 point perspective--------------------------------
    // Configura la matrice di vista (View Matrix)
    var eye = vec3(0, 0, -5);
    var at  = vec3(0, 0, 0);
    var up  = vec3(0.0, 1.0, 0.0);

    // Usa la funzione lookAt per configurare la matrice di vista
    var V = lookAt(eye, at, up);
    VLoc = gl.getUniformLocation(program,"V"); 
    gl.uniformMatrix4fv(VLoc,false, flatten(V));

    //configure perspective view (Projection Matrix)
    var fovy = 90.0;    // Campo visivo verticale di 45 gradi
    var aspect = 1.0;   // Rapporto di aspetto 1:1 (canvas quadrato)
    var near = 1;     // Distanza minima dalla telecamera
    var far = 15.0;    // Distanza massima dalla telecamera
    var P = perspective(45, aspect, 0.1, 100);
    //P = perspective(45, 1, 0.1, 200.0); 
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

    vPosition = gl.getAttribLocation(program, "vPosition"); 
    gl.enableVertexAttribArray(vPosition); 

    //sphere parameters
    alpha = 0.0;
    eRot = vec3(radius * Math.sin(alpha), 0, radius * Math.cos(alpha));
    rotation = false;

    //intitBulb(gl, 128);  //calculates points of madelBulb point cloud.
    gl.clear(gl.COLOR_BUFFER_BIT);
    //var filename = 'bulb1.obj';
    var filename = '../worksheet5/monkey.obj'
    
    var model = initObject(gl, filename, 10.0);

    //renderModel();
    //cameraRotation();

    function renderModel()
    {
        if(!g_drawingInfo && g_objDoc && g_objDoc.isMTLComplete()) {
            g_drawingInfo = onReadComplete(gl, model, g_objDoc);
        }
        if(!g_drawingInfo) {return;}

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_INT, 0);
    }

    function tick(){
        renderModel();
        requestAnimationFrame(tick);
    }
    tick();


    document.getElementById("incrementSubd").onclick = function(){
        if(numTimesToSubdivide < 6)
            numTimesToSubdivide++;
            initSphere(gl, numTimesToSubdivide)
            if(!rotation){
                render();
            }
    };

    document.getElementById("decrementSubd").onclick = function(){
        if(numTimesToSubdivide){
            numTimesToSubdivide--; 
        } 
        initSphere(gl, numTimesToSubdivide)
        if(!rotation){
            render();
        }
    };

    document.getElementById("sphereRotation").onclick = function(){
        if(!rotation){
            rotation = true;
        }
        else rotation = false;
        cameraRotation();
    };

    function cameraRotation(){
        if(rotation){
            console.log("x")
            alpha = alpha + 0.02;
            eRot = vec3(radius * Math.sin(alpha), 0, radius * Math.cos(alpha));
            var V = lookAt(eRot, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
            gl.uniformMatrix4fv(VLoc,false, flatten(V));
            tick();  
        } 
    }

}

function render(){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.VERTICES, 0, pointsArray.length);
}


function intitBulb(gl, dim) {

    pointsArray = []

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
                    newvec = createSpherical(r, theta, phi, 8); //this fives me newx newy and newz
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

    /*gl.deleteBuffer(gl.nBuffer);
    gl.nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);*/

    render();
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

//dont need this ??
function initSphere(gl, numSubdivs) {
    pointsArray = []
    colorsArray = []
    normalsArray = []

    var va = vec4(0.0, 0.0, 1.0, 1);
    var vb = vec4(0.0, 0.942809, -0.333333, 1);
    var vc = vec4(-0.816497, -0.471405, -0.333333, 1);
    var vd = vec4(0.816497, -0.471405, -0.333333, 1);

    tetrahedron(va, vb, vc, vd, numSubdivs);

    //vertex buffer
    gl.deleteBuffer(gl.vBuffer);
    gl.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0); 
       
    //buffer normali
    gl.deleteBuffer(gl.nBuffer);
    gl.nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);

    render();
}

//dont need this ??
function triangle(a, b, c) {
    pointsArray.push(a);
    pointsArray.push(b);
    pointsArray.push(c);

    normalsArray.push(vec4(a[0], a[1], a[2], 0.0));
    normalsArray.push(vec4(b[0], b[1], b[2], 0.0));
    normalsArray.push(vec4(c[0], c[1], c[2], 0.0)); 
}

//dont need this ??
function divideTriangle(a, b, c, count) {
   if ( count > 0 ) {

       var ab = normalize(mix( a, b, 0.5), true);
       var ac = normalize(mix( a, c, 0.5), true);
       var bc = normalize(mix( b, c, 0.5), true);

       divideTriangle( a, ab, ac, count - 1 );
       divideTriangle( ab, b, bc, count - 1 );
       divideTriangle( bc, c, ac, count - 1 );
       divideTriangle( ab, bc, ac, count - 1 );
   }
   else { // draw tetrahedron at end of recursion
       triangle( a, b, c );
   }
}
//dont need this ??
function tetrahedron(a, b, c, d, n) {
   divideTriangle(a, b, c, n);
   divideTriangle(d, c, b, n);
   divideTriangle(a, d, b, n);
   divideTriangle(a, c, d, n);
}



//---- FUNCTIONS FOR OBJECT LOADING ------///
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
    obj.vertexBuffer = createEmptyArrayBuffer(gl, program.vPosition, 4, gl.FLOAT);
    obj.normalBuffer = createEmptyArrayBuffer(gl, program.vNormal, 4, gl.FLOAT);
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