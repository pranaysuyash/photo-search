// Launch Electron with a clean env (unset ELECTRON_RUN_AS_NODE)
const { spawn } = require('child_process')
const electron = require('electron')

// Clone env and remove the flag that forces Electron to run as Node
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
// Ensure dev mode unless explicitly overridden
if (!env.NODE_ENV) env.NODE_ENV = 'development'

const child = spawn(electron, ['.'], {
  stdio: 'inherit',
  env,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
  } else {
    process.exit(code ?? 0)
  }
})
