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
    gl.clearColor(0.0, 0.5, 0.6, 1.0);  //Si imposta il colore di sfondo del canvas

    gl.enable(gl.DEPTH_TEST); //per garantire che si stia visualizzando la parte più vicina della superficie della sfera.
    gl.enable(gl.CULL_FACE); //per rimuovere le facce nascoste e migliorare l'efficienza.

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program); 

    gl.vBuffer = null;
    gl.cBuffer = null;

    //------------1 point perspective--------------------------------
    // Configura la matrice di vista (View Matrix)
    var eye = vec3(0.0,0.0,2.0); // Modifica la posizione verticale della telecamera
    var at = vec3(0.0,0.0,0); // Punto verso cui la telecamera è orientata (centro della sfera)
    var up = vec3(1.0,0.0,0.0); // Vettore "up" della telecamera

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
    vPosition = gl.getAttribLocation(program, "a_Position"); 
    gl.enableVertexAttribArray(vPosition); 

    /* vColor = gl.getAttribLocation(program, "a_Color"); 
    gl.enableVertexAttribArray(vColor);   */
    
    vNormal = gl.getAttribLocation(program, "a_Normal"); 
    gl.enableVertexAttribArray(vNormal);

    //sphere parameters
    alpha = 0.0;
    eRot = vec3(radius * Math.sin(alpha), 0, radius * Math.cos(alpha));
    rotation = false;

    initSphere(gl, numTimesToSubdivide);

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
        cameraRotation()
    };
}

function render(){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, pointsArray.length);
}

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

    //buffer colori
    /* gl.deleteBuffer(gl.cBuffer);
    gl.cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0); */
       
    //buffer normali
    gl.deleteBuffer(gl.nBuffer);
    gl.nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);

    render()
}


function triangle(a, b, c) {
    pointsArray.push(a);
    pointsArray.push(b);
    pointsArray.push(c);

    /* colorsArray.push(vec4(1.0, 0.5, 0.0, 1.0));  // Arancione
    colorsArray.push(vec4(1.0, 0.5, 0.0, 1.0));  // Arancione
    colorsArray.push(vec4(1.0, 0.5, 0.0, 1.0));  // Arancione */

    normalsArray.push(vec4(a[0], a[1], a[2], 0.0));
    normalsArray.push(vec4(b[0], b[1], b[2], 0.0));
    normalsArray.push(vec4(c[0], c[1], c[2], 0.0)); 
}


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

function tetrahedron(a, b, c, d, n) {
   divideTriangle(a, b, c, n);
   divideTriangle(d, c, b, n);
   divideTriangle(a, d, b, n);
   divideTriangle(a, c, d, n);
}

function cameraRotation(){
    if(rotation){
        console.log("x")
        alpha = alpha + 0.02;
        eRot = vec3(radius * Math.sin(alpha), 0, radius * Math.cos(alpha));
        var V = lookAt(eRot, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
        gl.uniformMatrix4fv(VLoc,false, flatten(V));
        render();
        requestAnimationFrame(cameraRotation);   
    } 
}