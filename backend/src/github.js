// Lettura e scrittura dei file del sito tramite l'API di GitHub: il repository è il "database".
// Ogni salvataggio è UN commit su main (anche se tocca più file); GitHub Pages poi ripubblica il sito.
const API='https://api.github.com';
export class Errore extends Error{constructor(stato,msg){super(msg);this.stato=stato;}}
export const b64enc=s=>{const by=typeof s==='string'?new TextEncoder().encode(s):s;let bin='';for(let i=0;i<by.length;i+=0x8000)bin+=String.fromCharCode(...by.subarray(i,i+0x8000));return btoa(bin);};
export const b64dec=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g,'')),c=>c.charCodeAt(0)));

export class GitHub{
  constructor(env,fetchImpl=fetch){this.repo=env.GITHUB_REPO;this.branch=env.GITHUB_BRANCH||'main';this.token=env.GITHUB_TOKEN;this.f=fetchImpl;}
  async req(method,p,body,{nullSe404=true}={}){
    const r=await this.f(`${API}/repos/${this.repo}/${p}`,{method,headers:{authorization:`Bearer ${this.token}`,accept:'application/vnd.github+json','user-agent':'hl-pannello','x-github-api-version':'2022-11-28',...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    if(r.status===404&&nullSe404)return null;
    if(r.status===409||r.status===422&&method==='PATCH')throw new Errore(409,'Il sito è stato cambiato nel frattempo: ricarica e riprova.');
    if(!r.ok){const t=await r.text();throw new Errore(502,`GitHub ha risposto ${r.status}: ${t.slice(0,200)}`);}
    return r.json();
  }
  async testa(){const ref=await this.req('GET',`git/ref/heads/${this.branch}`,null,{nullSe404:false});return ref.object.sha;}
  // Legge un file alla versione indicata (o all'ultima). Restituisce il testo o null.
  async leggi(percorso,ref){const j=await this.req('GET',`contents/${encodeURI(percorso)}?ref=${encodeURIComponent(ref||this.branch)}`);return j?b64dec(j.content):null;}
  async leggiJSON(percorso,ref){const t=await this.leggi(percorso,ref);return t===null?null:JSON.parse(t);}
  // Scrive più file in un solo commit. file: [{percorso, testo} | {percorso, base64} | {percorso, elimina:true}]
  // base = sha del commit su cui sono stati letti i dati: se main è andato avanti, il commit viene rifiutato.
  async commit(file,messaggio,base,autore){
    const genitore=base||await this.testa();
    const c=await this.req('GET',`git/commits/${genitore}`,null,{nullSe404:false});
    const tree=[];
    for(const x of file){
      if(x.elimina){tree.push({path:x.percorso,mode:'100644',type:'blob',sha:null});continue;}
      const blob=await this.req('POST','git/blobs',x.base64!==undefined?{content:x.base64,encoding:'base64'}:{content:x.testo,encoding:'utf-8'},{nullSe404:false});
      tree.push({path:x.percorso,mode:'100644',type:'blob',sha:blob.sha});
    }
    const t=await this.req('POST','git/trees',{base_tree:c.tree.sha,tree},{nullSe404:false});
    const nuovo=await this.req('POST','git/commits',{message:messaggio+(autore?`\n\nDal pannello, da ${autore}`:''),tree:t.sha,parents:[genitore]},{nullSe404:false});
    await this.req('PATCH',`git/refs/heads/${this.branch}`,{sha:nuovo.sha,force:false},{nullSe404:false});
    return nuovo.sha;
  }
}
