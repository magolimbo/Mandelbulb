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
    
    var eye = vec3(0, 0, -5);
    var at  = vec3(0, 0, 0);
    var up  = vec3(0.0, 1.0, 0.0);

    var V    = lookAt(eye, at, up);
    var VLoc = gl.getUniformLocation(gl.program, "V");
    gl.uniformMatrix4fv(VLoc, false, flatten(V));

    var P = perspective(45, 1, 0.1, 200.0); 
    var PLoc = gl.getUniformLocation(gl.program, "P");
    gl.uniformMatrix4fv(PLoc, false, flatten(P));

    var S  = scalem(1, 1, 1);

    var M1 = S;
    var MLoc = gl.getUniformLocation(gl.program, "M");
    gl.uniformMatrix4fv(MLoc, false, flatten(M1));
    
    var meshLoc = gl.getUniformLocation(gl.program, "showMesh");
    gl.uniform1f(meshLoc, showMesh ? 1.0 : 0.0);

    gl.clear(gl.COLOR_BUFFER_BIT);
    
    //var filename = '../worksheet5/monkey.obj'
    var filename = "../bulb/exp8apply-objlegacy.obj";
    var model = initObject(gl, filename, 0.0);

    //initBulb(gl, dim, exponent);  //fills the vertexArray, colorsArray and normalsArray


    document.getElementById("fancyMandelbulb1").onclick = function(){  //però sarebbe da fare un altro bottone che ritorna al point cloud.
        showMesh = !showMesh;
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
    };

    function render()
    {
        if(showMesh){
            if(firstTime_model){
                //g_objDoc = null;
                model = initObject(gl, filename, 1.0);
                firstTime_model = false;

                var eye = vec3(0, 0, -20); // Adjust the values based on your scene
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

        //var center_of_bulb = findBoundingBox(g_drawingInfo.vertices);

            gl.clear(gl.COLOR_BUFFER_BIT);
            console.log("drawing model");
            gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_INT, 0);
        } else {
            if(firstTime_cloud){
                firstTime_cloud = false;
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
                initBulb(gl, dim, exponent);  //THIS FUCKING BINDS THE NEW BUFFERSSSS SO WHAT IS THE PRPOBLEMMMMMM
                return;  //???
            }
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.drawArrays(gl.VERTICES, 0, pointsArray.length);
        }
    }

    function tick(){
        render();
        requestAnimationFrame(tick);
    }

    tick();
    //render();
}

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
