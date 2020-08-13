const {app, BrowserWindow} = require('electron');
let win;

app.on('ready', () =>{
    win = new BrowserWindow(
        {
            width : 1000
            , minWidth:1000
            , maxWidth:1000
            , height :850
            , minHeight: 850
            , maxHeight: 850
            , show: false
            , icon: __dirname + '/resources/installer/Icon.ico'
            , webPreferences :{ defaultFontSize : 14}
        }
    );
    // 창이 ready 상태가되면 보여주기
    win.once('ready-to-show', function(){
        win.show();
    });
    win.loadURL('http://localhost:3000');
});