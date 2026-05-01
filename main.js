const { app, BrowserWindow } = require('electron')
const path = require('path')

// Chạy server trực tiếp trong Electron process
require('./server.js')

app.whenReady().then(async () => {
  // Chờ server khởi động
  await new Promise(resolve => setTimeout(resolve, 3000))

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'assetsicon.ico'),
    webPreferences: {
      nodeIntegration: false
    }
  })

  win.loadFile('ban-xe.html')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})