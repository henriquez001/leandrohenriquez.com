// Copia il tema del sito (assets/tema/*.css e i caratteri che usa) in public/sito/, così il pannello
// ha la stessa estetica del sito. Si lancia prima di ogni pubblicazione (pannello.yml) e in locale
// con `npm run tema`. public/sito/ non è nel repo: la fonte unica resta assets/tema/.
const fs=require('fs'),path=require('path');
const R=path.join(__dirname,'..','..'),DA=path.join(R,'assets'),A=path.join(__dirname,'..','public','sito');
const tema=path.join(DA,'tema');
for(const f of ['tema.css','caratteri.css'])if(!fs.existsSync(path.join(tema,f))){console.error(`manca assets/tema/${f}: il tema del sito non c'è`);process.exit(1);}
fs.rmSync(A,{recursive:true,force:true});fs.mkdirSync(path.join(A,'tema'),{recursive:true});fs.mkdirSync(path.join(A,'fonts'),{recursive:true});
for(const f of ['tema.css','caratteri.css'])fs.copyFileSync(path.join(tema,f),path.join(A,'tema',f));
// solo i file di caratteri citati in caratteri.css (percorsi ../fonts/…, uguali nel sito e qui)
const usati=[...fs.readFileSync(path.join(tema,'caratteri.css'),'utf8').matchAll(/url\(\s*['"]?\.\.\/fonts\/([^'")]+)['"]?\s*\)/g)].map(m=>m[1]);
if(!usati.length){console.error('caratteri.css non cita nessun file in ../fonts/');process.exit(1);}
for(const f of new Set(usati)){const s=path.join(DA,'fonts',f);if(!fs.existsSync(s)){console.error('manca assets/fonts/'+f);process.exit(1);}fs.copyFileSync(s,path.join(A,'fonts',f));}
console.log('tema copiato:',['tema.css','caratteri.css',...new Set(usati)].join(', '));
