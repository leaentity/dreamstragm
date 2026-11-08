const http=require('node:http');const fs=require('node:fs');const path=require('node:path');const {createHandler}=require('./organize.cjs');
const root=path.resolve(__dirname,'..');
// 与原静态预览相同的资源白名单，不提供 server、.env、备份、.git 或 node_modules。
const files={'index.html':'text/html','style.css':'text/css','app.js':'text/javascript','ids.js':'text/javascript','assistant-motion.js':'text/javascript','assets/assistant-motion-v1.png':'image/png','assets/assistant-doodles-v1.png':'image/png','ambient.js':'text/javascript','i18n.js':'text/javascript','storage.js':'text/javascript','tidy.js':'text/javascript','preview.png':'image/png','assets/dream-assistant.png':'image/png','assets/dream-assistant-spritesheet.png':'image/png','assets/dream-assistant-full-body-v2.png':'image/png'};
for(const name of ['door','profile','mic','voice-oval','write-underline','journal','explore','circle','active-mark','arrow-down'])files[`assets/figma/${name}.svg`]='image/svg+xml';
for(const weight of ['Light','Regular'])files[`assets/fonts/Gaegu-${weight}.ttf`]='font/ttf';
function createServer({organizeHandler=createHandler()}={}){return http.createServer(async(req,res)=>{let url;try{url=new URL(req.url,'http://localhost');}catch{res.writeHead(400);return res.end();}
 if(url.pathname==='/api/organize')return organizeHandler(req,res);
 const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
 if(req.method!=='GET'||!Object.hasOwn(files,name)){res.writeHead(404,{'Cache-Control':'no-store'});return res.end('Not found');}
 try{const data=await fs.promises.readFile(path.join(root,name));res.writeHead(200,{'Content-Type':files[name],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}
 });}
if(require.main===module){const port=Number(process.env.PORT||5174);const server=createServer();server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port is in use. Stop the old preview before starting.':'Could not start the local server.');process.exitCode=1;});server.listen(port,'127.0.0.1',()=>console.log(`Dreamstragm: http://localhost:${port}/`));}
module.exports={createServer};
