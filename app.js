// const qrcode = require('qrcode-terminal');
const qrcode = require('qrcode');
const express = require('express');
const { Client, Location, List, Buttons, LocalAuth, MessageMedia} = require('whatsapp-web.js');
const fs = require('fs');
const socketIO = require('socket.io');
const http = require('http');
const { body, validationResult } = require('express-validator');
const { phoneNumberFormatter } = require('./helpers/formatter');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const port = process.env.PORT || 8000;

// const SESSION_FILE_PATCH = './whatsapp-session.json';
// let sessionCfg;
// if (fs.existsSync(SESSION_FILE_PATCH)) {
//   sessionCfg = require(SESSION_FILE_PATCH);
// }


const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(fileUpload({
    debug:true
}));

app.get('/',(req,res) =>{
  res.sendFile('index.html',{ root:__dirname});
});

const checkRegisteredNumber = async function(number){
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
}

// Send Message
app.post('/send-message',[
    body('number').notEmpty(),
    body('message').notEmpty(),
],async (req,res)=>{
    const errors = validationResult(req).formatWith(({msg}) => {
        return msg;
    });
    if(!errors.isEmpty()){
        return res.status(422).json({
            status:false,
            message:errors.mapped()
        })
    }
    const number = req.body.number;
    // const number = phoneNumberFormatter(req.body.number);
    const message = req.body.message;

    const isRegisteredNumber = await checkRegisteredNumber(number);

    if (!isRegisteredNumber) {
        return res.status(422).json({
            status:false,
            message:'The number is not registered'
        });
    }

    client.sendMessage(number,message).then(response => {
        res.status(200).json({
            status:true,
            response:response
        });
    }).catch(err => {
        res.status(500).json({
            status:false,
            response:err
        })
    })
})

//Send Media
app.post('/send-media',async (req,res)=>{
    const number = req.body.number;
    const caption = req.body.caption;
    const fileUrl = req.body.file;

    let mimetype;
    const attachment = await axios.get(fileUrl,{responseType:'arraybuffer'}).then(response =>{
        mimetype = response.headers['content-type'];
        return response.data.toString('base64');
    })
    const media = new MessageMedia(mimetype, attachment, 'Media');

    // Import Media
    // const file = req.files.file;
    // const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);
    
    // Local Media
    // const media = MessageMedia.fromFilePath('./gambar.jpg');
    client.sendMessage(number,media, {caption:caption}).then(response => {
        res.status(200).json({
            status:true,
            response:response
        });
    }).catch(err => {
        res.status(500).json({
            status:false,
            response:err
        })
    })
})

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // <- this one doesn't works in Windows
            '--disable-gpu'
        ],
        headless: true,   
    }
});

client.on('loading_screen', (percent, message) => {
    console.log('LOADING SCREEN', percent, message);
});



client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});



client.on('message', msg => {
    if (msg.body == '!ping') {
        msg.reply('pong');
    }
});


client.initialize();

// Socket IO
io.on('connection',function(socket){
    socket.emit('message','Connecting ...');

    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
        // qrcode.generate(qr);
        qrcode.toDataURL(qr,(err,url) =>{
            socket.emit('qr',url);
            socket.emit('message','QR Cide Recuved, scan please!');
        })

        
    });

    client.on('ready', () => {
        console.log('Client is ready!');
        socket.emit('ready','Whatsapp is Ready!');
        socket.emit('message','Whatsapp is Ready!');
    });

    client.on('authenticated', (session) => {
        socket.emit('authenticated','Whatsapp is authenticated!');
        socket.emit('message','Whatsapp is authenticated!');
        console.log('AUTHENTICATED', session);
        // fs.writeFile(SESSION_FILE_PATCH, JSON.stringify(session),function(err){
        //   if(err){
        //     console.log(err);
        //   }
        // });
    });
})

server.listen(port, function(){
  console.log('App runinng on *:',port);
});