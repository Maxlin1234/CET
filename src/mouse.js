//////// SETUP

const bgClearColor = [ 1, 1, 1, 0.02 ]
const pointerColor = [ 0, 0, 0, 1 ]

const gl = document
  .querySelector("canvas")
  .getContext("webgl2", { preserveDrawingBuffer: true })

setViewSize()

gl.enable(gl.BLEND)
gl.blendEquation(gl.FUNC_ADD)
gl.blendFuncSeparate(
  gl.SRC_ALPHA,
  gl.ONE_MINUS_SRC_ALPHA,
  gl.ONE,
  gl.ONE
)



//////// BACKGROUND

const bgProgram = createProgram({
  vertexShader: `#version 300 es
layout(location=0) in vec4 position;
void main() {
  gl_Position = position;
}`,
  fragmentShader: `#version 300 es
precision highp float;
uniform vec4 bgColor;
out vec4 Color;
void main() {
  Color = bgColor;
}`,
})

gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float64Array([ -1, -3, -1, 1, 3, 1 ]),
  gl.STATIC_DRAW
)

gl.enableVertexAttribArray(0)
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0)

gl.useProgram(bgProgram)
gl.uniform4fv(
  gl.getUniformLocation(bgProgram, "bgColor"),
  bgClearColor
)



//////// POINTER

const pointerProgram = createProgram({
  vertexShader: `#version 300 es
uniform vec2 pointer;
void main() {
  gl_PointSize = 100.0;
  gl_Position = vec4(pointer, 0, 1);
}`,
  fragmentShader: `#version 300 es
precision highp float;
uniform vec4 pointerColor;
out vec4 Color;
void main() {
  Color = pointerColor;
}`,
})

const pointerVec = [ 0, 0 ]
const pointerLoc = gl.getUniformLocation(pointerProgram, "pointer")

gl.useProgram(pointerProgram)
gl.uniform4fv(
  gl.getUniformLocation(pointerProgram, "pointerColor"),
  pointerColor
)



//////// DRAW LOOP

function draw()
{
  gl.useProgram(bgProgram)
  gl.drawArrays(gl.TRIANGLES, 0, 3)

  gl.useProgram(pointerProgram)
  gl.uniform2fv(pointerLoc, pointerVec)
  gl.drawArrays(gl.POINTS, 0, 1)
}
setInterval(draw)



//////// HELPERS

function setViewSize()
{
  gl.canvas.width = innerWidth
  gl.canvas.height = innerHeight
  gl.viewport(0, 0, innerWidth, innerHeight)
  gl.clearColor(bgClearColor[0], bgClearColor[1], bgClearColor[2], 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
}

onresize = setViewSize



onpointermove = function(e)
{
  pointerVec[0] = e.clientX / innerWidth * 2 - 1
  pointerVec[1] = 1 - e.clientY / innerHeight * 2
}



function createProgram(config)
{
  const vertexShader = createShader(
    gl.VERTEX_SHADER, config.vertexShader
  )
  const fragmentShader = createShader(
    gl.FRAGMENT_SHADER, config.fragmentShader
  )

  const program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
  {
    console.log(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return
  }

  return program
}



function createShader(type, source)
{
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
  {
    console.log(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return
  }

  return shader
}