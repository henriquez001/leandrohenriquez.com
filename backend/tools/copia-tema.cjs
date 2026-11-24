// Copia nel pannello i caratteri del sito (stile «bianco»: Outfit e Figtree, in assets/fonts/), così il pannello
// ha la stessa estetica del sito senza tenerne una seconda copia nel repo. Si lancia prima di ogni pubblicazione
// (pannello.yml) e in locale con `npm run tema`. public/sito/ non è nel repo.
const fs=require('fs'),path=require('path');
const DA=path.join(__dirname,'..','..','assets','fonts'),A=path.join(__dirname,'..','public','sito','fonts');
const FILE=['outfit-latin-wght-normal.woff2','figtree-latin-wght-normal.woff2'];
for(const f of FILE)if(!fs.existsSync(path.join(DA,f))){console.error('manca assets/fonts/'+f);process.exit(1);}
fs.mkdirSync(A,{recursive:true});
for(const f of FILE)fs.copyFileSync(path.join(DA,f),path.join(A,f));
console.log('caratteri copiati:',FILE.join(', '));
