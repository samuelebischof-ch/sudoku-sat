const { app, BrowserWindow, ipcMain } = require('electron')
const child_process = require('child_process')
const path = require('path')
const url = require('url')
const fs = require('fs-extra')
const LineByLineReader = require('line-by-line')
const asar = require('asar')

const sudokuInPath = '/tmp/sat/sat/sudoku.in'
const sudokuOutPath = '/tmp/sat/sat/sudoku.out'
const satScriptPath = 'sat'
const satScriptPathNew = '/tmp/sat/sat/'

let win

async function createWindow () {

  win = new BrowserWindow({width: 1200, height: 800, titleBarStyle: 'hidden'})
  
  // load the dist folder from Angular
  win.loadURL(url.format({
    pathname: path.resolve(__dirname, './build/index.html'),
    protocol: 'file:',
    slashes: true
  }))
  
  // Open the DevTools optionally:
  // win.webContents.openDevTools()
  
  win.on('closed', () => {
    win = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})

ipcMain.on('solveSudoku', async (event, arg) => {
  // clean sudoku.in
  try {
    await cleanFilePromise()
  } catch (error) {
    console.log(error)
  }
  // save sudoku to txt
  let sudoku = arg
  for (let i = 0; i < sudoku.length; i++) {
    const line = sudoku[i];
    for (let j = 0; j < line.length; j++) {
      const element = line[j];
      await appendTextPromise(element + '\n')
    }
  }
  // solve sudoku
  solved = false
  try {
    const output = await shellCommandPromise('cd ' + satScriptPathNew + ' && python sudoku.py')
    if (!output.includes('UNSATISFIABLE')) {
      try {
        sudoku = await readFilePromise()
        event.sender.send('solved', sudoku)
      } catch (error) {
        console.log(error)
      }
    } else {
      event.sender.send('solved', 'UNSAT')
    }
  } catch (error) {
    console.log(error)
  }
})

ipcMain.on('prepare', async (event, arg) => {
  await initializeSudokuSolver()
  event.sender.send('ready', {})
})

function readFilePromise() {
  return new Promise((resolve, reject) => {
    const lr = new LineByLineReader(sudokuOutPath)
    const grid = []
    
    let lineCnt = 0
    let lineArray = []
    
    lr.on('error', (err) => {
      reject(err)
    })
    
    lr.on('line', (line) => {
      let text = line
      if (text === 'n') {
        text = null
      }
      lineArray.push(text)
      if (lineCnt === 8) {
        grid.push(lineArray)
        lineCnt = 0
        lineArray = []
      } else {
        lineCnt++
      }
    })
    
    
    lr.on('end', () => {
      resolve(grid)
      lr.removeAllListeners()
    })
  })
}

function shellCommandPromise(command) {
  return new Promise((resolve, reject) => {
    child_process.exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else if (stdout) {
        resolve(stdout)
      } else {
        resolve(stderr)
      }
    })
  })
}

async function appendTextPromise(text) {
  return new Promise((resolve, reject) => {
    let t = text
    if (text === 'null\n') {
      t = 'n\n'
    }
    fs.appendFile(sudokuInPath, t, (err) => {
      if (err) {
        reject(err) 
      } else {
        resolve()
      }
    })
  })
}

function cleanFilePromise() {
  return new Promise((resolve, reject) => {
    fs.writeFile(sudokuInPath, '', (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

function copyFolderPromise() {
  return new Promise((resolve, reject) => {
    fs.copy(satScriptPath, satScriptPathNew, err => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

function copyFromAsar() {
  return new Promise((resolve, reject) => {
    asar.extractAll(process.resourcesPath + '/app.asar', '/tmp/sat')
    resolve()
  })
}

async function initializeSudokuSolver() {
  if (isDev()) {
    await copyFolderPromise()
  } else {
    await copyFromAsar()
    try {
      await shellCommandPromise('chmod +x /tmp/sat/sat/minisat/minisat')
    } catch (error) {
      console.log(error)
    }
  }
}

function isDev() {
  return process.mainModule.filename.indexOf('app.asar') === -1
}