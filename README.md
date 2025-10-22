# Mandelbulb



A simple WebGL demo that renders a 3D Mandelbulb inspired by the 2009 formulation. It supports two visualization modes:

- Mesh mode: loads and displays a precomputed OBJ mesh.  
- Point-cloud mode: procedurally generates Mandelbulb points on the GPU/CPU with adjustable parameters.  

Includes basic camera controls (orbit and dolly) and UI to tweak the fractal exponent, point density, and point size.

## Technologies Used

- HTML5 Canvas + WebGL 1.0  
- GLSL ES vertex/fragment shaders  
- JavaScript (no build step)

## Run Locally
To run the project locally, you must serve it over HTTP (it will not work with file://). Use Python or Node.js from the repository root:

**Python:** `python3 -m http.server 8000`  
**Windows:** `py -m http.server 8000`  
**Node.js:** `npx serve .`  

Then open [http://localhost:8000/Mandelbulb/index.html](http://localhost:8000/Mandelbulb/index.html) in your browser.
